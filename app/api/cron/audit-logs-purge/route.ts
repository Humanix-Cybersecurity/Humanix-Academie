// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : purge globale des AuditLog au-delà de la fenêtre CNIL
// (~13 mois pour les logs sécurité).
//
// IMPORTANT — distinction avec /api/cron/data-retention-purge :
//   - data-retention-purge applique la rétention CONFIGURÉE PAR TENANT
//     (Tenant.dataRetentionDays) avec une whitelist d'actions critiques
//     conservées indéfiniment (BILLING_*, USER_DELETED…).
//   - audit-logs-purge applique une rétention GLOBALE (toutes actions
//     confondues) au-delà de 400j par défaut. C'est un filet de sécurité
//     pour les tenants qui n'ont PAS configuré de rétention.
//
// Frequence recommandee : 1x/jour (apres 04:00 UTC, juste apres la
// data-retention-purge tenant-level).
//
// Auth : header X-Cron-Secret == process.env.CRON_SECRET. Refus 403 sinon.

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// 13 mois ≈ 400 jours. Override possible via query param ?days=N.
const DEFAULT_DAYS = 400;

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

async function purge(days: number) {
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  const result = await db.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { cutoff, deleted: result.count, days };
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const days = parseInt(
    req.nextUrl.searchParams.get("days") ?? String(DEFAULT_DAYS),
    10,
  );
  const safeDays = Number.isFinite(days) && days >= 30 ? days : DEFAULT_DAYS;
  const r = await purge(safeDays);
  return NextResponse.json({ ok: true, ...r });
}

export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const days = parseInt(
    req.nextUrl.searchParams.get("days") ?? String(DEFAULT_DAYS),
    10,
  );
  const safeDays = Number.isFinite(days) && days >= 30 ? days : DEFAULT_DAYS;
  const r = await purge(safeDays);
  return NextResponse.json({ ok: true, ...r });
}
