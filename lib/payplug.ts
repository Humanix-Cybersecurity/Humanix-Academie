// SPDX-License-Identifier: AGPL-3.0-or-later
// Client Payplug FR (https://api.payplug.com).
//
// Choix : implementation REST directe (fetch) plutot que SDK npm officiel,
// pour zero dep tierce sur un chemin critique (un SDK qui boucle = checkout
// casse pour tous les clients). L'API Payplug est simple et stable.
//
// Endpoints utilises (cf. https://docs.payplug.com/api) :
//   POST /v1/customers              : creer un customer
//   POST /v1/payments               : creer un paiement (one-shot)
//   POST /v1/subscription_plans     : (selon plan) lier un customer a un plan
//   GET  /v1/customers/{id}         : lire un customer
//   POST /v1/payments + recurring   : pour les abonnements recurrents
//
// NOTE IMPORTANTE : l'API Payplug evolue. Avant deploiement, verifier sur
// https://docs.payplug.com/api que les endpoints et payloads ci-dessous
// sont a jour. Les zones a confirmer sont marquees "TODO PAYPLUG-DOC".
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanId } from "@/lib/plans";

const PAYPLUG_BASE_URL = "https://api.payplug.com";
const PAYPLUG_API_VERSION = "2019-08-06";

export function isPayplugConfigured(): boolean {
  return Boolean(process.env.PAYPLUG_SECRET_KEY);
}

function getSecretKey(): string {
  const k = process.env.PAYPLUG_SECRET_KEY;
  if (!k) throw new Error("PAYPLUG_SECRET_KEY non defini");
  return k;
}

// ----------------------------------------------------------------------------
// REST helpers
// ----------------------------------------------------------------------------
async function payplugFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${PAYPLUG_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "PayPlug-Version": PAYPLUG_API_VERSION,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Payplug ${res.status} on ${path} : ${body.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

// ----------------------------------------------------------------------------
// Customer
// ----------------------------------------------------------------------------
export type PayplugCustomer = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  metadata: Record<string, string>;
};

export async function createCustomer(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, string>;
}): Promise<PayplugCustomer> {
  return payplugFetch<PayplugCustomer>("/v1/customers", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      first_name: params.firstName ?? null,
      last_name: params.lastName ?? null,
      metadata: params.metadata ?? {},
    }),
  });
}

// ----------------------------------------------------------------------------
// Mapping plans Humanix -> Payplug
// Payplug ne propose pas une notion de "Price ID" comme Stripe. Soit on cree
// un plan d'abonnement Payplug (Subscription Plan), soit on facture chaque
// echeance comme un paiement separe. Pour la V1 on configure des plans
// Subscription cote dashboard Payplug, et on stocke leurs IDs en env.
// ----------------------------------------------------------------------------
const ENV_PLAN_BY_TIER: Partial<Record<PlanId, string>> = {
  solo: "PAYPLUG_PLAN_SOLO",
  essentielle: "PAYPLUG_PLAN_ESSENTIELLE",
  pro: "PAYPLUG_PLAN_PRO",
  premium: "PAYPLUG_PLAN_PREMIUM",
};

export function payplugPlanIdForTier(tier: PlanId): string | null {
  const envVar = ENV_PLAN_BY_TIER[tier];
  if (!envVar) return null;
  const v = process.env[envVar];
  return v && v.length > 0 ? v : null;
}

export function tierFromPayplugPlanId(planId: string): PlanId | null {
  for (const [tier, envVar] of Object.entries(ENV_PLAN_BY_TIER)) {
    if (process.env[envVar] === planId) return tier as PlanId;
  }
  return null;
}

export const PAYPLUG_BUYABLE_PLANS: PlanId[] = ["solo", "essentielle", "pro"];

export function isPlanBuyable(plan: PlanId): boolean {
  return (
    PAYPLUG_BUYABLE_PLANS.includes(plan) && payplugPlanIdForTier(plan) !== null
  );
}

