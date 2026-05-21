// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/payments/portal
//
// Mollie n'expose pas de Customer Portal hosted comme Stripe. Pour la
// V1 on retourne systematiquement { fallback: true } : le front affiche
// alors la page interne /profil/facturation avec les options "Annuler"
// + "Mettre a jour la carte = annuler + re-souscrire".
//
// TODO (post-launch) : utiliser Mollie's mandate update flow (sequenceType
// recurring + mandateMethod) pour permettre l'update CB sans re-souscrire.
// Cf. https://docs.mollie.com/payments/recurring#change-payment-method
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMollieConfigured } from "@/lib/mollie";
import { auditLog, AuditActions } from "@/lib/audit";

export async function POST() {
  if (!isMollieConfigured()) {
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

  await auditLog({
    action: AuditActions.BILLING_PORTAL_ACCESSED,
    actor: {
      userId: session.user.id,
      email: session.user.email as string | undefined,
      role,
    },
    tenantId,
    message: "Acces portail facturation Mollie (fallback interne)",
  });

  // Toujours fallback : le front affiche la page interne (annulation
  // + re-souscription = update CB par contournement).
  return NextResponse.json({ fallback: true });
}
