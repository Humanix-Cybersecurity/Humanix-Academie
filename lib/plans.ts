// Source de vérité du plan-gating.
// Aligné sur la grille tarifaire (cf. lib/pricing.ts).
//
// =============================================================================
// PIVOT MAI 2026 — modèle volume + open core
// =============================================================================
//
// Hiérarchie : trial < decouverte < solo (Starter) < essentielle < pro < premium (Enterprise).
// Une feature est disponible si le plan du tenant >= au minimum requis.
//
// IMPORTANT — rétro-compat DB :
// On garde les keys existantes (`trial`, `solo`, `essentielle`, `pro`, `premium`)
// pour ne PAS casser les tenants déjà en base. Seuls les LIBELLÉS UI changent
// pour refléter la nouvelle grille :
//   - `solo`    → affiché comme "Starter"
//   - `premium` → affiché comme "Enterprise"
// On AJOUTE `decouverte` (forever-free 5 sièges).
//
// Note open source : `community` (self-host AGPL gratuit) n'apparaît PAS comme
// PlanId — par construction, ces installations n'ont pas de tenant cloud chez
// nous. Le palier "Community Edition" est purement présenté côté marketing
// dans la page /tarifs.

import { db } from "@/lib/db";

export type PlanId =
  | "trial"
  | "decouverte"
  | "solo"
  | "essentielle"
  | "pro"
  | "premium";

export const PLAN_RANK: Record<PlanId, number> = {
  trial: 0,
  decouverte: 1,
  solo: 2,
  essentielle: 3,
  pro: 4,
  premium: 5,
};

// Catalogue des features gated et leur plan minimum.
// Ajoute ici toute nouvelle feature payante.
export const FEATURE_MIN_PLAN = {
  // Acces API REST publique (cles API + endpoints /api/v1/*)
  api: "essentielle",
  // Lancement de campagnes phishing simulees
  phishing: "pro",
  // Challenges d'equipe (competition interne)
  challenges: "pro",
  // Module Cyber-Reflexe - reponse a incident guidee
  incidents: "pro",
  // Phishing personnalise par employe via IA Mistral
  phishing_ia: "pro",
  // Marketplace de modules (officiels + communaute)
  marketplace: "pro",
  // SSO entreprise (SAML, SCIM)
  sso_enterprise: "premium",
  // Multi-tenant gestion par filiale ou site
  multi_site: "premium",
  // White-label (logo + couleurs personnalises)
  white_label: "premium",
} as const satisfies Record<string, PlanId>;

export type Feature = keyof typeof FEATURE_MIN_PLAN;

// Plans valides (utilise pour parser un input non-typed)
const VALID_PLANS = new Set<PlanId>([
  "trial",
  "decouverte",
  "solo",
  "essentielle",
  "pro",
  "premium",
]);

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && VALID_PLANS.has(value as PlanId);
}

export function normalizePlan(value: unknown): PlanId {
  return isPlanId(value) ? value : "trial";
}

/**
 * Le plan donné couvre-t-il la feature demandée ?
 * Exemple : planHasFeature("essentielle", "phishing") === false (phishing requiert pro+)
 */
export function planHasFeature(
  plan: PlanId | string | null | undefined,
  feature: Feature,
): boolean {
  const p = normalizePlan(plan);
  const required = FEATURE_MIN_PLAN[feature];
  return PLAN_RANK[p] >= PLAN_RANK[required];
}

/**
 * Récupère le plan du tenant courant.
 * Retourne "trial" en fallback si tenant introuvable.
 */
export async function getTenantPlan(tenantId: string): Promise<PlanId> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  return normalizePlan(tenant?.plan);
}

// =============================================================================
// LIBELLÉS UI — alignés sur la nouvelle grille mai 2026
// =============================================================================
// Ces labels apparaissent partout dans l'app (bandeaux, upsell, factures...).
// Ils peuvent évoluer sans toucher à la DB (les keys restent stables).

export const PLAN_LABEL: Record<PlanId, string> = {
  trial: "Essai gratuit",
  decouverte: "Découverte",
  solo: "Starter",
  essentielle: "Essentielle",
  pro: "Pro",
  premium: "Enterprise",
};

export const PLAN_EMOJI: Record<PlanId, string> = {
  trial: "🎁",
  decouverte: "🌱",
  solo: "⚡",
  essentielle: "✨",
  pro: "🚀",
  premium: "👑",
};

// Plan minimum requis pour une feature, en libellé humain ("Pro")
export function featureMinPlanLabel(feature: Feature): string {
  return PLAN_LABEL[FEATURE_MIN_PLAN[feature]];
}
