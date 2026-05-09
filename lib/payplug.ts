// SPDX-License-Identifier: AGPL-3.0-or-later
// Client Payplug FR (https://api.payplug.com).
//
// Choix : implementation REST directe (fetch) plutot que SDK npm officiel,
// pour zero dep tierce sur un chemin critique (un SDK qui boucle = checkout
// casse pour tous les clients). L'API Payplug est simple et stable.
//
// Endpoints CONFIRMES par la doc publique (https://docs.payplug.com/api/apiref.html) :
//   POST   /v1/customers              : creer un customer
//   GET    /v1/customers/{id}         : lire un customer
//   POST   /v1/payments               : creer un paiement (one-shot)
//   PATCH  /v1/payments/{id}          : abort/capture un paiement
//   POST   /v1/payments/{id}/refunds  : remboursement
//   DELETE /v1/cards/{card_id}        : supprimer une carte
//   PayPlug-Version actuelle stable   : 2019-08-06
//
// Endpoints NON documentes publiquement (a valider pre-launch avec le
// support commercial Payplug - la doc apiref.html ne les liste pas) :
//   - POST /v1/subscription_plans/{id}/subscriptions  (creer souscription)
//   - POST /v1/subscriptions/{id}/update_card         (update CB hosted)
//   - POST /v1/subscriptions/{id}/cancel              (annulation)
//   - Webhook signature : header `Payplug-Signature`, HMAC-SHA256 hex
//     (algo confirme par implementation 2024, header name a confirmer)
//
// Action manuelle pre-launch (cf. 00_ACTIONS_MANUELLES_REQUISES.md A22) :
// valider les 4 zones ci-dessus avec le support commercial Payplug.
// En attendant, validatePayplugSetup() loggue explicitement les warnings
// au boot pour eviter les surprises silencieuses en prod.
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

/**
 * Récupère un Customer Payplug par ID. Utile dans le webhook pour résoudre
 * l'email d'un customer qui paye pour la 1re fois (= pas encore de tenant
 * en BDD pointant vers ce customer_id).
 *
 * Retourne null en cas de 404 (customer supprimé / inconnu) plutôt que
 * de throw, pour que le webhook puisse logger et continuer proprement.
 */
export async function getCustomer(
  customerId: string,
): Promise<PayplugCustomer | null> {
  try {
    return await payplugFetch<PayplugCustomer>(
      `/v1/customers/${encodeURIComponent(customerId)}`,
      { method: "GET" },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("404")) return null;
    throw e;
  }
}

