// SPDX-License-Identifier: AGPL-3.0-or-later
// Endpoint de cron pour rafraîchir l'observatoire des fuites.
//
// SECURITE : pas de session NextAuth (les crons ne sont pas auth user).
// On utilise un secret partagé via header :
//
//   curl -H "x-cron-secret: $CRON_SECRET" https://humanix-cybersecurity.fr/api/cron/breaches-refresh
//
// Configuration recommandée : 1 fois par 6h via cron host (crontab) ou
// via un service externe type cron-job.org / GitHub Actions schedule.
//
// Comparaison constante du secret pour éviter les timing attacks.

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { refreshBreaches } from "@/lib/breaches/repository";

export const dynamic = "force-dynamic";

function verifySecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || expected.length < 16) return false; // refus si secret faible
  if (!provided || provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await refreshBreaches();
  return NextResponse.json(result);
}

// Support GET aussi pour les services qui ne savent que faire des GET.
// SECURITE : le secret passe UNIQUEMENT par le header x-cron-secret — plus
// de fallback `?secret=` en query string (qui fuyait le CRON_SECRET dans les
// access logs HAProxy/Next + l'historique navigateur + le Referer).
// cron-job.org & co. supportent les headers custom.
export async function GET(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await refreshBreaches();
  return NextResponse.json(result);
}
