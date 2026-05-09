// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : reevaluation quotidienne des achievements (badges)
// pour TOUS les users actifs.
//
// Cas d'usage : on a ajoute de nouveaux badges au catalogue, ou un
// badge depend de la date courante (ex. "cybermois_participant" qui
// ne se debloque qu'en octobre). Le cron rattrape les badges qui
// auraient pu etre rates a la volee.
//
// Frequence recommandee : 1x/jour (idealement la nuit, ex 03:30 UTC,
// apres le snapshot de risque).
//
// SECURITE : pas de session NextAuth. Auth via secret partage
// CRON_SECRET, comparaison constante (timing-safe).

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { reEvaluateAllUsers } from "@/lib/achievements/evaluate";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // tolere ~ 100 users sequentiels

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
  const result = await reEvaluateAllUsers();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await reEvaluateAllUsers();
  return NextResponse.json({ ok: true, ...result });
}