// ----------------------------------------------------------------------------
// Checkout : on cree un paiement Payplug avec hosted_payment URL pour rediriger
// l'admin du tenant. TODO PAYPLUG-DOC : valider l'endpoint exact pour les
// abonnements (peut etre /v1/subscription_plans/{id}/subscriptions).
//
// Pour V1 on cree un Subscription via l'endpoint dedié (necessite que les
// SubscriptionPlans soient deja crees dans le dashboard Payplug).
// ----------------------------------------------------------------------------
export type PayplugCheckoutSession = {
  id: string;
  hosted_payment: { payment_url: string };
  customer?: { id: string };
};

export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail: string;
  planId: string; // Payplug Subscription Plan ID
  tenantId: string;
  appPlanId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<PayplugCheckoutSession> {
  // Si pas de customer existant, on en cree un d'abord
  let customerId = params.customerId;
  if (!customerId) {
    const c = await createCustomer({
      email: params.customerEmail,
      metadata: { tenantId: params.tenantId, appPlanId: params.appPlanId },
    });
    customerId = c.id;
  }

  // Cree une "Subscription" Payplug (V1 : l'API exacte peut differer
  // selon votre offre Payplug, valider doc dashboard).
  // TODO PAYPLUG-DOC : ajuster path / payload selon doc finale.
  const sub = await payplugFetch<{
    id: string;
    hosted_payment: { payment_url: string };
  }>("/v1/subscription_plans/" + params.planId + "/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      hosted_payment: {
        return_url: params.successUrl,
        cancel_url: params.cancelUrl,
      },
      metadata: {
        tenantId: params.tenantId,
        appPlanId: params.appPlanId,
        ...(params.metadata ?? {}),
      },
    }),
  });

  return {
    id: sub.id,
    hosted_payment: sub.hosted_payment,
    customer: { id: customerId },
  };
}

// ----------------------------------------------------------------------------
// Customer Portal : Payplug n'expose pas un Customer Portal hosted comme
// Stripe Billing Portal. Pour V1 on retombe sur une page interne /profil/
// facturation qui :
//   - affiche le statut actuel
//   - propose "Mettre à jour ma carte" (re-checkout en mode payment_method
//     update — TODO PAYPLUG-DOC)
//   - propose "Annuler mon abonnement" (POST /v1/subscriptions/{id}/cancel)
//
// Cette fonction renvoie l'URL d'update CB Payplug (ou null si feature
// pas configuree, fallback portail interne).
// ----------------------------------------------------------------------------
export async function createPaymentMethodUpdateUrl(params: {
  subscriptionId: string;
  successUrl: string;
}): Promise<string | null> {
  // TODO PAYPLUG-DOC : verifier l'endpoint reel pour update CB.
  // Si Payplug ne le supporte pas en hosted, retourner null et le portail
  // interne affichera un message "contactez le support" ou un re-checkout.
  try {
    const res = await payplugFetch<{ payment_url: string }>(
      `/v1/subscriptions/${params.subscriptionId}/update_card`,
      {
        method: "POST",
        body: JSON.stringify({ return_url: params.successUrl }),
      },
    );
    return res.payment_url;
  } catch {
    return null;
  }
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<void> {
  await payplugFetch(`/v1/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
  });
}

// ----------------------------------------------------------------------------
// Webhooks
// Payplug signe ses webhooks via header `Payplug-Signature` (HMAC-SHA256).
// La signature couvre le body brut. On compare en temps constant.
// TODO PAYPLUG-DOC : valider le nom exact du header et l'algo (la doc
// Payplug evolue, c'etait HMAC-SHA256 en 2024).
// ----------------------------------------------------------------------------
const SIGNATURE_HEADER = "payplug-signature";

export function verifyWebhookSignature(
  rawBody: string,
  receivedSignatureHeader: string | null,
): boolean {
  const secret = process.env.PAYPLUG_WEBHOOK_SECRET;
  if (!secret || !receivedSignatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(receivedSignatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const PAYPLUG_SIGNATURE_HEADER = SIGNATURE_HEADER;

// Format d'event Payplug attendu (subset utilise) :
// {
//   "id": "evt_xxx",
//   "type": "subscription.created" | "subscription.updated" |
//           "subscription.canceled" | "payment.paid" | "payment.failed",
//   "data": { "object": {...} },
//   "created_at": 1234567890
// }
export type PayplugWebhookEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
  created_at: number;
};
