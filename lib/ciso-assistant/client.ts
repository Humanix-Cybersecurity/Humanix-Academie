// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Client TypeScript pour l'API REST CISO Assistant (intuitem).
//
// Port du connecteur Python `connectors/ciso-assistant/humanix_ciso_connector.py`
// vers TS pour qu'il tourne dans le process Next.js (sync triggeree depuis
// l'admin UI). Memes responsabilites :
//   - Auth Knox (POST /api/iam/login/) -> token persiste en memoire
//   - Folder "Humanix Académie" (GET/POST /api/folders/) cree au premier run
//   - Upsert idempotent (GET /api/evidences/?folder=... -> PATCH ou POST)
//   - Mapping status conformite Humanix -> workflow CISO Assistant
//   - Resolution URL relative Humanix -> absolue (URLField Django exige absolue)
//
// La logique de mapping est documentee dans le code Python. Toute evolution
// doit etre faite ICI ET dans le Python pour rester coherent (le Python
// reste disponible pour les setups self-host avec cron externe).
//
// SSL : verifySSL=false pour les certs auto-signes en local. Node natif
// utilise https.Agent avec rejectUnauthorized=false dans ce cas.

import { Agent as UndiciAgent } from "undici";
import type { CisoEvidence } from "./build-bundle";

export type CisoConnectionInput = {
  baseUrl: string;
  username: string;
  password: string;
  folderName: string;
  verifySSL: boolean;
};

/**
 * Metadonnees evidence-level pour conformite audit (ISO 27001 §7.5, NIS2 §21,
 * NIST 800-53 AT-4, RGPD art. 5.2). Ces champs ne sont pas tous des colonnes
 * natives CISO Assistant : on remplit ceux qui le sont (expiry_date) et
 * on embedded le reste dans la description Markdown pour qu'un auditeur
 * humain puisse les lire.
 */
export type EvidenceAuditMeta = {
  /** Email du RSSI / DPO du tenant -- responsable de l'evidence cote client */
  ownerEmail: string | null;
  /** Debut de la periode de couverture (ISO 8601 date-time) */
  coverageStart: string;
  /** Fin de la periode de couverture (ISO 8601 date-time) */
  coverageEnd: string;
  /** Version semver du contenu pedagogique Humanix utilise pour ces preuves */
  contentVersion: string;
  /** Date d'expiration de l'evidence pour reaudit (typique : +12 mois) */
  expiryDate: string;
};

export type UpsertResult =
  | { ok: true; action: "POST" | "PATCH"; id: string; controlRef: string }
  | { ok: false; controlRef: string; status: number; error: string };

export type TestConnectionResult =
  | { ok: true; folderId: string; existingEvidences: number }
  | {
      ok: false;
      reason: "auth_failed" | "unreachable" | "schema_error" | "unknown";
      error: string;
    };

/**
 * Mapping statut conformite Humanix -> workflow CISO Assistant.
 *
 * Semantiquement different : Humanix exprime un etat de conformite
 * (compliant/partial/non_compliant/not_assessed), CISO Assistant exprime
 * un etat de revue du document de preuve (draft/in_review/approved/rejected).
 * Convention retenue :
 *   - compliant     -> approved   (preuve validee par l'engine Humanix)
 *   - partial       -> in_review  (a examiner manuellement par le RSSI)
 *   - non_compliant -> rejected   (preuve insuffisante)
 *   - not_assessed  -> draft      (pas encore evalue)
 */
export function mapStatusToCiso(humanixStatus: string): string {
  return (
    (
      {
        compliant: "approved",
        partial: "in_review",
        non_compliant: "rejected",
        not_assessed: "draft",
      } as Record<string, string>
    )[humanixStatus] ?? "draft"
  );
}

/**
 * Client minimal pour CISO Assistant.
 *
 * Tous les appels sont stateful : appeler `login()` puis `ensureFolder()`
 * puis `loadExistingEvidences()` avant `upsertEvidence()`. Le constructeur
 * ne fait pas de requete reseau.
 */
export class CisoAssistantClient {
  private readonly conn: CisoConnectionInput;
  private readonly dispatcher: UndiciAgent | undefined;
  private token: string | null = null;
  private folderId: string | null = null;
  private existingByName: Map<string, { id: string }> | null = null;

