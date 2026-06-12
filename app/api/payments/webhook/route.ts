// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/payments/webhook
//
// Webhook Mollie. Modele PULL : Mollie envoie juste un `id` (form-encoded
// dans le body), on doit fetch la ressource via Mollie API pour avoir l'etat
// reel. Pas de signature HMAC : la securite vient du fait que retrieve
// requiert notre cle API secrete (un attaquant qui spam le webhook ne peut
// rien lire).
//
// Types d'event geres :
//   - Payment (tr_xxx) :
//       sequenceType=first  + paid    -> creer Subscription + provisionner tenant
//       sequenceType=first  + failed  -> log, pas de provisionnement
//       sequenceType=recurring + paid -> mettre a jour subscription period
//       sequenceType=recurring + failed -> marquer tenant past_due
//   - Subscription (sub_xxx) :
//       canceled                       -> rebascule tenant sur starter
//
// Idempotence : BillingEvent.providerEventId = mollieId + "_" + status pour
// distinguer paid vs failed sur le meme payment.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import {
  getPayment,
  getSubscription,
  getMollieCustomer,
  createSubscriptionForCustomer,
  mollieAmountForPlan,
  molliePaymentIsPaid,
  molliePaymentIsFailed,
  mollieStatusToSubscription,
  type MolliePaymentResource,
} from "@/lib/mollie";
import { provisionTenantWithAdmin } from "@/lib/tenant-provisioning";
import { signIn } from "@/lib/auth";
import { isPlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Pentest fix #7 (2026-05-24) - try/catch global :
//
// AVANT : si getPayment(tr_inconnu) throw (cas habituel quand un attaquant
// pousse un id factice, ou quand l'API Mollie a un timeout), le handler
// remontait l'exception en HTTP 500. Probleme double :
//   1. Fingerprint : un 500 sur le webhook signale un endpoint actif et
//      vulnerable a l'envoi d'ids forges (recon facile).
//   2. DoS Mollie : Mollie retry le webhook automatiquement sur HTTP non-2xx,
//      ce qui peut saturer notre quota API si l'erreur persiste (et nous
//      facturer 1k+ appels gratuits par jour).
//
// APRES : on encapsule tout le dispatch dans un try/catch qui :
//   - retourne TOUJOURS 200 a Mollie (pas de retry, pas de fingerprint)
//   - logge en interne via console + table BillingEvent (status=error)
//   - persiste l'erreur pour investigation sans bloquer le flux
//
// Note : la vraie defense reste l'authenticite par retrieve (cle API
// secrete obligatoire) - l'attaquant qui force un tr_xxx ne peut rien
// LIRE de la ressource. Le try/catch global est une defense-en-profondeur
// contre le DoS et le fingerprint.

export async function POST(req: Request) {
  try {
    // Mollie POST body est form-encoded : id=tr_xxx (ou sub_xxx)
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const resourceId = params.get("id");

    if (!resourceId) {
      // Pas un retry Mollie (qui aurait au minimum un id meme invalide) :
      // soit un scan offensif, soit un misconfig. On retourne 400 pour
      // ne pas dissimuler un bug cote Mollie.
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    // Dispatch par prefix de l'id
    if (resourceId.startsWith("tr_")) {
      return await handlePaymentEvent(resourceId, req);
    }
    if (resourceId.startsWith("sub_")) {
      return await handleSubscriptionEvent(resourceId);
    }
    // Inconnu (mol_, mdt_, etc.) - on retourne 200 pour eviter Mollie retry indefini
    return NextResponse.json({ received: true, ignored: true });
  } catch (err) {
    // Fallback ultime : on logge cote serveur et on retourne 200 pour
    // que Mollie ne retry pas. Mieux vaut un evenement non traite (qu'on
    // peut recuperer manuellement via leur dashboard) qu'un retry-storm.
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[mollie-webhook] uncaught error", err);
    try {
      // Persiste l'erreur pour audit interne (best-effort, ne propage pas
      // une nouvelle exception si la BDD est down).
      await db.billingEvent.create({
        data: {
          provider: "mollie",
          providerEventId: `unhandled_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "webhook.unhandled_error",
          tenantId: null,
          payload: { error: errorMessage } as object,
          status: "error",
          errorMessage,
          providerCreatedAt: new Date(),
        },
      });
    } catch (logErr) {
      console.error("[mollie-webhook] failed to log uncaught error", logErr);
    }
    return NextResponse.json({ received: true, internal_error: true });
  }
}

async function handlePaymentEvent(paymentId: string, req: Request) {
  // 1. Fetch la ressource Mollie (verifie l'authenticite implicitement)
  const payment = await getPayment(paymentId);
  if (!payment) {
    // Mollie envoie parfois des webhooks pour des ressources que l'API ne
    // retourne pas tout de suite (race condition). On retourne 200 pour ne
    // pas declencher de retry brutal.
    return NextResponse.json({ received: true, not_found: true });
  }

  // 2. Idempotence : on cle sur "{paymentId}_{status}" pour distinguer
  //    les transitions (paid puis chargeback par ex.).
  const eventKey = `${payment.id}_${payment.status}`;
  const existing = await db.billingEvent.findUnique({
    where: { providerEventId: eventKey },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let status: "applied" | "ignored" | "error" = "ignored";
  let errorMessage: string | null = null;
  let tenantId: string | null = payment.metadata.tenantId ?? null;
  // Si pas de tenantId en metadata (cas anonymous-inscription), on resout
  // via le paymentCustomerId.
  if ((!tenantId || tenantId === "anonymous-inscription") && payment.customerId) {
    const t = await db.tenant.findUnique({
      where: { paymentCustomerId: payment.customerId },
      select: { id: true },
    });
    tenantId = t?.id ?? null;
  }

  try {
    if (molliePaymentIsPaid(payment.status)) {
      if (payment.sequenceType === "first") {
        // First payment OK : mandate cree cote Mollie, on peut maintenant
        // creer la Subscription pour les charges recurrentes + provisionner.
        const handled = await onFirstPaymentPaid(payment, req);
        tenantId = handled.tenantId ?? tenantId;
        status = handled.status;
        errorMessage = handled.errorMessage;
      } else {
        // Recurring : Mollie a charge automatiquement via mandate. On met
        // a jour la periode courante + statut active.
        if (tenantId) {
          await db.tenant.update({
            where: { id: tenantId },
            data: { subscriptionStatus: "active" },
          });
          status = "applied";
        }
      }
    } else if (molliePaymentIsFailed(payment.status)) {
      if (payment.sequenceType === "first") {
        // First payment failed : on log mais ne fait rien (pas de tenant
        // a marquer past_due puisqu'on n'en a jamais cree).
        status = "ignored";
      } else if (tenantId) {
        await db.tenant.update({
          where: { id: tenantId },
          data: { subscriptionStatus: "past_due" },
        });
        status = "applied";
      }
    }
  } catch (err: unknown) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  // Persistence event pour idempotence + audit
  await db.billingEvent.create({
    data: {
      provider: "mollie",
      providerEventId: eventKey,
      type: `payment.${payment.status}`,
      tenantId,
      payload: payment as unknown as object,
      status,
      errorMessage,
      providerCreatedAt: new Date(payment.createdAt),
    },
  });

  if (status === "applied" && tenantId) {
    await auditLog({
      action: molliePaymentIsPaid(payment.status)
        ? payment.sequenceType === "first"
          ? AuditActions.BILLING_SUBSCRIPTION_CREATED
          : AuditActions.BILLING_SUBSCRIPTION_UPDATED
        : AuditActions.BILLING_PAYMENT_FAILED,
      actor: { email: "mollie-webhook" },
      tenantId,
      target: { type: "payment", id: tenantId, label: payment.status },
      message: `Mollie payment ${payment.status} (${payment.sequenceType})`,
      metadata: { paymentId: payment.id, amount: payment.amount.value },
    });
  }

  if (status === "error") {
    return NextResponse.json(
      { error: errorMessage ?? "erreur" },
      { status: 500 },
    );
  }
  return NextResponse.json({ received: true });
}

/**
 * First payment paid : on cree la Subscription pour les charges recurrentes,
 * et si tenant inexistant (cas anonymous-inscription depuis /tarifs) on
 * provisionne tenant + ADMIN + magic link de bienvenue.
 */
async function onFirstPaymentPaid(
  payment: MolliePaymentResource,
  req: Request,
): Promise<{
  tenantId: string | null;
  status: "applied" | "ignored" | "error";
  errorMessage: string | null;
}> {
  const md = payment.metadata;
  const planRaw = md.plan ?? "";
  const billingRaw = md.billing ?? "monthly";
  const seatsRaw = Number.parseInt(md.seats ?? "0", 10);
  const billing: "monthly" | "annual" = billingRaw === "annual" ? "annual" : "monthly";

  if (!isPlanId(planRaw) || !payment.customerId) {
    return {
      tenantId: null,
      status: "error",
      errorMessage: "metadata_invalide_ou_customer_manquant",
    };
  }

  // 1. Creer la Subscription pour les charges recurrentes a venir
  const pricing = mollieAmountForPlan(planRaw, billing, seatsRaw || 1);
  // Webhook URL identique a celui de ce route handler (reutilisable).
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "humanix-academie.fr";
  const webhookUrl = `${proto}://${host}/api/payments/webhook`;

  let subscriptionId: string | null = null;
  try {
    const sub = await createSubscriptionForCustomer({
      customerId: payment.customerId,
      amount: pricing.amount,
      interval: pricing.interval,
      description: pricing.description,
      webhookUrl,
      metadata: {
        tenantId: md.tenantId ?? "anonymous-inscription",
        plan: planRaw,
        billing,
        seats: String(seatsRaw),
      },
    });
    subscriptionId = sub.id;
  } catch (e) {
    return {
      tenantId: null,
      status: "error",
      errorMessage: `subscription_create_failed:${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // 2. Cas tenant existant : on met juste a jour
  let tenantId = md.tenantId && md.tenantId !== "anonymous-inscription"
    ? md.tenantId
    : null;
  if (tenantId) {
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        paymentProvider: "mollie",
        paymentCustomerId: payment.customerId,
        paymentSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        plan: planRaw,
      },
    });
    return { tenantId, status: "applied", errorMessage: null };
  }

  // 3. Cas inscription anonyme : on provisionne tenant + ADMIN + magic link
  const customer = payment.customerId
    ? await getMollieCustomer(payment.customerId)
    : null;
  const email = customer?.email?.trim().toLowerCase();
  const orgName = md.organization ?? customer?.name ?? "Nouvelle entreprise";

  if (!email) {
    return {
      tenantId: null,
      status: "error",
      errorMessage: "customer_email_unresolved",
    };
  }

  const result = await provisionTenantWithAdmin({
    email,
    organizationName: orgName,
    plan: planRaw,
    paymentCustomerId: payment.customerId,
    paymentSubscriptionId: subscriptionId ?? undefined,
    subscriptionStatus: "active",
    source: "mollie-webhook",
  });

  if (!result.ok) {
    return {
      tenantId: null,
      status: "error",
      errorMessage: `provisioning_failed:${result.reason}`,
    };
  }

  tenantId = result.tenantId;

  if (result.created) {
    // Magic link de bienvenue (non-bloquant si echec : l'admin peut
    // recuperer via /connexion -> magic link manuel).
    try {
      await signIn("nodemailer", {
        email,
        redirect: false,
        redirectTo: "/post-login",
      });
    } catch (e) {
      console.error(
        "[mollie-webhook] welcome magic link failed (non-blocking)",
        e,
      );
    }
  }

  return { tenantId, status: "applied", errorMessage: null };
}

/**
 * Subscription event : Mollie n'envoie un webhook pour subscription qu'en
 * cas d'annulation forcee (3 echecs paiement consecutifs par ex.). On
 * rebascule alors le tenant sur starter.
 */
async function handleSubscriptionEvent(subscriptionId: string) {
  // Pour fetch une subscription Mollie il faut le customerId. On le retrouve
  // via notre BDD (Tenant.paymentSubscriptionId).
  const tenant = await db.tenant.findFirst({
    where: { paymentSubscriptionId: subscriptionId },
    select: { id: true, paymentCustomerId: true },
  });

  if (!tenant || !tenant.paymentCustomerId) {
    return NextResponse.json({ received: true, unknown_subscription: true });
  }

  const sub = await getSubscription(tenant.paymentCustomerId, subscriptionId);
  if (!sub) {
    return NextResponse.json({ received: true, not_found: true });
  }

  const eventKey = `${subscriptionId}_${sub.status}`;
  const existing = await db.billingEvent.findUnique({
    where: { providerEventId: eventKey },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const newStatus = mollieStatusToSubscription(sub.status);
  await db.tenant.update({
    where: { id: tenant.id },
    data:
      newStatus === "canceled"
        ? {
            subscriptionStatus: "canceled",
            plan: "starter",
            paymentSubscriptionId: null,
            currentPeriodEnd: null,
            seatCount: null,
          }
        : { subscriptionStatus: newStatus },
  });

  await db.billingEvent.create({
    data: {
      provider: "mollie",
      providerEventId: eventKey,
      type: `subscription.${sub.status}`,
      tenantId: tenant.id,
      payload: sub as unknown as object,
      status: "applied",
      errorMessage: null,
      providerCreatedAt: new Date(),
    },
  });

  if (newStatus === "canceled") {
    await auditLog({
      action: AuditActions.BILLING_SUBSCRIPTION_CANCELED,
      actor: { email: "mollie-webhook" },
      tenantId: tenant.id,
      target: { type: "subscription", id: tenant.id, label: subscriptionId },
      message: `Mollie subscription canceled`,
      metadata: { subscriptionId },
    });
  }

  return NextResponse.json({ received: true });
}
