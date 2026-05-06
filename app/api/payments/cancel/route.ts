// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/payments/cancel
// Annule l'abonnement Payplug du tenant courant.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPayplugConfigured, cancelSubscription } from "@/lib/payplug";
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
    return NextResponse.json({ error: "Aucun abonnement actif." }, { status: 404 });
  }

  try {
    await cancelSubscription(tenant.paymentSubscriptionId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erreur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Le webhook subscription.canceled mettra a jour le tenant. En attendant
  // on logue l'action utilisateur.
  await auditLog({
    action: AuditActions.BILLING_SUBSCRIPTION_CANCELED,
    actor: {
      userId: session.user.id,
      email: session.user.email as string | undefined,
      role,
    },
    tenantId,
    target: {
      type: "subscription",
      id: tenant.paymentSubscriptionId,
      label: "Annulation par admin",
    },
  });

  return NextResponse.json({ ok: true });
}