  constructor(conn: CisoConnectionInput) {
    this.conn = { ...conn, baseUrl: conn.baseUrl.replace(/\/+$/, "") };
    // Pour les certs auto-signes (HAProxy dev, Caddy local). En prod le
    // tenant doit fournir un cert valide. On utilise undici Agent (et
    // pas node:https Agent) car fetch() Next.js passe par undici, pas par
    // node:https. C'est la seule maniere de propager rejectUnauthorized
    // a la requete sans toucher au process global (NODE_TLS_REJECT...).
    this.dispatcher = conn.verifySSL
      ? undefined
      : new UndiciAgent({ connect: { rejectUnauthorized: false } });
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.token) {
      headers.Authorization = `Token ${this.token}`;
    }
    const init: RequestInit = {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    };
    if (this.dispatcher) {
      // undici dispatcher : ignored par TS DOM Fetch types mais respecte
      // par Next.js fetch underlying undici implementation.
      (init as RequestInit & { dispatcher?: unknown }).dispatcher =
        this.dispatcher;
    }
    return fetch(`${this.conn.baseUrl}${path}`, init);
  }

  /** Auth Knox via /api/iam/login/. */
  async login(): Promise<void> {
    const r = await this.request("POST", "/api/iam/login/", {
      username: this.conn.username,
      password: this.conn.password,
    });
    if (r.status !== 200) {
      const text = await r.text();
      throw new CisoError(
        r.status === 401 ? "auth_failed" : "unknown",
        `Login echec ${r.status} : ${text.slice(0, 200)}`,
      );
    }
    const data = (await r.json()) as { token?: string; access?: string };
    const token = data.token ?? data.access;
    if (!token) {
      throw new CisoError(
        "schema_error",
        "Reponse /login/ sans champ 'token'",
      );
    }
    this.token = token;
  }

  /** Cree ou retrouve le folder Humanix dans le scope racine. */
  async ensureFolder(): Promise<string> {
    const r = await this.request("GET", "/api/folders/");
    if (r.status !== 200) {
      throw new CisoError(
        "unknown",
        `GET /api/folders/ failed: ${r.status}`,
      );
    }
    const data = (await r.json()) as {
      results?: Array<{ id: string; name: string }>;
    };
    const list = data.results ?? (Array.isArray(data) ? (data as any) : []);
    for (const f of list) {
      if (f.name === this.conn.folderName) {
        this.folderId = f.id;
        return f.id;
      }
    }
    // Pas trouve : on cree
    const create = await this.request("POST", "/api/folders/", {
      name: this.conn.folderName,
      description:
        "Preuves de conformité importées automatiquement depuis " +
        "Humanix Académie (sensibilisation cyber + scoring par contrôle).",
    });
    if (![200, 201].includes(create.status)) {
      const text = await create.text();
      throw new CisoError(
        "schema_error",
        `POST /api/folders/ failed ${create.status} : ${text.slice(0, 200)}`,
      );
    }
    const created = (await create.json()) as { id: string };
    this.folderId = created.id;
    return created.id;
  }

  /** Charge en memoire la liste des evidences du folder pour upsert idempotent. */
  async loadExistingEvidences(): Promise<number> {
    if (!this.folderId) {
      throw new Error("ensureFolder() must be called first");
    }
    const r = await this.request(
      "GET",
      `/api/evidences/?folder=${encodeURIComponent(this.folderId)}`,
    );
    if (r.status !== 200) {
      throw new CisoError(
        "unknown",
        `GET /api/evidences/ failed ${r.status}`,
      );
    }
    const data = (await r.json()) as {
      results?: Array<{ id: string; name: string }>;
    };
    const list = data.results ?? (Array.isArray(data) ? (data as any) : []);
    this.existingByName = new Map(
      list.filter((e: any) => e.name).map((e: any) => [e.name, { id: e.id }]),
    );
    return this.existingByName.size;
  }

  /**
   * Cree ou met a jour une evidence dans CISO Assistant. Idempotent :
   *   - GET-by-name dans le folder Humanix
   *   - PATCH si existe (status + description rafraichis)
   *   - POST sinon
   */
  async upsertEvidence(
    evidence: CisoEvidence,
    humanixBaseUrl: string,
    audit: EvidenceAuditMeta,
  ): Promise<UpsertResult> {
    if (!this.folderId) {
      throw new Error("ensureFolder() must be called first");
    }
    if (!this.existingByName) {
      throw new Error("loadExistingEvidences() must be called first");
    }
    const ref = evidence.control_ref;
    const name = `Humanix · ${ref} · ${
      evidence.control_name ?? ref
    }`.slice(0, 255);

    // URL relative Humanix -> absolue (URLField Django exige absolue).
    // Defensive : si le prefixage produit toujours une URL relative (ex:
    // humanixBaseUrl=""), on n'envoie pas le link plutot que d'envoyer
    // une URL invalide qui ferait echouer tout le PATCH cote Django.
    let link: string | undefined;
    const artifactUrl = evidence.artifacts.find((a) => a.url)?.url;
    if (artifactUrl) {
      const candidate = artifactUrl.startsWith("/")
        ? `${humanixBaseUrl}${artifactUrl}`
        : artifactUrl;
      if (/^https?:\/\//.test(candidate)) {
        link = candidate;
      }
    }

    // Description en deux blocs Markdown :
    //   - Bloc 1 (METADONNEES AUDIT) : champs exigés par ISO 27001 §7.5
    //     "informations documentées" (identification, responsable, périmètre,
    //     période). Lisible par un auditeur humain dans l'UI CISO Assistant.
    //   - Bloc 2 (DONNEES HUMANIX) : ce qu'on mesure côté plateforme.
    // Le score Humanix est un ratio 0-1 (compute en interne). On l'affiche
    // formate en pourcentage (0-100) avec 1 decimale pour rester audit-lisible.
    const scorePct =
      typeof evidence.score === "number"
        ? `${Math.round(evidence.score * 1000) / 10}/100`
        : "non évalué";
    const description =
      `## Métadonnées audit\n` +
      `- Référentiel : ${evidence.category ?? "n/a"}\n` +
      `- Contrôle : ${ref} (${evidence.control_name ?? "n/a"})\n` +
      `- Responsable désigné : ${audit.ownerEmail ?? "(non renseigné côté Humanix)"}\n` +
      `- Période de couverture : ${audit.coverageStart.slice(0, 10)} → ${audit.coverageEnd.slice(0, 10)}\n` +
      `- Version du contenu Humanix : ${audit.contentVersion}\n` +
      `- À ré-évaluer avant : ${audit.expiryDate}\n` +
      `\n## Données Humanix\n` +
      `- Score conformité : ${scorePct}\n` +
      `- Statut conformité : ${evidence.status}\n` +
      `- Source : Humanix Académie (sync automatique)\n` +
      `- Synchronisé : ${new Date().toISOString()}\n`;

    const payload: Record<string, unknown> = {
      name,
      description,
      status: mapStatusToCiso(evidence.status),
      folder: this.folderId,
      expiry_date: audit.expiryDate,
      ...(link && { link }),
    };

    const existing = this.existingByName.get(name);
    if (existing) {
      const r = await this.request(
        "PATCH",
        `/api/evidences/${existing.id}/`,
        payload,
      );
      if ([200, 201].includes(r.status)) {
        return { ok: true, action: "PATCH", id: existing.id, controlRef: ref };
      }
      return {
        ok: false,
        controlRef: ref,
        status: r.status,
        error: (await r.text()).slice(0, 300),
      };
    }

    const r = await this.request("POST", "/api/evidences/", payload);
    if ([200, 201].includes(r.status)) {
      const created = (await r.json()) as { id: string };
      this.existingByName.set(name, { id: created.id });
      return { ok: true, action: "POST", id: created.id, controlRef: ref };
    }
    return {
      ok: false,
      controlRef: ref,
      status: r.status,
      error: (await r.text()).slice(0, 300),
    };
  }

  // =========================================================================
  // v1.3 - Extensions optionnelles (AppliedControl + FindingsAssessment +
  // Findings). Chaque methode est independante : echec non bloquant pour la
  // sync principale (cf. sync.ts ou les appels sont wrappes en try/catch).
  // =========================================================================

  /**
   * Cree ou retrouve un AppliedControl "Programme sensibilisation Humanix"
   * scope au folder Humanix. Idempotent par name.
   */
  async ensureAppliedControl(framework: string): Promise<string | null> {
    if (!this.folderId) return null;
    const name = `Programme de sensibilisation Humanix Académie · ${framework}`.slice(0, 255);
    const description =
      `Contrôle appliqué synthétisant la couverture Humanix Académie ` +
      `pour le référentiel ${framework}. Les evidences attachées proviennent ` +
      `de la sync automatique Humanix. Owner : RSSI/DPO du tenant.`;
    // Lister existants pour idempotence
    const list = await this.request(
      "GET",
      `/api/applied-controls/?folder=${encodeURIComponent(this.folderId)}`,
    );
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      for (const c of items) {
        if (c.name === name) return c.id;
      }
    }
    // Creer
    const r = await this.request("POST", "/api/applied-controls/", {
      name,
      description,
      folder: this.folderId,
      status: "active",
      category: "process",
    });
    if (![200, 201].includes(r.status)) return null;
    const created = (await r.json()) as { id: string };
    return created.id;
  }

  /**
   * Lier les evidences a un AppliedControl. Update via PATCH applied-control
   * avec la liste M2M complete (pattern DRF standard).
   */
  async linkEvidencesToAppliedControl(
    appliedControlId: string,
    evidenceIds: string[],
  ): Promise<boolean> {
    const r = await this.request(
      "PATCH",
      `/api/applied-controls/${appliedControlId}/`,
      { evidences: evidenceIds },
    );
    return [200, 201].includes(r.status);
  }

  /**
   * Cree ou retrouve un FindingsAssessment "Audit sensibilisation Humanix"
   * pour le tenant + framework. Idempotent.
   */
  async ensureFindingsAssessment(framework: string): Promise<string | null> {
    if (!this.folderId) return null;
    const name = `Audit sensibilisation Humanix Académie · ${framework}`.slice(0, 255);
    const list = await this.request(
      "GET",
      `/api/findings-assessments/?folder=${encodeURIComponent(this.folderId)}`,
    );
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      for (const fa of items) if (fa.name === name) return fa.id;
    }
    const r = await this.request("POST", "/api/findings-assessments/", {
      name,
      description:
        `Suivi des constats issus de la couverture Humanix Académie pour ` +
        `${framework}. Renouvelé à chaque sync automatique. ` +
        `Catégorie : self_identified.`,
      folder: this.folderId,
      category: "self_identified",
      status: "in_progress",
    });
    if (![200, 201].includes(r.status)) return null;
    const created = (await r.json()) as { id: string };
    return created.id;
  }

  /**
   * Cree ou met a jour un Finding pour un controle en partial / non_compliant.
   * Idempotent par name (Finding = "[<controlRef>] <controlName>").
   * Lie au FindingsAssessment + AppliedControl s'ils sont fournis.
   */
  async upsertFinding(args: {
    findingsAssessmentId: string;
    controlRef: string;
    controlName: string;
    status: string; // statut conformite Humanix (compliant/partial/non_compliant)
    score: number | null | undefined;
    appliedControlId?: string | null;
    etaDate: string; // YYYY-MM-DD
  }): Promise<{ ok: boolean; action?: "POST" | "PATCH"; id?: string }> {
    if (!this.folderId) return { ok: false };
    const name = `[${args.controlRef}] ${args.controlName}`.slice(0, 255);
    const priority = args.status === "non_compliant" ? 1 : 2; // P1 ou P2
    const findingStatus =
      args.status === "non_compliant" ? "confirmed" : "identified";
    const description =
      `Contrôle Humanix Académie ${args.controlRef} en statut "${args.status}".\n` +
      `Score Humanix : ${args.score != null ? Math.round(args.score * 1000) / 10 + "/100" : "non évalué"}.\n` +
      `Action attendue : examiner la couverture sensibilisation et planifier ` +
      `un programme correctif (campagne phishing simulé, refresher formation, ` +
      `top-up modules) avant l'ETA.`;

    const payload: Record<string, unknown> = {
      name,
      description,
      findings_assessment: args.findingsAssessmentId,
      folder: this.folderId,
      status: findingStatus,
      priority,
      eta: args.etaDate,
      due_date: args.etaDate,
      ...(args.appliedControlId && {
        applied_controls: [args.appliedControlId],
      }),
    };

    // GET findings du folder/assessment puis match by name
    const list = await this.request(
      "GET",
      `/api/findings/?findings_assessment=${encodeURIComponent(args.findingsAssessmentId)}`,
    );
    let existing: { id: string } | undefined;
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      existing = items.find((f: any) => f.name === name);
    }

    if (existing) {
      const r = await this.request(
        "PATCH",
        `/api/findings/${existing.id}/`,
        payload,
      );
      if ([200, 201].includes(r.status)) {
        return { ok: true, action: "PATCH", id: existing.id };
      }
      return { ok: false };
    }
    const r = await this.request("POST", "/api/findings/", payload);
    if ([200, 201].includes(r.status)) {
      const created = (await r.json()) as { id: string };
      return { ok: true, action: "POST", id: created.id };
    }
    return { ok: false };
  }

  /**
   * Upload un PDF comme attachment de l'evidence donnee. CISO Assistant
   * cree automatiquement une EvidenceRevision si necessaire (cf.
   * backend/core/views.py:UploadAttachmentView).
   *
   * L'endpoint est /api/evidences/<id>/upload/ avec FileUploadParser :
   * le body est le binaire raw du fichier, le header Content-Disposition
   * porte le filename.
   */
  async uploadAttachment(
    evidenceId: string,
    filename: string,
    pdfBuffer: Buffer,
  ): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
    const url = `${this.conn.baseUrl}/api/evidences/${evidenceId}/upload/`;
    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    };
    if (this.token) headers.Authorization = `Token ${this.token}`;
    const init: RequestInit = {
      method: "POST",
      headers,
      body: pdfBuffer as unknown as BodyInit,
    };
    if (this.dispatcher) {
      (init as RequestInit & { dispatcher?: unknown }).dispatcher =
        this.dispatcher;
    }
    const r = await fetch(url, init);
    if ([200, 201, 204].includes(r.status)) {
      return { ok: true };
    }
    return {
      ok: false,
      status: r.status,
      error: (await r.text()).slice(0, 300),
    };
  }
}

