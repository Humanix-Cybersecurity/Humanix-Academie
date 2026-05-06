// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/stripe/portal
//
// Cree une session du Stripe Customer Portal et redirige l'admin vers
// l'interface Stripe pour gerer son abonnement (changer plan, mettre a
// jour la CB, telecharger les factures, annuler).
//
// L'auth est requise + role ADMIN/RSSI/SUPERADMIN. Le tenant doit avoir
// un stripeCustomerId (sinon il n'a jamais paye, on renvoie 404).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe n'est pas configuré." },
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
      { error: "Réservé aux administrateurs." },
      { status: 403 },
    );
  }
  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Session invalide." }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "Aucun abonnement Stripe lié à ce tenant. Souscrivez d'abord un plan.",
      },
      { status: 404 },
    );
  }

  const baseUrl =
    process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${baseUrl}/profil/facturation`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "erreur Stripe";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
