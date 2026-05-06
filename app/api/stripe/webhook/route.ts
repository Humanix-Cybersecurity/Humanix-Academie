// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/stripe/webhook
//
// Endpoint qui recoit les events Stripe (subscription.*, invoice.*, etc.)
// et synchronise l'etat du Tenant en BDD.
//
// Securite :
//  - Verification HMAC de la signature Stripe (header `stripe-signature`)
//  - Idempotence via BillingEvent.stripeEventId UNIQUE (replays possibles)
//  - Pas d'auth user : c'est Stripe qui appelle, pas un humain
//
// Events traites :
//  - checkout.session.completed       : nouveau paiement → snap customerId
//  - customer.subscription.created    : creation abonnement → set plan
//  - customer.subscription.updated    : changement plan / renouvellement
//  - customer.subscription.deleted    : resiliation → tenant.plan = trial
//  - invoice.payment_succeeded        : facture OK → confirme period end
//  - invoice.payment_failed           : echec → status=past_due
//
// Pour les autres events on log dans BillingEvent.status="ignored" pour
// la traçabilite mais on ne fait rien.
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Stripe envoie le body en raw, on doit le lire avant de parser
export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook non configure." },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "signature invalide";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Idempotence : si on a deja traite ce stripeEventId, on retourne 200
  // mais on ne refait rien
  const existing = await db.billingEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let status: "applied" | "ignored" | "error" = "ignored";
  let errorMessage: string | null = null;
  let tenantId: string | null = null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const ses = event.data.object as Stripe.Checkout.Session;
        tenantId = (ses.metadata?.tenantId as string | undefined) ?? null;
        if (tenantId && ses.customer) {
          await db.tenant.update({
            where: { id: tenantId },
            data: { stripeCustomerId: ses.customer as string },
          });
          status = "applied";
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        tenantId =
          (sub.metadata?.tenantId as string | undefined) ??
          (await tenantIdFromCustomer(sub.customer as string));
        if (tenantId) {
          const priceId = sub.items?.data[0]?.price?.id;
          const planFromStripe = priceId ? planFromPriceId(priceId) : null;
          await db.tenant.update({
            where: { id: tenantId },
            data: {
              stripeCustomerId: sub.customer as string,
              stripeSubscriptionId: sub.id,
              subscriptionStatus: sub.status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
              seatCount: sub.items?.data[0]?.quantity ?? null,
              ...(planFromStripe ? { plan: planFromStripe } : {}),
            },
          });
          status = "applied";
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        tenantId =
          (sub.metadata?.tenantId as string | undefined) ??
          (await tenantIdFromCustomer(sub.customer as string));
        if (tenantId) {
          // Apres resiliation, on retombe sur trial (pas decouverte car on
          // ne sait pas si c'etait gratuit a l'origine ou un downgrade)
          await db.tenant.update({
            where: { id: tenantId },
            data: {
              subscriptionStatus: "canceled",
              plan: "trial",
              stripeSubscriptionId: null,
              currentPeriodEnd: null,
              trialEndsAt: null,
              seatCount: null,
            },
          });
          status = "applied";
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        tenantId = await tenantIdFromCustomer(inv.customer as string);
        if (tenantId) {
          // Refresh la subscription pour obtenir la nouvelle period_end
          if (inv.subscription) {
            const sub = await stripe.subscriptions.retrieve(
              inv.subscription as string,
            );
            await db.tenant.update({
              where: { id: tenantId },
              data: {
                subscriptionStatus: sub.status,
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
              },
            });
            status = "applied";
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        tenantId = await tenantIdFromCustomer(inv.customer as string);
        if (tenantId) {
          await db.tenant.update({
            where: { id: tenantId },
            data: { subscriptionStatus: "past_due" },
          });
          status = "applied";
        }
        break;
      }

      default:
        // event non traite, on log dans BillingEvent pour debug
        status = "ignored";
    }
  } catch (err: unknown) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  // Audit trail (BillingEvent — historique brut Stripe)
  await db.billingEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
      tenantId,
      payload: event as unknown as object,
      status,
      errorMessage,
      stripeCreatedAt: new Date(event.created * 1000),
    },
  });

  // AuditLog (vue conformite RGPD/NIS2)
  if (status === "applied" && tenantId) {
    const auditAction =
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.created"
        ? AuditActions.BILLING_SUBSCRIPTION_CREATED
        : event.type === "customer.subscription.updated"
          ? AuditActions.BILLING_SUBSCRIPTION_UPDATED
          : event.type === "customer.subscription.deleted"
            ? AuditActions.BILLING_SUBSCRIPTION_CANCELED
            : event.type === "invoice.payment_failed"
              ? AuditActions.BILLING_PAYMENT_FAILED
              : null;
    if (auditAction) {
      await auditLog({
        action: auditAction,
        actor: { email: "stripe-webhook" },
        tenantId,
        target: { type: "subscription", id: tenantId, label: event.type },
        message: `Stripe event ${event.type}`,
        metadata: { stripeEventId: event.id },
      });
    }
  }

  if (status === "error") {
    // On retourne 500 pour que Stripe retry. Si on retourne 200, l'event
    // est marque "delivered" cote Stripe et ne sera plus retente.
    return NextResponse.json(
      { error: errorMessage ?? "erreur" },
      { status: 500 },
    );
  }
  return NextResponse.json({ received: true });
}

async function tenantIdFromCustomer(
  customerId: string | null | undefined,
): Promise<string | null> {
  if (!customerId) return null;
  const t = await db.tenant.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return t?.id ?? null;
}
