// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Registry Prometheus pour Humanix Academie.
//
// === Pourquoi ===
//
// On veut exposer des metriques applicatives via /api/metrics
// (scraping Prometheus / Scaleway Cockpit / Datadog autohebergé).
// Toutes les metriques passent par CE registry pour eviter les
// doublons en cas de hot-reload Next.js (dev) et garder un point
// central pour la nomenclature.
//
// === Nomenclature ===
//
// Prefixe `humanix_` pour eviter les collisions avec les standards
// Node.js (process_*, nodejs_*). Conforme aux conventions Prometheus
// (snake_case, suffixe `_total` pour counter, `_seconds` pour duree).
//
// === Privacy ===
//
// On NE met PAS de PII en label (email, userId, tenantId nominatif).
// Les labels sont des dimensions techniques agregables :
//   - action : enum AuditAction (ex: "USER_LOGIN_SUCCESS")
//   - severity : enum AuditSeverity (ex: "INFO")
//   - method : HTTP method (GET, POST, ...)
//   - route : pattern Next.js (ex: "/api/v1/dpo-export")
//   - status : code HTTP (200, 401, 500, ...)
//
// Un attaquant qui scrape /api/metrics ne peut PAS reconstruire
// l'activite d'un user particulier.
//
// === Acces a /api/metrics ===
//
// En prod, le endpoint est protege par un token Bearer dans
// METRICS_SCRAPE_TOKEN (env var). En dev, ouvert pour faciliter
// l'exploration locale. Cf. app/api/metrics/route.ts.

import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
  type LabelValues,
} from "prom-client";

// Singleton du registry. Le hot-reload Next.js en dev recharge ce
// module plusieurs fois ; on stocke le registry dans globalThis pour
// le partager entre les rechargements et eviter les erreurs
// "metric already registered".
const globalForMetrics = globalThis as unknown as {
  __humanix_registry?: Registry;
  __humanix_metrics?: HumanixMetrics;
};

type HumanixMetrics = {
  registry: Registry;
  auditActionTotal: Counter<string>;
  httpRequestsTotal: Counter<string>;
  httpRequestDurationSeconds: Histogram<string>;
  // Produit et IA (2026-10-03) : cf. le bloc du meme nom dans buildMetrics.
  hexMessagesTotal: Counter<string>;
  hexCaracteresTotal: Counter<string>;
  courrielsTotal: Counter<string>;
  episodesTerminesTotal: Counter<string>;
};

