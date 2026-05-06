// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers de lecture pour l'AuditLog : filtres + pagination + export CSV.
import { db } from "@/lib/db";
import type { AuditAction, AuditOutcome, AuditSeverity } from "@prisma/client";

export type AuditQuery = {
  tenantId?: string | null;
  action?: AuditAction;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  actorUserId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  cursor?: string; // id du dernier element pour cursor pagination
};

export async function listAuditLogs(q: AuditQuery) {
  const where: Record<string, unknown> = {};
  if (q.tenantId !== undefined) where.tenantId = q.tenantId;
  if (q.action) where.action = q.action;
  if (q.severity) where.severity = q.severity;
  if (q.outcome) where.outcome = q.outcome;
  if (q.actorUserId) where.actorUserId = q.actorUserId;
  if (q.fromDate || q.toDate) {
    where.createdAt = {
      ...(q.fromDate ? { gte: q.fromDate } : {}),
      ...(q.toDate ? { lte: q.toDate } : {}),
    };
  }
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
  const rows = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1, // +1 pour savoir s'il y a une page suivante
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}

/**
 * Export CSV "RFC 4180" - safe pour Excel FR (separateur ; comme par defaut
 * en France, BOM UTF-8 pour conserver les accents).
 */
export function toCsv(
  rows: {
    createdAt: Date;
    action: string;
    outcome: string;
    severity: string;
    tenantId: string | null;
    actorEmail: string | null;
    actorRole: string | null;
    targetType: string | null;
    targetLabel: string | null;
    ipHash: string | null;
    message: string | null;
  }[],
): string {
  const header = [
    "Date",
    "Action",
    "Outcome",
    "Severite",
    "Tenant",
    "Acteur",
    "Role",
    "Cible (type)",
    "Cible (label)",
    "IP hash",
    "Message",
  ];
  const lines = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.action,
      r.outcome,
      r.severity,
      r.tenantId ?? "",
      r.actorEmail ?? "",
      r.actorRole ?? "",
      r.targetType ?? "",
      r.targetLabel ?? "",
      r.ipHash ?? "",
      r.message ?? "",
    ]
      .map(escapeCsv)
      .join(";"),
  );
  return "﻿" + [header.map(escapeCsv).join(";"), ...lines].join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
