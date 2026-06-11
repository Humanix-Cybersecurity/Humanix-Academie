// SPDX-License-Identifier: AGPL-3.0-or-later
// Source de vérité du plan-gating.
// Aligné sur la grille tarifaire (cf. lib/pricing.ts).
//
// =============================================================================
// PIVOT MAI 2026 - Simplification a 3 paliers cloud (+ Community Edition)
// =============================================================================
//
// Hierarchie : starter < pro < enterprise.
// Une feature est disponible si le plan du tenant >= au minimum requis.
//
// HISTORIQUE :
// La grille avait 5 paliers cloud (decouverte, solo, essentielle, pro, premium).
// Elle a ete reduite a 3 en mai 2026 suite aux retours utilisateurs ("trop
// complique de s'y retrouver"). Le mapping de migration :
//   decouverte  -> starter (sub-tier free <=5 sieges)
//   solo        -> starter (sub-tier paid 19EUR/mois 6-15 sieges)
//   essentielle -> pro
//   pro (old)   -> pro (avec nouvelle tarification 3EUR/user/mois)
//   premium     -> enterprise
//
// Le plan `"trial"` (essai gratuit 30j) a egalement existe avant le pivot vente
// directe. Toute valeur legacy est gracieusement normalisee via normalizePlan().
//
// Note open source : `community` (self-host AGPL gratuit) n'apparait PAS comme
// PlanId - par construction, ces installations n'ont pas de tenant cloud chez
// nous. Le palier "Community Edition" est purement presente cote marketing
// dans la page /tarifs.

import { db } from "@/lib/db";

export type PlanId = "starter" | "pro" | "enterprise";

export const PLAN_RANK: Record<PlanId, number> = {
  starter: 0,
  pro: 1,
  enterprise: 2,
};

// Catalogue des features gated et leur plan minimum.
// Ajoute ici toute nouvelle feature payante.
export const FEATURE_MIN_PLAN = {
  // Acces API REST publique (cles API + endpoints /api/v1/*)
  api: "pro",
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
  // Quishing (QR code phishing physique : posters imprimables)
  quishing: "pro",
  // Marketplace de modules (officiels + communaute)
  marketplace: "pro",
  // SSO entreprise (SAML, SCIM)
  sso_enterprise: "enterprise",
  // Multi-tenant gestion par filiale ou site
  multi_site: "enterprise",
  // White-label (logo + couleurs personnalises)
  white_label: "enterprise",
  // Veille d'exposition B2B des comptes salaries (Phase 2, gated DPA+AIPD)
  exposure_monitoring: "enterprise",
} as const satisfies Record<string, PlanId>;

export type Feature = keyof typeof FEATURE_MIN_PLAN;

// Plans valides (utilise pour parser un input non-typed)
const VALID_PLANS = new Set<PlanId>(["starter", "pro", "enterprise"]);

// Mapping de migration depuis les anciens identifiants (mai 2026 pivot 3 paliers).
// Sert a normaliser gracieusement toute valeur legacy en BDD ou dans du code
// pas encore migre. NE PAS ETENDRE ce mapping pour les nouveaux plans : si on
// renomme dans le futur, ajouter une nouvelle migration dediee.
const LEGACY_PLAN_MAP: Record<string, PlanId> = {
  // Anciens 5 paliers -> 3 nouveaux
  decouverte: "starter",
  solo: "starter",
  essentielle: "pro",
  premium: "enterprise",
  // Encore plus ancien (essai gratuit 30j supprime mai 2026)
  trial: "starter",
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && VALID_PLANS.has(value as PlanId);
}

export function normalizePlan(value: unknown): PlanId {
  if (typeof value === "string") {
    if (VALID_PLANS.has(value as PlanId)) return value as PlanId;
    const mapped = LEGACY_PLAN_MAP[value];
    if (mapped) return mapped;
  }
  // Toute autre valeur inconnue tombe sur Starter (forever-free <=5 sieges).
  return "starter";
}

/**
 * Le plan donné couvre-t-il la feature demandée ?
 * Exemple : planHasFeature("starter", "phishing") === false (phishing requiert pro+)
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
 * Pour avoir le plan effectif **prenant en compte une licence
 * éventuellement configurée** (HUMANIX_LICENSE_KEY), appelle
 * `getEffectivePlan(tenantId)` exporté par `@/lib/license` à la place.
 *
 * Retourne "starter" en fallback si tenant introuvable (= plan le plus bas).
 */
