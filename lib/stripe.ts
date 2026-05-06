// SPDX-License-Identifier: AGPL-3.0-or-later
// Client Stripe + helpers de mapping plan <-> price ID Stripe.
//
// L'app n'expose JAMAIS la cle secrete Stripe au client. Toutes les
// interactions passent par les routes API server-side (/api/stripe/*).
//
// Mapping Plan Humanix <-> Stripe Price :
// On stocke les IDs Stripe en variables d'env pour pouvoir basculer entre
// test mode (sk_test_…) et live mode (sk_live_…) sans code change.
//
//   STRIPE_PRICE_SOLO          : Plan Solo (Starter)
//   STRIPE_PRICE_ESSENTIELLE   : Plan Essentielle
//   STRIPE_PRICE_PRO           : Plan Pro
//   STRIPE_PRICE_PREMIUM       : Plan Premium (Enterprise) — souvent contrat sur-mesure, optionnel
//
// Convention : plans `decouverte` et `trial` n'ont pas de price ID
// (forever-free / period-limited gratuit). Seuls les payants sont mappes.
import Stripe from "stripe";
import type { PlanId } from "@/lib/plans";

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY n'est pas defini.");
  }
  _client = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
  });
  return _client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

const ENV_PRICE_BY_PLAN: Partial<Record<PlanId, string>> = {
  solo: "STRIPE_PRICE_SOLO",
  essentielle: "STRIPE_PRICE_ESSENTIELLE",
  pro: "STRIPE_PRICE_PRO",
  premium: "STRIPE_PRICE_PREMIUM",
};

/**
 * Renvoie le Price ID Stripe pour un plan donne, ou null si :
 *  - Le plan est gratuit (decouverte/trial)
 *  - La variable d'env n'est pas configuree (CTA "Demander un devis"
 *    plutot que checkout direct)
 */
export function priceIdForPlan(plan: PlanId): string | null {
  const envVar = ENV_PRICE_BY_PLAN[plan];
  if (!envVar) return null;
  const value = process.env[envVar];
  return value && value.length > 0 ? value : null;
}

/**
 * Mapping inverse : a partir d'un Price ID Stripe, retrouve le plan Humanix.
 * Utilise par le webhook pour mettre a jour Tenant.plan a chaque change.
 */
export function planFromPriceId(priceId: string): PlanId | null {
  for (const [plan, envVar] of Object.entries(ENV_PRICE_BY_PLAN)) {
    if (process.env[envVar] === priceId) return plan as PlanId;
  }
  return null;
}

/**
 * Plans qu'on autorise a etre achetes via Stripe Checkout.
 * Premium est exclu par defaut (contrat sur-mesure / vente directe).
 */
export const STRIPE_BUYABLE_PLANS: PlanId[] = ["solo", "essentielle", "pro"];

export function isPlanBuyable(plan: PlanId): boolean {
  return STRIPE_BUYABLE_PLANS.includes(plan) && priceIdForPlan(plan) !== null;
}
