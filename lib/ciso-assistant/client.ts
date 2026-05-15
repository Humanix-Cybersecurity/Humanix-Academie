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
  /** Actor.id de l'owner (RSSI/DPO) resolu via resolveOwnerActor(). Si
   * defini, est inclus comme owner sur tous les artefacts crees. */
  public ownerActorId: string | null = null;

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
      ...(this.ownerActorId && { owner: [this.ownerActorId] }),
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
      ...(this.ownerActorId && { owner: [this.ownerActorId] }),
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

  // =========================================================================
  // v1.5 - Actor sync. Resout (et cree si necessaire) un User CISO Assistant
  // pour l'ownerEmail configure, retrouve son Actor associe, et expose son
  // id pour assignation owner sur evidences/findings/scenarios.
  // =========================================================================

  /**
   * Resout l'Actor.id du user owner configure (ownerEmail). Si le User
   * CISO Assistant n'existe pas, on le cree (necessite permissions admin
   * sur le token courant). Retourne null en cas d'echec - les appels
   * upsertEvidence/Finding/Scenario fonctionnent sans owner aussi.
   */
  async resolveOwnerActor(ownerEmail: string): Promise<string | null> {
    // 1. Trouver le User par email
    const userList = await this.request(
      "GET",
      `/api/users/?email=${encodeURIComponent(ownerEmail)}`,
    );
    let userId: string | null = null;
    if (userList.status === 200) {
      const data = (await userList.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      const exact = items.find(
        (u: any) =>
          (u.email ?? "").toLowerCase() === ownerEmail.toLowerCase(),
      );
      if (exact) userId = exact.id;
    }
    // 2. Creer le User si absent
    if (!userId) {
      const create = await this.request("POST", "/api/users/", {
        email: ownerEmail,
        is_active: true,
        is_third_party: false,
      });
      if (![200, 201].includes(create.status)) {
        return null; // permissions insuffisantes, instance fermee, etc.
      }
      const created = (await create.json()) as { id: string };
      userId = created.id;
    }
    // 3. Recuperer l'Actor lie a ce User (auto-cree par User.save() cote
    //    Django via OneToOneField). Note : l'API actors/ filtre par
    //    specific._id (user.id) -- on doit lister et matcher.
    const actorList = await this.request("GET", `/api/actors/`);
    if (actorList.status !== 200) return null;
    const data = (await actorList.json()) as any;
    const items = data.results ?? (Array.isArray(data) ? data : []);
    const match = items.find(
      (a: any) =>
        a.type === "user" &&
        (a.specific?.id === userId || a.specific?.str === ownerEmail),
    );
    return match?.id ?? null;
  }

  // =========================================================================
  // v1.4 - RiskScenario hooks. Necessite une RiskMatrix prechargee cote
  // CISO Assistant (via stored-libraries). Si aucune dispo, on skip
  // gracieusement avec un WARN.
  // =========================================================================

  /** Retourne l'id de la 1ere RiskMatrix dispo cote CISO Assistant, ou null. */
  async getFirstRiskMatrix(): Promise<string | null> {
    const r = await this.request("GET", "/api/risk-matrices/");
    if (r.status !== 200) return null;
    const data = (await r.json()) as any;
    const items = data.results ?? (Array.isArray(data) ? data : []);
    return items[0]?.id ?? null;
  }

  /**
   * Cree ou retrouve un RiskAssessment "Audit risque humain Humanix
   * Académie · <framework>". Idempotent par name. Lie a une RiskMatrix
   * (passe en param).
   */
  async ensureRiskAssessment(
    framework: string,
    riskMatrixId: string,
  ): Promise<string | null> {
    if (!this.folderId) return null;
    const name = `Audit risque humain Humanix Académie · ${framework}`.slice(0, 255);
    const list = await this.request(
      "GET",
      `/api/risk-assessments/?folder=${encodeURIComponent(this.folderId)}`,
    );
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      for (const ra of items) if (ra.name === name) return ra.id;
    }
    const r = await this.request("POST", "/api/risk-assessments/", {
      name,
      description:
        `Évaluation du risque humain mis en évidence par la sync Humanix Académie ` +
        `pour le référentiel ${framework}. Renouvelée automatiquement.`,
      folder: this.folderId,
      risk_matrix: riskMatrixId,
      status: "in_progress",
    });
    if (![200, 201].includes(r.status)) return null;
    const created = (await r.json()) as { id: string };
    return created.id;
  }

  /**
   * Cree ou met a jour un RiskScenario sous le RiskAssessment Humanix.
   * Idempotent par name. Likelihood/Impact a 3 (medium-high) par defaut,
   * traitement "mitigate" (formation correctrice attendue).
   */
  async upsertRiskScenario(args: {
    riskAssessmentId: string;
    framework: string;
    triggers: string[]; // descriptions des seuils franchis
  }): Promise<{ ok: boolean; action?: "POST" | "PATCH"; id?: string }> {
    if (!this.folderId) return { ok: false };
    const name = `Compromission via couche humaine sous-formée · ${args.framework}`.slice(0, 255);
    const description =
      `Scénario généré automatiquement par Humanix Académie suite aux ` +
      `triggers suivants :\n${args.triggers.map((t) => "  - " + t).join("\n")}\n\n` +
      `Likelihood élevée car la sensibilisation est en deçà du seuil ` +
      `compliance. Impact élevé car l'ingénierie sociale reste le 1er ` +
      `vecteur de compromission cyber.\n\n` +
      `Traitement recommandé : campagne de remédiation (phishing simulé ` +
      `répété + refresher formation ciblé) suivie d'une nouvelle sync ` +
      `Humanix pour vérifier la remontée du score.`;

    const payload: Record<string, unknown> = {
      name,
      description,
      risk_assessment: args.riskAssessmentId,
      folder: this.folderId,
      treatment: "mitigate",
      // Likelihood / Impact : indices 0..N-1 selon la taille de la
      // RiskMatrix utilisee. Sur une matrice 3x3 (Low/Medium/High =
      // 0/1/2), on cible 2 (= High) pour les 2 axes. Sur 5x5 ce sera
      // 4 (= Very High). Pour le moment on cible 2 -> compatible 3x3
      // et 5x5 puisque c'est dans la plage des deux. Le RSSI ajuste
      // au cas par cas.
      current_proba: 2,
      current_impact: 2,
    };

    const list = await this.request(
      "GET",
      `/api/risk-scenarios/?risk_assessment=${encodeURIComponent(args.riskAssessmentId)}`,
    );
    let existing: { id: string } | undefined;
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      existing = items.find((s: any) => s.name === name);
    }

    if (existing) {
      const r = await this.request(
        "PATCH",
        `/api/risk-scenarios/${existing.id}/`,
        payload,
      );
      if ([200, 201].includes(r.status))
        return { ok: true, action: "PATCH", id: existing.id };
      // Debug : log l'erreur API pour pinpoint le champ rejete
      console.error(
        "[ciso-client] RiskScenario PATCH failed",
        r.status,
        (await r.text()).slice(0, 300),
        "payload=",
        JSON.stringify(payload).slice(0, 300),
      );
      return { ok: false };
    }
    const r = await this.request("POST", "/api/risk-scenarios/", payload);
    if ([200, 201].includes(r.status)) {
      const created = (await r.json()) as { id: string };
      return { ok: true, action: "POST", id: created.id };
    }
    console.error(
      "[ciso-client] RiskScenario POST failed",
      r.status,
      (await r.text()).slice(0, 300),
      "payload=",
      JSON.stringify(payload).slice(0, 300),
    );
    return { ok: false };
  }

  // =========================================================================
  // v1.9 - Campaigns sync. Cree/maintient une Campaign CISO Assistant
  // par PhishingCampaign Humanix. Idempotent par name. Mapping statut :
  //   - !sentAt + scheduledAt > now -> draft
  //   - !sentAt + scheduledAt <= now -> in_progress
  //   - sentAt + isActive -> in_progress
  //   - sentAt + !isActive -> done
  // =========================================================================

  /**
   * Retourne la liste des Framework IDs disponibles (publishables de
   * libraries chargees dans CISO Assistant). Permet de scoper les
   * Campaigns aux frameworks reels (champ M2M obligatoire cote Django).
   */
  async listFrameworkIds(): Promise<string[]> {
    const r = await this.request("GET", "/api/frameworks/");
    if (r.status !== 200) return [];
    const data = (await r.json()) as any;
    const items = data.results ?? (Array.isArray(data) ? data : []);
    return items.map((f: any) => f.id).filter(Boolean);
  }

  /**
   * Cree ou retrouve un Perimeter "Humanix Académie" dans le folder courant.
   * Perimeter = scope organisationnel cote CISO Assistant ; sert de pivot
   * obligatoire (M2M) pour les Campaigns. Idempotent par name.
   *
   * Retourne null si le module Perimeters n'existe pas (404 -> instance
   * trop ancienne) ou si la creation echoue (permissions).
   */
  async ensureDefaultPerimeter(): Promise<{
    id: string | null;
    status?: number;
    error?: string;
  }> {
    if (!this.folderId) return { id: null, error: "folderId manquant" };
    const name = `Humanix Académie · scope par défaut`;
    const list = await this.request(
      "GET",
      `/api/perimeters/?folder=${encodeURIComponent(this.folderId)}`,
    );
    if (list.status === 404) {
      const txt = await list.text();
      return {
        id: null,
        status: 404,
        error: `Endpoint /api/perimeters/ inexistant (${txt.slice(0, 120)})`,
      };
    }
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      const exact = items.find((p: any) => p.name === name);
      if (exact) return { id: exact.id };
    }
    const r = await this.request("POST", "/api/perimeters/", {
      name,
      description:
        "Périmètre par défaut Humanix Académie — sert de pivot pour les " +
        "Campaigns de phishing simulé synchronisées depuis Humanix.",
      folder: this.folderId,
    });
    if (![200, 201].includes(r.status)) {
      const txt = await r.text();
      return {
        id: null,
        status: r.status,
        error: `POST /api/perimeters/ HTTP ${r.status} : ${txt.slice(0, 200)}`,
      };
    }
    const created = (await r.json()) as { id: string };
    return { id: created.id };
  }

  async ensureCampaign(args: {
    name: string;
    description: string;
    status: "draft" | "in_progress" | "in_review" | "done" | "deprecated";
    dueDate?: string; // YYYY-MM-DD
    perimeterIds: string[]; // M2M obligatoire cote Django
    frameworkIds: string[]; // M2M obligatoire cote Django
  }): Promise<{
    ok: boolean;
    id?: string;
    action?: "POST" | "PATCH";
    status?: number;
    error?: string;
  }> {
    if (!this.folderId)
      return { ok: false, error: "folderId manquant (ensureFolder absent ?)" };
    const list = await this.request(
      "GET",
      `/api/campaigns/?folder=${encodeURIComponent(this.folderId)}`,
    );
    if (list.status === 404) {
      const txt = await list.text();
      return {
        ok: false,
        status: 404,
        error: `Endpoint /api/campaigns/ inexistant — instance CISO Assistant trop ancienne ou module non activé (${txt.slice(0, 120)})`,
      };
    }
    let existing: any | undefined;
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      existing = items.find((c: any) => c.name === args.name);
    } else if (list.status === 401 || list.status === 403) {
      const txt = await list.text();
      return {
        ok: false,
        status: list.status,
        error: `GET /api/campaigns/ refusé (${list.status}) — permissions insuffisantes : ${txt.slice(0, 120)}`,
      };
    }
    const payload: Record<string, unknown> = {
      name: args.name,
      description: args.description,
      folder: this.folderId,
      status: args.status,
      perimeters: args.perimeterIds,
      frameworks: args.frameworkIds,
      ...(args.dueDate && { due_date: args.dueDate }),
    };
    if (existing) {
      const r = await this.request(
        "PATCH",
        `/api/campaigns/${existing.id}/`,
        payload,
      );
      if ([200, 201].includes(r.status)) {
        return { ok: true, action: "PATCH", id: existing.id };
      }
      const txt = await r.text();
      return {
        ok: false,
        status: r.status,
        error: `PATCH /api/campaigns/${existing.id}/ HTTP ${r.status} : ${txt.slice(0, 200)}`,
      };
    }
    const r = await this.request("POST", "/api/campaigns/", payload);
    if ([200, 201].includes(r.status)) {
      const created = (await r.json()) as { id: string };
      return { ok: true, action: "POST", id: created.id };
    }
    const txt = await r.text();
    return {
      ok: false,
      status: r.status,
      error: `POST /api/campaigns/ HTTP ${r.status} : ${txt.slice(0, 200)}`,
    };
  }

  // =========================================================================
  // v1.8 - Teams sync. Cree/maintient une Team CISO Assistant par Group
  // Humanix (Compta, RH, Dev, Commercial...). Le RSSI peut assigner des
  // findings/incidents nativement par equipe. Idempotent par name.
  // =========================================================================

  /**
   * Cree ou retrouve une Team CISO Assistant par name dans le folder
   * Humanix. Description et team_email mis a jour si Team trouvee.
   * Membres NON synchronises automatiquement (necessite User CISO
   * Assistant correspondant). C'est le RSSI qui assigne les membres
   * cote intuitem.
   */
  async ensureTeam(args: {
    name: string;
    description: string;
    teamEmail?: string;
  }): Promise<{ ok: boolean; id?: string; action?: "POST" | "PATCH" }> {
    if (!this.folderId) return { ok: false };
    // Lister existants
    const list = await this.request(
      "GET",
      `/api/teams/?folder=${encodeURIComponent(this.folderId)}`,
    );
    let existing: any | undefined;
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      existing = items.find((t: any) => t.name === args.name);
    }
    const payload: Record<string, unknown> = {
      name: args.name,
      description: args.description,
      folder: this.folderId,
      ...(args.teamEmail && { team_email: args.teamEmail }),
    };
    if (existing) {
      const r = await this.request("PATCH", `/api/teams/${existing.id}/`, payload);
      if ([200, 201].includes(r.status)) {
        return { ok: true, action: "PATCH", id: existing.id };
      }
      return { ok: false };
    }
    const r = await this.request("POST", "/api/teams/", payload);
    if ([200, 201].includes(r.status)) {
      const created = (await r.json()) as { id: string };
      return { ok: true, action: "POST", id: created.id };
    }
    return { ok: false };
  }

  // =========================================================================
  // v1.7 - Metrology hooks. Le module metrology de CISO Assistant permet
  // au RSSI/DSI/DPO de visualiser l'evolution dans le temps de metriques
  // operationnelles (tenant_score, completion_rate, phishing_report_rate,
  // counts d'evidences). On expose :
  //   - MetricDefinition : "template" reutilisable (ex: "humanix.tenant_score")
  //   - MetricInstance : instance du template scopee au tenant + folder
  //   - CustomMetricSample : point de mesure (timestamp + value JSON)
  //
  // Le format value attendu pour metric quantitative : {"result": <number>}.
  // =========================================================================

  /**
   * Resout l'id d'une unite Terminology (METRIC_UNIT) par son nom. Les
   * unites built-in de CISO Assistant sont : count, users, bytes,
   * percentage, score, days, hours, "events per second".
   * Retourne null si l'unite n'existe pas (instance ancienne, libraries
   * Terminology non chargees, etc.) -> on continuera sans unit.
   * Cache in-memory pour eviter N appels.
   */
  private terminologyCache: Map<string, string> = new Map();
  async resolveMetricUnit(unitName: string): Promise<string | null> {
    const cached = this.terminologyCache.get(unitName);
    if (cached) return cached;
    // field_path=METRIC_UNIT scope la recherche aux Terminology d'unites
    // (vs autres usages comme ROTO_RISK_ORIGIN, QUALIFICATIONS, etc.).
    const r = await this.request(
      "GET",
      `/api/terminologies/?field_path=METRIC_UNIT&name=${encodeURIComponent(unitName)}`,
    );
    if (r.status !== 200) return null;
    const data = (await r.json()) as any;
    const items = data.results ?? (Array.isArray(data) ? data : []);
    // Match exact sur name OU translations (CISO Assistant ships avec FR/EN).
    const exact =
      items.find((t: any) => t.name === unitName) ??
      items.find((t: any) =>
        Object.values(t.translations ?? {}).some((v: any) =>
          typeof v?.name === "string" ? v.name === unitName : v === unitName,
        ),
      );
    if (exact?.id) {
      this.terminologyCache.set(unitName, exact.id);
      return exact.id;
    }
    return null;
  }

  /**
   * Cree ou retrouve un FilteringLabel par sa valeur `label`. Idempotent.
   * `label` doit matcher regex ^[\w-]{1,36}$ (validation Django). On
   * normalise donc en remplacant les caracteres invalides par "-".
   * Le label est cree dans le folder Humanix par defaut.
   */
  async ensureFilteringLabel(label: string): Promise<string | null> {
    if (!this.folderId) return null;
    // Normalise : minuscules + caracteres autorises uniquement, max 36 chars
    const norm = label
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .slice(0, 36);
    const list = await this.request(
      "GET",
      `/api/filtering-labels/?label=${encodeURIComponent(norm)}`,
    );
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      const exact = items.find((f: any) => f.label === norm);
      if (exact?.id) return exact.id;
    }
    // Pas trouve -> POST
    const r = await this.request("POST", "/api/filtering-labels/", {
      label: norm,
      folder: this.folderId,
    });
    if (![200, 201].includes(r.status)) return null;
    const created = (await r.json()) as { id: string };
    return created.id;
  }

  /**
   * Cree ou retrouve une MetricDefinition Humanix par ref_id. Quantitative
   * par defaut, higher_is_better=true (la majorite de nos metriques).
   *
   * Enrichissement v2 :
   *  - provider: "Humanix Académie" (champ ReferentialObjectMixin)
   *  - unit: FK Terminology resolue par nom ("percentage", "count", "score")
   *  - filtering_labels: M2M, label "humanix" (cree au besoin)
   */
  async ensureMetricDefinition(args: {
    refId: string; // ex: "humanix.tenant_score"
    name: string;
    description: string;
    higherIsBetter?: boolean;
    defaultTarget?: number;
    unitName?: "count" | "percentage" | "score" | "users" | "days" | "hours";
    labelIds?: string[]; // FilteringLabel ids deja resolus
  }): Promise<{ id: string | null; status?: number; error?: string }> {
    if (!this.folderId)
      return { id: null, error: "folderId manquant" };
    const list = await this.request(
      "GET",
      `/api/metrology/metric-definitions/?ref_id=${encodeURIComponent(args.refId)}`,
    );
    if (list.status === 404) {
      const txt = await list.text();
      return {
        id: null,
        status: 404,
        error: `Endpoint /api/metrology/metric-definitions/ inexistant — module Metrology non disponible sur cette instance (${txt.slice(0, 120)})`,
      };
    }
    if (list.status === 401 || list.status === 403) {
      const txt = await list.text();
      return {
        id: null,
        status: list.status,
        error: `GET /api/metrology/metric-definitions/ refusé (${list.status}) : ${txt.slice(0, 120)}`,
      };
    }
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      const exact = items.find((d: any) => d.ref_id === args.refId);
      if (exact) return { id: exact.id };
    }
    // Resolution unit (best-effort, ignore si introuvable)
    let unitId: string | null = null;
    if (args.unitName) {
      unitId = await this.resolveMetricUnit(args.unitName);
    }
    const r = await this.request("POST", "/api/metrology/metric-definitions/", {
      ref_id: args.refId,
      name: args.name,
      description: args.description,
      folder: this.folderId,
      category: "quantitative",
      is_published: true,
      higher_is_better: args.higherIsBetter ?? true,
      provider: "Humanix Académie",
      ...(unitId && { unit: unitId }),
      ...(args.labelIds && args.labelIds.length > 0 && {
        filtering_labels: args.labelIds,
      }),
      ...(args.defaultTarget !== undefined && {
        default_target: args.defaultTarget,
      }),
    });
    if (![200, 201].includes(r.status)) {
      const txt = await r.text();
      return {
        id: null,
        status: r.status,
        error: `POST /api/metrology/metric-definitions/ HTTP ${r.status} : ${txt.slice(0, 200)}`,
      };
    }
    const created = (await r.json()) as { id: string };
    return { id: created.id };
  }

  /**
   * Cree ou retrouve une MetricInstance liee a une MetricDefinition pour
   * le folder Humanix courant. Idempotent par name. Frequency monthly
   * par defaut (on push a chaque sync, mensuel = pas stale en cron quotidien).
   */
  async ensureMetricInstance(args: {
    metricDefinitionId: string;
    name: string;
    framework: string;
    targetValue?: number;
    labelIds?: string[]; // FilteringLabel ids (idem que sur Definition)
  }): Promise<{ id: string | null; status?: number; error?: string }> {
    if (!this.folderId) return { id: null, error: "folderId manquant" };
    const list = await this.request(
      "GET",
      `/api/metrology/metric-instances/?folder=${encodeURIComponent(this.folderId)}`,
    );
    if (list.status === 404) {
      const txt = await list.text();
      return {
        id: null,
        status: 404,
        error: `Endpoint /api/metrology/metric-instances/ inexistant (${txt.slice(0, 120)})`,
      };
    }
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      const exact = items.find((i: any) => i.name === args.name);
      if (exact) return { id: exact.id };
    }
    const r = await this.request("POST", "/api/metrology/metric-instances/", {
      name: args.name,
      description: `Mesure Humanix Académie pour ${args.framework}, alimentée automatiquement à chaque sync.`,
      folder: this.folderId,
      metric_definition: args.metricDefinitionId,
      ...(args.labelIds && args.labelIds.length > 0 && {
        filtering_labels: args.labelIds,
      }),
      status: "active",
      collection_frequency: "monthly",
      ...(args.targetValue !== undefined && { target_value: args.targetValue }),
      ...(this.ownerActorId && { owner: [this.ownerActorId] }),
    });
    if (![200, 201].includes(r.status)) {
      const txt = await r.text();
      return {
        id: null,
        status: r.status,
        error: `POST /api/metrology/metric-instances/ HTTP ${r.status} : ${txt.slice(0, 200)}`,
      };
    }
    const created = (await r.json()) as { id: string };
    return { id: created.id };
  }

  /**
   * Push un point de mesure dans la serie temporelle. Format value
   * quantitative : {"result": <number>}. Timestamp = now (le serializer
   * Django rejette les timestamps futurs).
   */
  async pushMetricSample(args: {
    metricInstanceId: string;
    value: number;
    observation?: string;
  }): Promise<{ ok: boolean; id?: string; status?: number; error?: string }> {
    const r = await this.request("POST", "/api/metrology/custom-metric-samples/", {
      metric_instance: args.metricInstanceId,
      timestamp: new Date().toISOString(),
      value: { result: args.value },
      ...(args.observation && { observation: args.observation }),
    });
    if ([200, 201].includes(r.status)) {
      const created = (await r.json()) as { id: string };
      return { ok: true, id: created.id };
    }
    const txt = await r.text();
    return {
      ok: false,
      status: r.status,
      error: `POST /api/metrology/custom-metric-samples/ HTTP ${r.status} : ${txt.slice(0, 200)}`,
    };
  }

  // =========================================================================
  // v1.6 - Incident hooks. Quand >=1 controle est non_compliant sur le panel
  // d'evidences, on cree un Incident SEV3 "Risque humain critique" cote CISO
  // Assistant. Idempotent par ref_id = humanix-<framework>-<YYYY-MM-DD>.
  // Sert d'alerte proactive type NIS2 §23 -- pas une declaration formelle
  // d'incident mais une trace pour l'audit.
  // =========================================================================

  async upsertIncident(args: {
    framework: string;
    nbNonCompliant: number;
    nbPartial: number;
    nbTotal: number;
    refDate: string; // YYYY-MM-DD
  }): Promise<{ ok: boolean; action?: "POST" | "PATCH"; id?: string }> {
    if (!this.folderId) return { ok: false };
    const refId = `humanix-${args.framework}-${args.refDate}`.slice(0, 100);
    const name =
      `Risque humain : ${args.nbNonCompliant} contrôle(s) non conforme(s) sur ${args.framework}`.slice(0, 255);
    const description =
      `Détection automatique Humanix Académie.\n` +
      `Référentiel : ${args.framework}\n` +
      `Date de détection : ${args.refDate}\n` +
      `Couverture du panel :\n` +
      `  - ${args.nbNonCompliant} non conforme(s) / ${args.nbTotal}\n` +
      `  - ${args.nbPartial} partiel(s) / ${args.nbTotal}\n\n` +
      `Action recommandée : revue trimestrielle du programme de sensibilisation, ` +
      `lancement d'une campagne phishing simulé ciblée, validation du plan ` +
      `de remédiation par le RSSI / DPO.\n\n` +
      `Ce signalement est un constat d'écart automatique pour traçabilité ` +
      `audit (ISO 27001 §10.1 / NIS2 §21.2.g). Il ne préjuge PAS d'une ` +
      `compromission effective.`;

    const payload: Record<string, unknown> = {
      ref_id: refId,
      name,
      description,
      folder: this.folderId,
      status: "new",
      severity: 3, // SEV3 Moderate
      detection: "internally_detected",
      ...(this.ownerActorId && { owner: [this.ownerActorId] }),
    };

    const list = await this.request(
      "GET",
      `/api/incidents/?folder=${encodeURIComponent(this.folderId)}`,
    );
    let existing: { id: string } | undefined;
    if (list.status === 200) {
      const data = (await list.json()) as any;
      const items = data.results ?? (Array.isArray(data) ? data : []);
      existing = items.find((i: any) => i.ref_id === refId);
    }

    if (existing) {
      const r = await this.request(
        "PATCH",
        `/api/incidents/${existing.id}/`,
        payload,
      );
      if ([200, 201].includes(r.status))
        return { ok: true, action: "PATCH", id: existing.id };
      return { ok: false };
    }
    const r = await this.request("POST", "/api/incidents/", payload);
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
