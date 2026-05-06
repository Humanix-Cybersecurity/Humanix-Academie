// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /admin/audit/export - telecharge le journal d'audit du tenant en CSV.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAuditLogs, toCsv } from "@/lib/audit-query";
import { auditLog, AuditActions } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Reserve aux administrateurs." }, { status: 403 });
  }
  const tenantId = session.user.tenantId as string;

  const { items } = await listAuditLogs({ tenantId, limit: 500 });
  const csv = toCsv(
    items.map((i) => ({
      createdAt: i.createdAt,
      action: i.action,
      outcome: i.outcome,
      severity: i.severity,
      tenantId: i.tenantId,
      actorEmail: i.actorEmail,
      actorRole: i.actorRole,
      targetType: i.targetType,
      targetLabel: i.targetLabel,
      ipHash: i.ipHash,
      message: i.message,
    })),
  );

  await auditLog({
    action: AuditActions.EVIDENCE_BUNDLE_EXPORTED,
    actor: {
      userId: session.user.id,
      email: session.user.email as string | undefined,
      role,
    },
    tenantId,
    target: { type: "audit_export", id: "csv", label: "Journal audit CSV" },
    metadata: { rowCount: items.length },
  });

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${today}.csv"`,
    },
  });
}
