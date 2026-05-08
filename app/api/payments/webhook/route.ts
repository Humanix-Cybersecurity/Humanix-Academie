// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/payments/webhook
//
// Recoit les events Payplug (subscription.*, payment.*) et synchronise
// l'etat du Tenant en BDD. Idempotent via BillingEvent.providerEventId.
//
// Securite :
//  - Verification HMAC-SHA256 de la signature Payplug
//  - Pas d'auth user : c'est Payplug qui appelle
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import {
  verifyWebhookSignature,
  PAYPLUG_SIGNATURE_HEADER,
  tierFromPayplugPlanId,
  getCustomer,
  type PayplugWebhookEvent,
} from "@/lib/payplug";
import { provisionTenantWithAdmin } from "@/lib/tenant-provisioning";
import { signIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const h = await headers();
  const sig = h.get(PAYPLUG_SIGNATURE_HEADER);
  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, sig)) {
    return NextResponse.json({ error: "signature_invalide" }, { status: 400 });
  }

  let event: PayplugWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayplugWebhookEvent;
  } catch {
    return NextResponse.json({ error: "payload_invalide" }, { status: 400 });
  }

  // Idempotence
  const existing = await db.billingEvent.findUnique({
    where: { providerEventId: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let status: "applied" | "ignored" | "error" = "ignored";
  let errorMessage: string | null = null;
  let tenantId: string | null = null;

  try {
    const obj = event.data?.object as Record<string, unknown> | undefined;
    const metadata =
      (obj?.metadata as Record<string, string> | undefined) ?? {};
    tenantId = metadata.tenantId ?? null;
    if (!tenantId && typeof obj?.customer_id === "string") {
      const t = await db.tenant.findUnique({
        where: { paymentCustomerId: obj.customer_id as string },
        select: { id: true },
      });
      tenantId = t?.id ?? null;
    }

    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.activated": {
        const planId =
          (obj?.subscription_plan_id as string | undefined) ??
          (obj?.plan_id as string | undefined);
        const newTier = planId ? tierFromPayplugPlanId(planId) : null;

        // Cas Phase 3b : pas de tenant existant pour ce customer = paiement
        // anonyme via /tarifs (Payplug Checkout sans auth préalable). On
        // provisionne un tenant + ADMIN à la volée + magic link de bienvenue.
        // Pré-requis : le payload contient customer_id ; on récupère l'email
        // via Payplug API (les events webhook ne portent pas l'email).
        if (
          !tenantId &&
          event.type === "subscription.created" &&
          newTier &&
          typeof obj?.customer_id === "string"
        ) {
          const customer = await getCustomer(obj.customer_id as string);
          const email = customer?.email?.trim().toLowerCase();
          // organization name : metadata > customer last_name > "Nouvelle entreprise"
          const orgName =
            metadata.organization ??
            (customer?.last_name && customer?.first_name
              ? `${customer.first_name} ${customer.last_name}`.trim()
              : null) ??
            "Nouvelle entreprise";
          if (email) {
            const result = await provisionTenantWithAdmin({
              email,
              organizationName: orgName,
              plan: newTier,
              adminName: customer?.first_name ?? undefined,
              paymentCustomerId: obj.customer_id as string,
              paymentSubscriptionId: (obj?.id as string) ?? undefined,
              source: "payplug-webhook",
            });
            if (result.ok) {
              tenantId = result.tenantId;
              if (result.created) {
                // Magic link de bienvenue : signIn nodemailer envoie
                // l'email via Scaleway TEM. Le user click → atterrit sur
                // /admin (post-login redirect par rôle, Phase 4).
                try {
                  await signIn("nodemailer", {
                    email,
                    redirect: false,
                    redirectTo: "/admin",
                  });
                } catch (e) {
                  // Non-bloquant : l'admin peut récupérer son accès via
                  // /connexion → magic link manuel.
                  console.error(
                    "[webhook] welcome magic link send failed (non-blocking)",
                    e,
                  );
                }
              }
              status = "applied";
            } else {
              errorMessage = `provisioning_failed:${result.reason}`;
              status = "error";
            }
          } else {
            errorMessage = "customer_email_unresolved";
            status = "error";
          }
          break;
        }

        // Cas usuel : tenant existant, on met à jour l'état billing.
        if (tenantId) {
          await db.tenant.update({
            where: { id: tenantId },
            data: {
              paymentProvider: "payplug",
              paymentSubscriptionId: (obj?.id as string) ?? null,
              paymentCustomerId:
                (obj?.customer_id as string | undefined) ?? undefined,
              subscriptionStatus:
                (obj?.status as string | undefined) ?? "active",
              currentPeriodEnd: obj?.next_payment_at
                ? new Date((obj.next_payment_at as number) * 1000)
                : null,
              ...(newTier ? { plan: newTier } : {}),
            },
          });
          status = "applied";
        }
        break;
      }

      case "subscription.canceled":
      case "subscription.cancelled": {
        if (tenantId) {
          await db.tenant.update({
            where: { id: tenantId },
            data: {
              subscriptionStatus: "canceled",
              plan: "trial",
              paymentSubscriptionId: null,
              currentPeriodEnd: null,
              trialEndsAt: null,
              seatCount: null,
            },
          });
          status = "applied";
        }
        break;
      }

      case "payment.failed":
      case "subscription.payment_failed": {
        if (tenantId) {
          await db.tenant.update({
            where: { id: tenantId },
            data: { subscriptionStatus: "past_due" },
          });
          status = "applied";
        }
        break;
      }

      case "payment.paid":
      case "subscription.payment_succeeded": {
        if (tenantId) {
          await db.tenant.update({
            where: { id: tenantId },
            data: { subscriptionStatus: "active" },
          });
          status = "applied";
        }
        break;
      }

      default:
        status = "ignored";
    }
  } catch (err: unknown) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  await db.billingEvent.create({
    data: {
      provider: "payplug",
      providerEventId: event.id,
      type: event.type,
      tenantId,
      payload: event as unknown as object,
      status,
      errorMessage,
      providerCreatedAt: new Date((event.created_at ?? 0) * 1000),
    },
  });

  // AuditLog conformite
  if (status === "applied" && tenantId) {
    const auditAction =
      event.type.startsWith("subscription.created") ||
      event.type === "subscription.activated"
        ? AuditActions.BILLING_SUBSCRIPTION_CREATED
        : event.type === "subscription.updated"
          ? AuditActions.BILLING_SUBSCRIPTION_UPDATED
          : event.type.startsWith("subscription.cancel")
            ? AuditActions.BILLING_SUBSCRIPTION_CANCELED
            : event.type === "payment.failed" ||
                event.type === "subscription.payment_failed"
              ? AuditActions.BILLING_PAYMENT_FAILED
              : null;
    if (auditAction) {
      await auditLog({
        action: auditAction,
        actor: { email: "payplug-webhook" },
        tenantId,
        target: { type: "subscription", id: tenantId, label: event.type },
        message: `Payplug event ${event.type}`,
        metadata: { providerEventId: event.id },
      });
    }
  }

  if (status === "error") {
    return NextResponse.json(
      { error: errorMessage ?? "erreur" },
      { status: 500 },
    );
  }
  return NextResponse.json({ received: true });
}
