// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/payments/checkout
//
// Cree une session de paiement Mollie. Auth : ADMIN/RSSI/SUPERADMIN du
// tenant. Rate limit 5/h/tenant. Utilise par les tenants existants qui
// upgradent leur plan depuis /profil/facturation ou /admin/billing.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api/require-role";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  isMollieConfigured,
  isPlanBuyable,
  createCheckoutSession,
} from "@/lib/mollie";
import { isPlanId } from "@/lib/plans";

export async function POST(req: Request) {
  if (!isMollieConfigured()) {
    return NextResponse.json(
      { error: "Le module de paiement n'est pas configuré sur cette instance." },
      { status: 503 },
    );
  }

  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const tenantId = session.user.tenantId;
  const userEmail = session.user.email;
  if (!tenantId || !userEmail) {
    return NextResponse.json({ error: "Session invalide." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const planRaw = String(body?.plan ?? "");
  const seats =
    typeof body?.seats === "number" && body.seats > 0
      ? Math.floor(body.seats)
      : null;
  const billing: "monthly" | "annual" =
    body?.billing === "annual" ? "annual" : "monthly";

  if (!isPlanId(planRaw)) {
    return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
  }
  if (!isPlanBuyable(planRaw)) {
    return NextResponse.json(
      {
        error:
          "Ce plan n'est pas disponible à l'achat en self-service. Contactez-nous pour un devis.",
      },
      { status: 400 },
    );
  }

  const rl = checkRateLimit(`payments-checkout:${tenantId}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429 },
    );
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable." }, { status: 404 });
  }

  const effectiveSeats =
    planRaw === "starter" ? 1 : seats ?? tenant.seatCount ?? 1;

  if (planRaw === "pro" && !seats && !tenant.seatCount) {
    return NextResponse.json(
      {
        error:
          "Le nombre de sieges est requis pour le plan Pro.",
      },
      { status: 400 },
    );
  }

  const baseUrl =
    process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const checkout = await createCheckoutSession({
      customerId: tenant.paymentCustomerId ?? undefined,
      customerEmail: userEmail,
      customerName: tenant.name,
      plan: planRaw,
      billing,
      seats: effectiveSeats,
      tenantId,
      successUrl: `${baseUrl}/profil/facturation?success=1`,
      cancelUrl: `${baseUrl}/tarifs?canceled=1`,
      webhookUrl: `${baseUrl}/api/payments/webhook`,
      metadata: {
        tenantId,
      },
    });
    // Mollie a peut-etre cree un customer juste maintenant : on le persiste
    if (checkout.customer?.id && !tenant.paymentCustomerId) {
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          paymentProvider: "mollie",
          paymentCustomerId: checkout.customer.id,
        },
      });
    }
    return NextResponse.json({ url: checkout.hosted_payment.payment_url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "erreur paiement";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
