// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Client Mollie (https://docs.mollie.com).
//
// Stack : SDK officiel @mollie/api-client (MIT, maintenu par Mollie B.V.,
// types fournis). On l'a prefere a une implementation manuelle car le SDK
// gere proprement le retry exponentiel, les enums, et masque les particularites
// de pagination de l'API REST.
//
// Modele recurrent Mollie (different de Mollie !) :
//   1. createMollieCustomer()        : cree le Customer
//   2. createFirstPayment()          : 1er paiement avec sequenceType="first"
//      -> hosted payment URL retournee, le client paye et un MANDATE est cree
//   3. webhook (payment.paid)        : on recoit l'event, fetch /payments/{id}
//      -> on cree alors la Subscription avec customer.mandates[0].id
//   4. paiements ulterieurs          : Mollie debite automatiquement via mandate
//      -> webhook pour chaque echeance reussie / echouee
//
// Securite webhook : Mollie NE SIGNE PAS HMAC les webhooks. La securite repose
// sur le pattern pull : le webhook recoit juste un `id`, on doit fetch la
// ressource via API (qui requiert notre cle secrete). Un attaquant qui spam
// notre webhook URL ne peut donc rien lire de reel.
//
// Idempotence : on persiste les events recus dans BillingEvent.providerEventId
// (= mollie payment id, pas un event id distinct comme Mollie).

import createMollieClient, {
  type MollieClient,
  type Customer,
  type Payment,
  type Subscription,
  Locale,
  SequenceType,
  SubscriptionStatus,
  PaymentStatus,
} from "@mollie/api-client";
import type { PlanId } from "@/lib/plans";

// ----------------------------------------------------------------------------
// Singleton client : on instancie une fois par process pour reutiliser le
// connection pool sous-jacent du SDK.
// ----------------------------------------------------------------------------
let _client: MollieClient | null = null;

export function isMollieConfigured(): boolean {
  return Boolean(process.env.MOLLIE_API_KEY);
}

function getClient(): MollieClient {
  if (_client) return _client;
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MOLLIE_API_KEY non defini. Mode dev : utiliser DEV_MODE=true pour bypass.",
    );
  }
  _client = createMollieClient({ apiKey });
  return _client;
}

// ----------------------------------------------------------------------------
// Customer
// ----------------------------------------------------------------------------
export type MollieCustomer = {
  id: string;
  email: string | null;
  name: string | null;
  metadata: Record<string, string>;
};

function customerToPublic(c: Customer): MollieCustomer {
  return {
    id: c.id,
    email: c.email ?? null,
    name: c.name ?? null,
    metadata:
      (c.metadata as Record<string, string> | null | undefined) ?? {},
  };
}

