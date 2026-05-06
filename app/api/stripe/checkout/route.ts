// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/stripe/checkout
//
// Cree une Stripe Checkout Session pour un plan donne et redirige l'admin
// du tenant vers la page de paiement Stripe. Au retour (success), Stripe
// nous notifie via webhook (cf. /api/stripe/webhook) qui met a jour le
// Tenant.plan + subscriptionStatus.
//
// Securite :
//  - Auth requise (role ADMIN ou RSSI ou SUPERADMIN)
//  - Rate limit par tenant (5 sessions/heure pour eviter spam Stripe)
//  - Plan demande verifie contre STRIPE_BUYABLE_PLANS
//  - Reutilise le stripeCustomerId existant si deja lie au tenant
//    (sinon Stripe le creera automatiquement)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getStripe,
  isStripeConfigured,
  isPlanBuyable,
  priceIdForPlan,
} from "@/lib/stripe";
import { isPlanId } from "@/lib/plans";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe n'est pas configuré sur cette instance." },
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
  const rl = checkRateLimit(`stripe-checkout:${tenantId}`, 5, 60 * 60 * 1000);
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

  const priceId = priceIdForPlan(planRaw)!;
  const stripe = getStripe();

  const baseUrl =
    process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reutilise le customer existant si deja lie. Sinon Stripe en cree un
      // et on le recuperera via le webhook customer.subscription.created.
      customer: tenant.stripeCustomerId ?? undefined,
      customer_email: tenant.stripeCustomerId ? undefined : userEmail,
      // Metadonnees : on pose tenantId et plan demande pour les retrouver
      // dans le webhook quand customer n'est pas encore connu.
      metadata: {
        tenantId,
        plan: planRaw,
      },
      subscription_data: {
        metadata: {
          tenantId,
          plan: planRaw,
        },
      },
      // URLs de retour
      success_url: `${baseUrl}/profil/facturation?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/tarifs?canceled=1`,
      // RGPD : on demande la collecte VAT pour les clients pro UE
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: false }, // a activer une fois Stripe Tax configure
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });
    return NextResponse.json({ url: checkout.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "erreur Stripe";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