export async function getTenantPlan(tenantId: string): Promise<PlanId> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  return normalizePlan(tenant?.plan);
}

// =============================================================================
// LIBELLÉS UI - alignés sur la nouvelle grille mai 2026 (3 paliers)
// =============================================================================
// Ces labels apparaissent partout dans l'app (bandeaux, upsell, factures...).
// Ils peuvent évoluer sans toucher à la DB (les keys restent stables).

export const PLAN_LABEL: Record<PlanId, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const PLAN_EMOJI: Record<PlanId, string> = {
  starter: "⚡",
  pro: "🚀",
  enterprise: "👑",
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
// `Infinity` = illimite (Enterprise). En BDD, ne pas stocker Infinity ; le
// calcul utilise PLAN_SEATS au moment de la verification.
export const PLAN_SEATS: Record<PlanId, number> = {
  starter: 15, // Starter : free <=5, paye 19EUR/mois 6-15
  pro: 250, // Pro : 16-250 sieges, 3EUR/user/mois
  enterprise: Infinity, // Enterprise : negociation custom
};

// Sub-tier free a l'interieur d'un plan : combien de sieges sont gratuits
// avant de basculer sur la facturation. Permet d'avoir un Starter "free
// jusqu'a 5 puis 19EUR".
export const PLAN_FREE_SEATS: Record<PlanId, number> = {
  starter: 5,
  pro: 0,
  enterprise: 0,
};

// =============================================================================
// PRIX MENSUELS HT (€)
// =============================================================================
// Source de verite des prix affiches sur /tarifs et factures Mollie.
// Les vrais ID de plans Mollie sont dans .env (MOLLIE_PROFILE_*).
//
// `null` = pas de prix forfait (utilise PLAN_PRICE_PER_USER_EUR_MONTHLY a la
// place) ou sur devis (Enterprise).
export const PLAN_PRICE_EUR_MONTHLY: Record<PlanId, number | null> = {
  starter: 19, // Forfait 19EUR/mois quand seats > PLAN_FREE_SEATS.starter (=5)
  pro: null, // Tarification au siege (cf. PLAN_PRICE_PER_USER_EUR_MONTHLY)
  enterprise: null, // Sur devis
};

// Prix annuel (avec ~17% de remise = 2 mois offerts)
export const PLAN_PRICE_EUR_YEARLY: Record<PlanId, number | null> = {
  starter: 190, // 19 * 10 (vs 12 mensuel = -17%)
  pro: null,
  enterprise: null,
};

// Tarification au siege (€/user/mois). Utilise pour les plans facture au
// volume. `null` = plan a forfait fixe ou sur devis.
export const PLAN_PRICE_PER_USER_EUR_MONTHLY: Record<PlanId, number | null> = {
  starter: null,
  pro: 3, // 3EUR/user/mois pour 16-250 sieges
  enterprise: null,
};

export const PLAN_PRICE_PER_USER_EUR_YEARLY: Record<PlanId, number | null> = {
  starter: null,
  pro: 2.5, // 2.50EUR/user/mois en engagement annuel (~17% remise)
  enterprise: null,
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
 * Retourne null si deja sur le plan max (Enterprise).
 */
export function nextPlan(plan: PlanId): PlanId | null {
  const order: PlanId[] = ["starter", "pro", "enterprise"];
  const i = order.indexOf(plan);
  if (i === -1 || i === order.length - 1) return null;
  return order[i + 1];
}

/**
 * Le tenant a-t-il un plan payant actif ?
 *
 * ATTENTION : Starter a deux sous-paliers (free <=5 sieges, paye au-dela).
 * isPaidPlan('starter') retourne true en general (le plan EST payant si
 * seats > 5), mais pour savoir si le tenant doit reellement payer maintenant
 * il faut combiner avec son nombre de sieges actuels (cf. lib/seats.ts).
 *
 * Pour la logique de subscription / billing, utiliser plutot
 * `isPaidUsage(plan, seats)` ci-dessous.
 */
export function isPaidPlan(plan: PlanId): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK.starter; // tous les plans peuvent etre payants
}

/**
 * Le tenant doit-il reellement payer maintenant, compte tenu de son plan
 * et de son nombre de sieges actifs ? Utile pour decider si on declenche
 * un checkout Mollie ou si on laisse en mode forever-free.
 */
export function isPaidUsage(plan: PlanId, activeSeats: number): boolean {
  const freeSeats = PLAN_FREE_SEATS[plan];
  return activeSeats > freeSeats;
}