export async function createMollieCustomer(params: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<MollieCustomer> {
  const client = getClient();
  const c = await client.customers.create({
    email: params.email,
    name: params.name,
    locale: Locale.fr_FR,
    metadata: params.metadata ?? {},
  });
  return customerToPublic(c);
}

export async function getMollieCustomer(
  customerId: string,
): Promise<MollieCustomer | null> {
  const client = getClient();
  try {
    const c = await client.customers.get(customerId);
    return customerToPublic(c);
  } catch (e) {
    if (e instanceof Error && e.message.includes("404")) return null;
    throw e;
  }
}

// ----------------------------------------------------------------------------
// Pricing : derive prix HT + intervalle Mollie depuis plan + billing + seats.
// Mollie veut un montant exact (string "X.YZ" + currency) pour chaque charge.
//
// Source de verite tarifaire (lib/plans.ts) :
//   - starter : 19 EUR/mois flat (forfait 6-15 sieges), pas de remise annuel
//   - pro     : 3 EUR/siege/mois, annuel = -10 %
//   - enterprise : sur devis, pas via Mollie
// ----------------------------------------------------------------------------
export const MOLLIE_BUYABLE_PLANS: PlanId[] = ["starter", "pro"];

export function isPlanBuyable(plan: PlanId): boolean {
  return MOLLIE_BUYABLE_PLANS.includes(plan);
}

export type MollieAmount = { value: string; currency: "EUR" };
export type MollieInterval = "1 month" | "12 months";

export type PricingResult = {
  amount: MollieAmount;
  interval: MollieInterval;
  /** Description humaine pour le statement bancaire (max 22 chars) */
  description: string;
};

export function mollieAmountForPlan(
  plan: PlanId,
  billing: "monthly" | "annual",
  seats: number,
): PricingResult {
  const interval: MollieInterval = billing === "annual" ? "12 months" : "1 month";

  let cents = 0;
  if (plan === "starter") {
    // Plan starter : 19 EUR/mois flat. Annuel = 19 * 12 = 228 EUR (pas de remise).
    cents = billing === "annual" ? 19_00 * 12 : 19_00;
  } else if (plan === "pro") {
    // Plan pro : 3 EUR/siege/mois. Annuel = 3 * 12 * 0.9 = 32.4 EUR/siege.
    const monthly = seats * 3_00;
    cents = billing === "annual" ? Math.round(monthly * 12 * 0.9) : monthly;
  } else {
    throw new Error(`Plan ${plan} non achetable via Mollie (enterprise = devis).`);
  }

  return {
    amount: {
      value: (cents / 100).toFixed(2),
      currency: "EUR",
    },
    interval,
    description: `Humanix ${plan.toUpperCase()}`.slice(0, 22),
  };
}

// ----------------------------------------------------------------------------
// First Payment : pose le mandate (CB stockee chez Mollie) et redirige
// l'utilisateur vers la page hostee Mollie pour le payer.
//
// On stocke en metadata tout ce qu'il faut pour que le webhook payment.paid
// retrouve quoi faire (creer la subscription + provisionner le tenant).
// ----------------------------------------------------------------------------
export type MollieCheckoutSession = {
  id: string; // payment id (tr_xxx)
  hosted_payment: { payment_url: string };
  customer: { id: string };
};

export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail: string;
  customerName?: string;
  plan: PlanId;
  billing: "monthly" | "annual";
  seats: number;
  tenantId: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
}): Promise<MollieCheckoutSession> {
  // 1. Resoudre le customer (creation a la volee si pas d'id existant)
  let customerId = params.customerId;
  if (!customerId) {
    const customer = await createMollieCustomer({
      email: params.customerEmail,
      name: params.customerName,
      metadata: {
        tenantId: params.tenantId,
        plan: params.plan,
      },
    });
    customerId = customer.id;
  }

  // 2. Calculer le montant + interval (servira au webhook pour creer la sub)
  const pricing = mollieAmountForPlan(params.plan, params.billing, params.seats);

  // 3. Creer le first payment hosted
  const client = getClient();
  const payment = await client.payments.create({
    amount: pricing.amount,
    description: pricing.description,
    redirectUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
    webhookUrl: params.webhookUrl,
    sequenceType: SequenceType.first,
    customerId,
    metadata: {
      mode: "first-payment",
      tenantId: params.tenantId,
      plan: params.plan,
      billing: params.billing,
      seats: String(params.seats),
      interval: pricing.interval,
      amountValue: pricing.amount.value,
      amountCurrency: pricing.amount.currency,
      ...(params.metadata ?? {}),
    },
  });

  if (!payment.getCheckoutUrl()) {
    throw new Error("Mollie n'a pas retourne d'URL hostee pour ce paiement.");
  }

  return {
    id: payment.id,
    hosted_payment: {
      payment_url: payment.getCheckoutUrl() as string,
    },
    customer: { id: customerId },
  };
}

// ----------------------------------------------------------------------------
// Subscription : creee APRES first payment paid (donc apres webhook).
// ----------------------------------------------------------------------------
export type MollieSubscriptionResult = {
  id: string;
  customerId: string;
  status: string;
  amount: MollieAmount;
  interval: string;
  nextPaymentDate: Date | null;
};

function subscriptionToPublic(s: Subscription, customerId: string): MollieSubscriptionResult {
  return {
    id: s.id,
    customerId,
    status: s.status as string,
    amount: s.amount as MollieAmount,
    interval: s.interval,
    nextPaymentDate: s.nextPaymentDate ? new Date(s.nextPaymentDate) : null,
  };
}

export async function createSubscriptionForCustomer(params: {
  customerId: string;
  amount: MollieAmount;
  interval: MollieInterval;
  description: string;
  webhookUrl: string;
  metadata: Record<string, string>;
  startDate?: Date;
}): Promise<MollieSubscriptionResult> {
  const client = getClient();
  const sub = await client.customerSubscriptions.create({
    customerId: params.customerId,
    amount: params.amount,
    interval: params.interval,
    description: params.description,
    webhookUrl: params.webhookUrl,
    metadata: params.metadata,
    ...(params.startDate
      ? { startDate: params.startDate.toISOString().slice(0, 10) }
      : {}),
  });
  return subscriptionToPublic(sub, params.customerId);
}

