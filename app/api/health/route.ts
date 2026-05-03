// Endpoint de health-check léger, utilisé par :
//  - HAProxy (httpchk GET /api/health → expect 200)
//  - Docker healthcheck éventuel
//  - Monitoring externe (UptimeRobot, etc.)
//
// On ne révèle PAS les détails internes (DB version, etc.) pour ne pas
// fingerprint le serveur. On répond juste 200 si tout va bien, 503 sinon.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ping DB minimaliste — vérifie que la connexion Prisma fonctionne
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok" },
      {
        status: 200,
        headers: { "cache-control": "no-store, no-cache" },
      },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded" },
      {
        status: 503,
        headers: { "cache-control": "no-store, no-cache" },
      },
    );
  }
}
