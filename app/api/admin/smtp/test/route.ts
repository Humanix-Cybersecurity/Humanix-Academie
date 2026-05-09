// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/admin/smtp/test
//
// Teste la connexion SMTP du tenant courant (handshake + auth, pas
// d'envoi reel). Le resultat est aussi sauve dans TenantSmtpConfig
// (isVerified, lastVerifiedAt, lastError) pour affichage dans la UI.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { auditLog, AuditActions } from "@/lib/audit";
import { testTenantSmtp } from "@/lib/smtp/sender";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;
  if (!tenantId) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }

  const result = await testTenantSmtp(tenantId);

  await auditLog({
    action: AuditActions.TENANT_SMTP_TESTED,
    outcome: result.ok ? "SUCCESS" : "FAILURE",
    actor: {
      userId: session.user!.id as string,
      email: (session.user!.email as string) ?? "",
      role,
    },
    tenantId,
    metadata: result.ok
      ? { latencyMs: result.latencyMs }
      : { reason: result.reason, details: result.details },
  });

  return NextResponse.json(result);
}
