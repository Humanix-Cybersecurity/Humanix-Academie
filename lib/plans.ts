// SPDX-License-Identifier: AGPL-3.0-or-later
// Source de vérité du plan-gating.
// Aligné sur la grille tarifaire (cf. lib/pricing.ts).
//
// =============================================================================
// PIVOT MAI 2026 - modèle volume + open core
// =============================================================================
//
// Hiérarchie : trial < decouverte < solo (Starter) < essentielle < pro < premium (Enterprise).
// Une feature est disponible si le plan du tenant >= au minimum requis.
//
// IMPORTANT - rétro-compat DB :
// On garde les keys existantes (`trial`, `solo`, `essentielle`, `pro`, `premium`)
// pour ne PAS casser les tenants déjà en base. Seuls les LIBELLÉS UI changent
// pour refléter la nouvelle grille :
//   - `solo`    → affiché comme "Starter"
//   - `premium` → affiché comme "Enterprise"
// On AJOUTE `decouverte` (forever-free 5 sièges).
//
// Note open source : `community` (self-host AGPL gratuit) n'apparaît PAS comme
// PlanId - par construction, ces installations n'ont pas de tenant cloud chez
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
  // Vishing IA souverain (Mistral + Piper TTS)
  vishing: "pro",
  // Smishing IA souverain (Mistral SMS)
  smishing: "pro",
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
 * Récupère le plan du tenant courant DEPUIS LA BASE DE DONNÉES uniquement.
 *
 * Cette fonction est **client-safe** : elle peut être importée depuis un
 * Server Component ou un module utilitaire, et `lib/plans.ts` reste sans
 * dépendance Node-only. C'est nécessaire car certains "use client"
 * (cf. `app/demo/page.tsx`) importent ce fichier pour les constantes
 * `PLAN_LABEL` / `PLAN_EMOJI` - Webpack pré-bundle alors `lib/plans.ts`
 * pour le browser, et tout import statique de `node:crypto` dans la
 * chaîne casse le build.
 *
 * Pour avoir le plan effectif **prenant en compte une licence Ed25519
 * éventuellement configurée** (HUMANIX_LICENSE_KEY), appelle
 * `getEffectivePlan(tenantId)` exporté par `@/lib/license` à la place.
 *
 * Cf. `docs/LICENSE_KEY.md` pour le système de licence côté self-host
 * commercial.
 *
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
// LIBELLÉS UI - alignés sur la nouvelle grille mai 2026
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

// =============================================================================
// QUOTAS DE SIEGES par plan
// =============================================================================
// Limite le nombre d'utilisateurs (User) actifs par tenant. Verifie a chaque
// invitation/creation d'user via lib/seats.ts -> enforceSeatQuota().
//
// `Infinity` = illimite (Premium). En BDD, ne pas stocker Infinity ; le calcul
// utilise PLAN_SEATS au moment de la verification.
export const PLAN_SEATS: Record<PlanId, number> = {
  trial: 5, // Decouverte 30j (auto-converted to "decouverte" forever-free apres trial)
  decouverte: 5, // Forever-free 5 sieges
  solo: 10, // Starter PME individuelle
  essentielle: 50, // PME 10-50
  pro: 250, // PME/ETI 50-250
  premium: Infinity, // Enterprise (negociation custom)
};

// =============================================================================
// PRIX MENSUELS HT (€)
// =============================================================================
// Source de verite des prix affiches sur /tarifs et factures Payplug.
// Les vrais ID de plans Payplug sont dans .env (PAYPLUG_PLAN_*).
export const PLAN_PRICE_EUR_MONTHLY: Record<PlanId, number | null> = {
  trial: 0,
  decouverte: 0,
  solo: 29,
  essentielle: 89,
  pro: 249,
  premium: null, // sur devis
};

// Prix annuel (avec ~17% de remise = 2 mois offerts)
export const PLAN_PRICE_EUR_YEARLY: Record<PlanId, number | null> = {
  trial: 0,
  decouverte: 0,
  solo: 290, // 29 * 10
  essentielle: 890, // 89 * 10
  pro: 2490, // 249 * 10
  premium: null,
};

// =============================================================================
// COMPARAISONS DE PLAN (helpers commun upgrade/downgrade UI)
// =============================================================================

/**
 * Retourne true si planA est strictement plus haut que planB.
 * Utilise pour : "tu peux passer en Pro pour debloquer cette feature".
 */
export function isPlanUpgrade(from: PlanId, to: PlanId): boolean {
  return PLAN_RANK[to] > PLAN_RANK[from];
}

/**
 * Retourne true si planA est strictement plus bas que planB (downgrade).
 */
export function isPlanDowngrade(from: PlanId, to: PlanId): boolean {
  return PLAN_RANK[to] < PLAN_RANK[from];
}

/**
 * Plan immediatement superieur (pour CTA "Passer au plan suivant").
 * Retourne null si deja sur le plan max (Premium).
 */
export function nextPlan(plan: PlanId): PlanId | null {
  const order: PlanId[] = ["decouverte", "solo", "essentielle", "pro", "premium"];
  const i = order.indexOf(plan);
  if (i === -1 || i === order.length - 1) return null;
  return order[i + 1];
}

/**
 * Le tenant a-t-il un plan payant actif (vs trial / decouverte gratuit) ?
 */
export function isPaidPlan(plan: PlanId): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK.solo;
}