// ----------------------------------------------------------------------------
// Mapping plans Humanix -> Payplug
// Payplug ne propose pas une notion de "Price ID" comme Stripe. Soit on cree
// un plan d'abonnement Payplug (Subscription Plan), soit on facture chaque
// echeance comme un paiement separe. Pour la V1 on configure des plans
// Subscription cote dashboard Payplug, et on stocke leurs IDs en env.
// ----------------------------------------------------------------------------
const ENV_PLAN_BY_TIER: Partial<Record<PlanId, string>> = {
  starter: "PAYPLUG_PLAN_STARTER",
  pro: "PAYPLUG_PLAN_PRO",
  // enterprise : pas de plan Payplug (sur devis, contrat manuel)
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

// Plans achetables via le checkout Payplug self-service.
// Enterprise est exclu : process commercial manuel (devis + contrat).
export const PAYPLUG_BUYABLE_PLANS: PlanId[] = ["starter", "pro"];

export function isPlanBuyable(plan: PlanId): boolean {
  return (
    PAYPLUG_BUYABLE_PLANS.includes(plan) && payplugPlanIdForTier(plan) !== null
  );
}

// ----------------------------------------------------------------------------
// Checkout : on cree un paiement Payplug avec hosted_payment URL pour rediriger
// l'admin du tenant.
//
// IMPORTANT : l'endpoint POST /v1/subscription_plans/{id}/subscriptions n'est
// PAS dans la doc publique apiref.html (qui ne couvre que les paiements
// one-shot). Avant launch commercial, valider :
//   1. Le path exact (peut etre /v1/subscriptions tout court)
//   2. La forme du payload (customer_id vs customer_email, hosted_payment shape)
//   3. La structure de la reponse (id de subscription vs id de payment)
//
// Cf. action manuelle pre-launch (validatePayplugSetup ci-dessous).
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

  // Cree une "Subscription" Payplug. Path et payload a valider pre-launch
  // avec le support Payplug (cf. note en haut de fichier). Les erreurs
  // Payplug remontent via payplugFetch -> message explicite "Payplug 404
  // on /v1/subscription_plans/...".
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
//   - propose "Mettre à jour ma carte" (via cette fonction, fallback re-checkout)
//   - propose "Annuler mon abonnement" (POST /v1/subscriptions/{id}/cancel)
//
// IMPORTANT : l'endpoint /v1/subscriptions/{id}/update_card n'est PAS dans
// la doc publique apiref.html. Si Payplug ne le supporte pas en hosted,
// la fonction retourne null et le portail interne propose alors un
// re-checkout complet (UX moins fluide mais fonctionnel).
//
// Pre-launch : valider avec Payplug si le hosted update existe, sinon
// implementer le fallback re-checkout dans /profil/facturation.
// ----------------------------------------------------------------------------
export async function createPaymentMethodUpdateUrl(params: {
  subscriptionId: string;
  successUrl: string;
}): Promise<string | null> {
  // L'erreur est captee silencieusement et retourne null - la couche
  // appelante decide du fallback (re-checkout). Si l'endpoint a ete
  // valide pre-launch et qu'il echoue en prod, on saura par les logs
  // serveur (payplugFetch loggue le path et le status).
  try {
    const res = await payplugFetch<{ payment_url: string }>(
      `/v1/subscriptions/${params.subscriptionId}/update_card`,
      {
        method: "POST",
        body: JSON.stringify({ return_url: params.successUrl }),
      },
    );
    return res.payment_url;
  } catch (e) {
    console.warn(
      "[payplug] update_card endpoint indisponible, fallback re-checkout",
      e instanceof Error ? e.message : String(e),
    );
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
// Payplug signe ses webhooks via header `Payplug-Signature` (HMAC-SHA256
// en hex sur le body brut). On compare en temps constant.
//
// IMPORTANT : la doc publique apiref.html ne documente pas le mecanisme
// de signature. Le header name + algo + format hex sont confirmes par
// l'implementation 2024 mais a re-valider pre-launch avec Payplug.
// Si Payplug change le format en base64 par exemple, on s'en rendra
// compte immediatement : verifyWebhookSignature() retournera false sur
// tous les events recus -> le route handler webhook les rejettera ->
// alerte dans /admin/audit (events PAYPLUG_WEBHOOK_REJECTED).
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

// ----------------------------------------------------------------------------
// Validation au boot
// ----------------------------------------------------------------------------
export type PayplugSetupReport = {
  enabled: boolean;
  /** Plans cloud-payants (solo / essentielle / pro) effectivement bindes */
  plansConfigured: PlanId[];
  /** Plans cloud-payants attendus mais non bindes -> tarifs casses pour eux */
  plansMissing: PlanId[];
  /** Webhook secret renseigne ? Sinon webhook = ouvert a tout (CRITIQUE) */
  webhookSecretSet: boolean;
  /** Avertissements sur les zones non documentees publiquement */
  warnings: string[];
};

/**
 * Audite la configuration Payplug au boot. Le but est de detecter les
 * configurations partielles qui causeraient des erreurs en prod (clé OK
 * mais aucun plan binde -> checkout impossible).
 *
 * Appelable depuis un script de boot ou un endpoint admin diagnostic.
 * Ne fait PAS d'appel reseau Payplug (la cle peut etre fausse, on s'en
 * apercevra au premier checkout).
 */
export function validatePayplugSetup(): PayplugSetupReport {
  const enabled = isPayplugConfigured();
  const expectedPlans: PlanId[] = ["starter", "pro"];
  const plansConfigured: PlanId[] = [];
  const plansMissing: PlanId[] = [];

  for (const tier of expectedPlans) {
    if (payplugPlanIdForTier(tier)) plansConfigured.push(tier);
    else plansMissing.push(tier);
  }

  const webhookSecretSet = Boolean(process.env.PAYPLUG_WEBHOOK_SECRET);

  const warnings: string[] = [];
  if (enabled && plansMissing.length > 0) {
    warnings.push(
      `PAYPLUG_PLAN_${plansMissing.map((p) => p.toUpperCase()).join(", PAYPLUG_PLAN_")} non defini(s) - le checkout echouera pour ces tiers.`,
    );
  }
  if (enabled && !webhookSecretSet) {
    warnings.push(
      "PAYPLUG_WEBHOOK_SECRET non defini - les webhooks seront tous rejetes (verifyWebhookSignature retourne false).",
    );
  }
  if (enabled) {
    warnings.push(
      "Endpoints subscription/update_card/cancel + format webhook signature non documentes publiquement chez Payplug. A valider avec le support commercial avant launch (cf. lib/payplug.ts header).",
    );
  }

  return {
    enabled,
    plansConfigured,
    plansMissing,
    webhookSecretSet,
    warnings,
  };
}
