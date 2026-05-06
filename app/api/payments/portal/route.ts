// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/payments/portal
//
// Payplug n'expose pas de Customer Portal hosted comme Stripe. Pour la
// gestion d'abonnement on utilise donc :
//  - update CB : URL Payplug dediee si dispo (fonction createPaymentMethod
//    UpdateUrl), sinon retombe sur un message dans la page interne
//  - annulation : POST /api/payments/cancel cote app (ci-dessous)
//
// Cette route renvoie une URL d'update CB OU un payload {fallback: true}
// pour indiquer au front d'afficher le portail interne.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isPayplugConfigured,
  createPaymentMethodUpdateUrl,
} from "@/lib/payplug";
import { auditLog, AuditActions } from "@/lib/audit";

export async function POST() {
  if (!isPayplugConfigured()) {
    return NextResponse.json(
      { error: "Le module de paiement n'est pas configuré." },
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
  if (!tenant?.paymentSubscriptionId) {
    return NextResponse.json(
      {
        error:
          "Aucun abonnement actif lié à ce tenant. Souscrivez d'abord un plan.",
      },
      { status: 404 },
    );
  }

  const baseUrl =
    process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const url = await createPaymentMethodUpdateUrl({
    subscriptionId: tenant.paymentSubscriptionId,
    successUrl: `${baseUrl}/profil/facturation`,
  });

  await auditLog({
    action: AuditActions.BILLING_PORTAL_ACCESSED,
    actor: {
      userId: session.user.id,
      email: session.user.email as string | undefined,
      role,
    },
    tenantId,
    message: url
      ? "Acces portail Payplug update CB"
      : "Tentative portail Payplug — fallback interne",
  });

  if (url) {
    return NextResponse.json({ url });
  }
  // Fallback : Payplug ne supporte pas l'update CB hosted -> le front
  // affichera la page interne qui propose l'annulation.
  return NextResponse.json({ fallback: true });
}
