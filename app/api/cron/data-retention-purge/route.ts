// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : purge quotidienne des données au-delà de la rétention
// configurée par tenant (Tenant.dataRetentionDays). RGPD art. 5.1.e.
//
// Pour chaque tenant ayant dataRetentionDays != null, on appelle
// executePurge() qui DELETE Event/AuditLog non-critiques > seuil et
// ANONYMIZE les Users inactifs > seuil. Voir lib/data-retention.ts.
//
// Fréquence recommandée : 1x/jour (ex. 03:00 UTC). Idempotent - si tu le
// rejoues sur la même journée, les counts seront 0 au 2e passage.
//
// Auth : header X-Cron-Secret == process.env.CRON_SECRET (16 chars min).
// Refus 403 sinon. Même secret que /api/cron/cyber-event-tick.

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { executePurge } from "@/lib/data-retention";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function verifySecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || expected.length < 16) return false;
  if (!provided || provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

type RunSummary = {
  tenantsScanned: number;
  tenantsPurged: number;
  totalEventsDeleted: number;
  totalAuditLogsDeleted: number;
  totalUsersAnonymized: number;
  errors: { tenantId: string; reason: string }[];
};

async function runPurgeForAllTenants(): Promise<RunSummary> {
  const tenants = await db.tenant.findMany({
    where: { dataRetentionDays: { not: null } },
    select: { id: true },
  });

  const summary: RunSummary = {
    tenantsScanned: tenants.length,
    tenantsPurged: 0,
    totalEventsDeleted: 0,
    totalAuditLogsDeleted: 0,
    totalUsersAnonymized: 0,
    errors: [],
  };

  for (const t of tenants) {
    try {
      const r = await executePurge(t.id, { automated: true });
      if (
        r.eventsDeleted > 0 ||
        r.auditLogsDeleted > 0 ||
        r.usersAnonymized > 0
      ) {
        summary.tenantsPurged++;
      }
      summary.totalEventsDeleted += r.eventsDeleted;
      summary.totalAuditLogsDeleted += r.auditLogsDeleted;
      summary.totalUsersAnonymized += r.usersAnonymized;
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error(
        `[data-retention-purge] tenant ${t.id} failed`,
        e,
      );
      summary.errors.push({ tenantId: t.id, reason });
    }
  }

  return summary;
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await runPurgeForAllTenants();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await runPurgeForAllTenants();
  return NextResponse.json({ ok: true, ...result });
}