export async function getSubscription(
  customerId: string,
  subscriptionId: string,
): Promise<MollieSubscriptionResult | null> {
  const client = getClient();
  try {
    const sub = await client.customerSubscriptions.get(subscriptionId, {
      customerId,
    });
    return subscriptionToPublic(sub, customerId);
  } catch (e) {
    if (e instanceof Error && e.message.includes("404")) return null;
    throw e;
  }
}

export async function cancelSubscription(
  customerId: string,
  subscriptionId: string,
): Promise<void> {
  const client = getClient();
  await client.customerSubscriptions.cancel(subscriptionId, {
    customerId,
  });
}

// ----------------------------------------------------------------------------
// Payment fetch : utilise par le webhook pour verifier l'authenticite + recuperer
// l'etat reel (Mollie envoie juste un id, jamais le contenu).
// ----------------------------------------------------------------------------
export type MolliePaymentResource = {
  id: string;
  status: string; // PaymentStatus enum string
  customerId: string | null;
  mandateId: string | null;
  subscriptionId: string | null;
  sequenceType: string;
  amount: MollieAmount;
  metadata: Record<string, string>;
  createdAt: string;
  paidAt: string | null;
  failedAt: string | null;
};

function paymentToPublic(p: Payment): MolliePaymentResource {
  return {
    id: p.id,
    status: p.status as string,
    customerId: p.customerId ?? null,
    mandateId: p.mandateId ?? null,
    subscriptionId: p.subscriptionId ?? null,
    sequenceType: p.sequenceType as string,
    amount: p.amount as MollieAmount,
    metadata: (p.metadata as Record<string, string> | null | undefined) ?? {},
    createdAt: p.createdAt as string,
    paidAt: (p.paidAt as string | null) ?? null,
    failedAt: (p.failedAt as string | null) ?? null,
  };
}

export async function getPayment(
  paymentId: string,
): Promise<MolliePaymentResource | null> {
  const client = getClient();
  try {
    const p = await client.payments.get(paymentId);
    return paymentToPublic(p);
  } catch (e) {
    if (e instanceof Error && e.message.includes("404")) return null;
    throw e;
  }
}

// ----------------------------------------------------------------------------
// Status mappings : Mollie -> notre modele interne (paymentStatus du Tenant).
// ----------------------------------------------------------------------------
export function mollieStatusToSubscription(
  s: string,
): "active" | "past_due" | "canceled" | "trialing" {
  switch (s) {
    case SubscriptionStatus.active:
      return "active";
    case SubscriptionStatus.pending:
      return "trialing";
    case SubscriptionStatus.suspended:
      return "past_due";
    case SubscriptionStatus.canceled:
    case SubscriptionStatus.completed:
      return "canceled";
    default:
      return "active";
  }
}

export function molliePaymentIsPaid(s: string): boolean {
  return s === PaymentStatus.paid;
}

export function molliePaymentIsFailed(s: string): boolean {
  return (
    s === PaymentStatus.failed ||
    s === PaymentStatus.canceled ||
    s === PaymentStatus.expired
  );
}

// ----------------------------------------------------------------------------
// Validation setup au boot
// ----------------------------------------------------------------------------
export type MollieSetupReport = {
  enabled: boolean;
  liveMode: boolean;
  warnings: string[];
};

export function validateMollieSetup(): MollieSetupReport {
  const enabled = isMollieConfigured();
  const key = process.env.MOLLIE_API_KEY ?? "";
  // Mollie : keys commencent par "test_" pour le sandbox, "live_" pour la prod.
  const liveMode = key.startsWith("live_");

  const warnings: string[] = [];
  if (enabled && !liveMode) {
    warnings.push(
      "MOLLIE_API_KEY est une cle de test (test_*). Les paiements sont en sandbox - aucune CB ne sera debitee.",
    );
  }
  if (enabled && !process.env.NEXT_PUBLIC_APP_URL && !process.env.AUTH_URL) {
    warnings.push(
      "NEXT_PUBLIC_APP_URL / AUTH_URL non defini. Les webhookUrl/redirectUrl envoyees a Mollie pointeront vers localhost.",
    );
  }

  return { enabled, liveMode, warnings };
}
