// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : photo quotidienne du score de risque agrege par tenant.
//
// Frequence recommandee : 1 fois par jour (idealement la nuit, ex 03:00
// UTC pour eviter les pics d'activite).
//
// Configuration cron exemple :
//   - Vercel Cron (vercel.json) : "0 3 * * *"
//   - Scaleway Serverless Cron : 0 3 * * *
//   - cron-job.org : GET https://...?secret=...
//   - GitHub Actions schedule : "0 3 * * *"
//
// SECURITE : pas de session NextAuth (cron sans user). Auth via secret
// partage CRON_SECRET, comparaison constante (timing-safe).

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAllTenantsSnapshot } from "@/lib/analytics/snapshot";

export const dynamic = "force-dynamic";
// Plus long que les autres crons : 100 tenants × 50 users moyens ~= 30s
export const maxDuration = 60;

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

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await recordAllTenantsSnapshot();
  return NextResponse.json({ ok: true, ...result });
}

// Support GET pour les services qui ne savent que faire des GET (cron-job.org gratuit).
// Securite identique : verif du secret en query.
export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await recordAllTenantsSnapshot();
  return NextResponse.json({ ok: true, ...result });
}