export class CisoError extends Error {
  constructor(
    public reason: "auth_failed" | "unreachable" | "schema_error" | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "CisoError";
  }
}

/**
 * Test rapide d'une connexion : login + ensureFolder + count evidences.
 * Utilise par le bouton "Tester la connexion" dans l'UI admin.
 */
function describeFetchError(err: unknown): string {
  // Node fetch (undici) emballe les vraies erreurs dans err.cause. Sans
  // extraction, l'UI affiche juste "fetch failed" et personne ne sait quoi
  // corriger (host injoignable ? cert refuse ? DNS ?).
  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.message);
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      parts.push(`cause: ${cause.message}`);
      const code = (cause as Error & { code?: string }).code;
      if (code) parts.push(`code: ${code}`);
    } else if (cause) {
      parts.push(`cause: ${String(cause)}`);
    }
  } else {
    parts.push(String(err));
  }
  return parts.join(" | ");
}

function classifyFetchError(
  err: unknown,
): "auth_failed" | "unreachable" | "schema_error" | "unknown" {
  const msg = describeFetchError(err).toLowerCase();
  if (
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("eai_again") ||
    msg.includes("etimedout") ||
    msg.includes("getaddrinfo") ||
    msg.includes("network") ||
    msg.includes("connect timeout")
  ) {
    return "unreachable";
  }
  if (
    msg.includes("self-signed") ||
    msg.includes("self signed") ||
    msg.includes("unable to verify") ||
    msg.includes("cert_") ||
    msg.includes("depth_zero_self_signed")
  ) {
    return "schema_error"; // Cert SSL : on suggère de decocher la verif
  }
  return "unknown";
}

export async function testCisoConnection(
  conn: CisoConnectionInput,
): Promise<TestConnectionResult> {
  const client = new CisoAssistantClient(conn);
  try {
    await client.login();
    const folderId = await client.ensureFolder();
    const existing = await client.loadExistingEvidences();
    return { ok: true, folderId, existingEvidences: existing };
  } catch (err) {
    if (err instanceof CisoError) {
      return { ok: false, reason: err.reason, error: err.message };
    }
    return {
      ok: false,
      reason: classifyFetchError(err),
      error: describeFetchError(err),
    };
  }
}