function buildMetrics(): HumanixMetrics {
  const registry = new Registry();
  registry.setDefaultLabels({
    app: "humanix-academie",
    env: process.env.NODE_ENV ?? "development",
  });

  // Metriques standard Node.js (process_*, nodejs_*).
  collectDefaultMetrics({ register: registry, prefix: "humanix_" });

  // === Audit log counter ===
  //
  // Compte les events de la table AuditLog. Permet d'alerter sur :
  //   - Pic de USER_LOGIN_FAILED (bruteforce ?)
  //   - Apparition de EXFILTRATION_SUSPECTED (sprint 3 pentest)
  //   - Pic de AI_PROMPT_INJECTION_ATTEMPT
  //   - DPO_EXPORT_REQUESTED anormal (> N fois/h sur un tenant)
  const auditActionTotal = new Counter({
    name: "humanix_audit_action_total",
    help: "Nombre d'evenements ecrits dans la table AuditLog, par action et severity",
    labelNames: ["action", "severity"],
    registers: [registry],
  });

  // === HTTP request counter ===
  //
  // A incrementer via un wrapper dans les Route Handlers ou un
  // middleware Edge. Pour la v1, on instrumente uniquement les
  // endpoints critiques manuellement (cf. lib/metrics/instrument.ts
  // ou direct dans les routes).
  const httpRequestsTotal = new Counter({
    name: "humanix_http_requests_total",
    help: "Nombre total de requetes HTTP traitees, par methode, route et status",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });

  // === HTTP request duration histogram ===
  //
  // Buckets en secondes : 0.05 / 0.1 / 0.25 / 0.5 / 1 / 2.5 / 5 / 10.
  // Couvre de 50ms (endpoint cache) a 10s (build PDF, generation IA).
  const httpRequestDurationSeconds = new Histogram({
    name: "humanix_http_request_duration_seconds",
    help: "Duree des requetes HTTP en secondes",
    labelNames: ["method", "route", "status"],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  // --- Produit et IA (2026-10-03) ---------------------------------------
  //
  // Jusqu'ici l'application n'exposait que ses requetes HTTP et ses actions
  // d'audit. Depuis que les jetons Mistral sont payants, il faut lire
  // combien de messages Hex partent, pour qui, avec quel modele, et
  // combien sont refuses par les quotas (lib/ai/hex/quotas.ts). Les
  // caracteres entres et sortis donnent une estimation du cout (un jeton
  // vaut environ quatre caracteres de francais). Labels bornes : plan (3),
  // modele (2 ou 3), resultat (8), sens (2).
  const hexMessagesTotal = new Counter({
    name: "humanix_hex_messages_total",
    help: "Messages envoyes a Hex, par plan, modele et resultat (ok, quota_*, fournisseur, indisponible, invalide)",
    labelNames: ["plan", "modele", "resultat"],
    registers: [registry],
  });
  const hexCaracteresTotal = new Counter({
    name: "humanix_hex_caracteres_total",
    help: "Caracteres envoyes au modele (entree : prompt systeme et historique) et recus (sortie), par plan",
    labelNames: ["plan", "sens"],
    registers: [registry],
  });
  const courrielsTotal = new Counter({
    name: "humanix_courriels_total",
    help: "Courriels envoyes par la plateforme, par voie et resultat (ok ou raison d'echec SMTP)",
    labelNames: ["voie", "resultat"],
    registers: [registry],
  });
  const episodesTerminesTotal = new Counter({
    name: "humanix_episodes_termines_total",
    help: "Episodes termines par les apprenants, toutes organisations confondues",
    registers: [registry],
  });

  return {
    registry,
    auditActionTotal,
    httpRequestsTotal,
    httpRequestDurationSeconds,
    hexMessagesTotal,
    hexCaracteresTotal,
    courrielsTotal,
    episodesTerminesTotal,
  };
}

/**
 * Recupere (ou cree) le registry Prometheus partage. Pattern singleton
 * resistant au hot-reload Next.js en dev.
 */
export function getMetrics(): HumanixMetrics {
  if (!globalForMetrics.__humanix_metrics) {
    globalForMetrics.__humanix_metrics = buildMetrics();
    globalForMetrics.__humanix_registry =
      globalForMetrics.__humanix_metrics.registry;
  }
  return globalForMetrics.__humanix_metrics;
}

/**
 * Helper pour incrementer le counter `humanix_audit_action_total` depuis
 * `lib/audit.ts`. Best-effort : ne lance JAMAIS d'exception (sinon on
 * casserait le audit log lui-meme).
 */
export function recordAuditMetric(
  action: string,
  severity: string | null | undefined,
): void {
  try {
    const m = getMetrics();
    m.auditActionTotal.inc({
      action,
      severity: severity ?? "INFO",
    });
  } catch (err) {
    // Loge en console mais n'echoue pas. Le metric n'est qu'un signal,
    // l'audit log lui-meme reste persiste en BDD.
    console.error("[metrics] recordAuditMetric failed", err);
  }
}

/**
 * Helper pour instrumenter une requete HTTP. A appeler en fin de
 * traitement avec la duree mesuree depuis le debut. Utilise process.hrtime
 * pour la precision sub-milliseconde.
 *
 * Exemple :
 *   const start = process.hrtime.bigint();
 *   try { ... } finally {
 *     recordHttpMetric({
 *       method: "GET", route: "/api/v1/dpo-export", status: 200,
 *       startHrTime: start,
 *     });
 *   }
 */
export function recordHttpMetric(params: {
  method: string;
  route: string;
  status: number;
  startHrTime: bigint;
}): void {
  try {
    const m = getMetrics();
    const labels: LabelValues<string> = {
      method: params.method,
      route: params.route,
      status: String(params.status),
    };
    m.httpRequestsTotal.inc(labels);
    const elapsedNs = Number(process.hrtime.bigint() - params.startHrTime);
    const elapsedSec = elapsedNs / 1e9;
    m.httpRequestDurationSeconds.observe(labels, elapsedSec);
  } catch (err) {
    console.error("[metrics] recordHttpMetric failed", err);
  }
}

// --- Produit et IA : helpers best-effort, comme recordAuditMetric -----------

export type ResultatHex =
  | "ok"
  | "quota_heure"
  | "quota_jour"
  | "quota_espace"
  | "quota_instance"
  | "fournisseur"
  | "indisponible"
  | "invalide";

/** Un message adresse a Hex, quel qu'en soit le sort. */
export function recordHexMessage(params: {
  plan: string;
  modele: string;
  resultat: ResultatHex;
}): void {
  try {
    getMetrics().hexMessagesTotal.inc({
      plan: params.plan,
      modele: params.modele,
      resultat: params.resultat,
    });
  } catch (err) {
    console.error("[metrics] recordHexMessage failed", err);
  }
}

/** Caracteres entres (prompt + historique) ou sortis (reponse) pour Hex. */
export function recordHexCaracteres(params: {
  plan: string;
  sens: "entree" | "sortie";
  nombre: number;
}): void {
  if (!Number.isFinite(params.nombre) || params.nombre <= 0) return;
  try {
    getMetrics().hexCaracteresTotal.inc(
      { plan: params.plan, sens: params.sens },
      params.nombre,
    );
  } catch (err) {
    console.error("[metrics] recordHexCaracteres failed", err);
  }
}

/** Un courriel tente, par voie d'envoi et resultat. */
export function recordCourriel(params: {
  voie: string;
  resultat: string;
}): void {
  try {
    getMetrics().courrielsTotal.inc({
      voie: params.voie,
      resultat: params.resultat,
    });
  } catch (err) {
    console.error("[metrics] recordCourriel failed", err);
  }
}

/** Un episode termine par une personne. */
export function recordEpisodeTermine(): void {
  try {
    getMetrics().episodesTerminesTotal.inc();
  } catch (err) {
    console.error("[metrics] recordEpisodeTermine failed", err);
  }
}
