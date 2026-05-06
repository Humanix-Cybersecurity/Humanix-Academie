// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/payments/checkout
//
// Cree une session de paiement chez le prestataire (Payplug FR par defaut).
// Auth : ADMIN/RSSI/SUPERADMIN du tenant. Rate limit 5/h/tenant.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  isPayplugConfigured,
  isPlanBuyable,
  payplugPlanIdForTier,
  createCheckoutSession,
} from "@/lib/payplug";
import { isPlanId } from "@/lib/plans";

export async function POST(req: Request) {
  if (!isPayplugConfigured()) {
    return NextResponse.json(
      { error: "Le module de paiement n'est pas configuré sur cette instance." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Seul un administrateur peut souscrire un plan." },
      { status: 403 },
    );
  }
  const tenantId = session.user.tenantId;
  const userEmail = session.user.email;
  if (!tenantId || !userEmail) {
    return NextResponse.json({ error: "Session invalide." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const planRaw = String(body?.plan ?? "");
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

  // Rate limit par tenant
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

  const planId = payplugPlanIdForTier(planRaw);
  if (!planId) {
    return NextResponse.json(
      { error: "Plan non configuré côté provider." },
      { status: 500 },
    );
  }

  const baseUrl =
    process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const checkout = await createCheckoutSession({
      customerId: tenant.paymentCustomerId ?? undefined,
      customerEmail: userEmail,
      planId,
      tenantId,
      appPlanId: planRaw,
      successUrl: `${baseUrl}/profil/facturation?success=1&session_id=${tenantId}`,
      cancelUrl: `${baseUrl}/tarifs?canceled=1`,
      metadata: {
        tenantId,
        appPlanId: planRaw,
      },
    });
    // Si Payplug a cree un customer juste maintenant, on le persiste
    if (checkout.customer?.id && !tenant.paymentCustomerId) {
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          paymentProvider: "payplug",
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
