// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/payments/checkout/start
//
// Endpoint ANONYME (pas d'auth requise) pour démarrer une souscription
// Payplug avant la création du tenant. Workflow :
//
//   1. User sur /tarifs → choisit un plan payant (solo/essentielle/pro) et
//      remplit email + organisation sur /souscrire.
//   2. Le form POST ici → on crée un Payplug Customer (via createCustomer)
//      puis une Subscription pour ce customer (createCheckoutSession).
//      L'organisation est stockée en metadata côté Payplug.
//   3. On renvoie l'URL Payplug (hosted_payment) → user redirige et paye.
//   4. Payplug envoie le webhook subscription.created → handler
//      app/api/payments/webhook/route.ts détecte qu'aucun tenant ne
//      correspond au customer_id, lit l'email via Payplug API,
//      provisionne tenant + ADMIN + magic link de bienvenue.
//
// Sécurité :
//   - Anonyme par design (l'auth n'a pas de sens avant l'inscription)
//   - Rate limit par IP : 5 starts / heure
//   - Validation des inputs côté serveur
//   - Refuse les plans non buyable (premium → /demande-abonnement)
//   - Email écrasable côté Payplug si déjà customer (Payplug gère)
//
// Cf. docs/DEPLOYMENT_RUNBOOK.md section D pour la configuration.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  isPayplugConfigured,
  isPlanBuyable,
  payplugPlanIdForTier,
  createCheckoutSession,
} from "@/lib/payplug";
import { isPlanId } from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type StartRequest = {
  plan?: string;
  email?: string;
  organization?: string;
  seats?: number;
};

export async function POST(req: Request) {
  if (!isPayplugConfigured()) {
    return NextResponse.json(
      {
        error:
          "Le module de paiement n'est pas encore configuré. Utilisez /demande-abonnement.",
      },
      { status: 503 },
    );
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`checkout-start:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error:
          "Trop de tentatives. Réessayez dans quelques minutes ou contactez-nous.",
      },
      { status: 429 },
    );
  }

  let body: StartRequest;
  try {
    body = (await req.json()) as StartRequest;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const planRaw = String(body.plan ?? "").trim();
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const organization = String(body.organization ?? "").trim();
  const seats =
    typeof body.seats === "number" && body.seats > 0
      ? Math.floor(body.seats)
      : null;

  if (!email || !email.includes("@") || email.length > 254) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (organization.length < 2 || organization.length > 120) {
    return NextResponse.json(
      { error: "Nom d'organisation invalide (2-120 caractères)." },
      { status: 400 },
    );
  }
  if (!isPlanId(planRaw)) {
    return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
  }
  if (!isPlanBuyable(planRaw)) {
    return NextResponse.json(
      {
        error:
          "Ce plan n'est pas disponible en self-service. Utilisez /demande-abonnement pour les besoins enterprise (instance dédiée, +250 sièges).",
      },
      { status: 400 },
    );
  }

  const planId = payplugPlanIdForTier(planRaw);
  if (!planId) {
    return NextResponse.json(
      {
        error: "Plan non configuré côté provider. Contactez le support.",
      },
      { status: 500 },
    );
  }

  const baseUrl =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  try {
    // Pas de tenantId à ce stade — on passe un placeholder reconnaissable
    // par le webhook ("anonymous-inscription") et on stocke l'organisation
    // + l'email + le plan dans metadata pour que le webhook puisse créer
    // le bon tenant.
    const checkout = await createCheckoutSession({
      customerEmail: email,
      planId,
      tenantId: "anonymous-inscription",
      appPlanId: planRaw,
      successUrl: `${baseUrl}/souscrire/succes?plan=${encodeURIComponent(planRaw)}`,
      cancelUrl: `${baseUrl}/tarifs?canceled=1`,
      metadata: {
        mode: "anonymous-inscription",
        appPlanId: planRaw,
        organization,
        email,
        seatsRequested: seats != null ? String(seats) : "",
      },
    });
    return NextResponse.json({
      url: checkout.hosted_payment.payment_url,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Erreur lors du démarrage du paiement.";
    console.error("[checkout/start] failed", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
