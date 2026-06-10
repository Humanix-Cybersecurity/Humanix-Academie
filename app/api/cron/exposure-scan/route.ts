// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Cron : veille d'exposition B2B (Phase 2). DÉTECTION seulement.
//
// GATE GLOBALE : si EXPOSURE_B2B_ENABLED != "true", ce cron est INERTE et
// renvoie immédiatement (kill switch plateforme). Sinon, il scanne les
// tenants dont la veille est active (triple garde individuelle vérifiée dans
// scanTenantDomainExposure) et crée des EmployeeExposure NEW. Il n'envoie
// AUCUNE notification et n'assigne AUCUNE formation (validation RSSI requise).
//
// Fréquence cible : 1×/jour suffit (les fuites publiques bougent lentement).

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isB2bGloballyEnabled } from "@/lib/exposure/b2b-flags";
import { scanTenantDomainExposure } from "@/lib/exposure/b2b-scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

async function checkAuth(req: Request): Promise<boolean> {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && safeEqual(cronSecret, process.env.CRON_SECRET ?? "")) {
    return true;
  }
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "RSSI" || role === "SUPERADMIN";
}

export async function POST(req: Request) {
  if (!(await checkAuth(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // GATE GLOBALE : kill switch plateforme.
  if (!isB2bGloballyEnabled()) {
    return NextResponse.json({
      ok: true,
      globallyEnabled: false,
      message: "Veille B2B desactivee au niveau plateforme (EXPOSURE_B2B_ENABLED).",
      scanned: 0,
    });
  }

  // Tenants candidats (le détail de la triple garde est revérifié par tenant).
  const tenants = await db.tenant.findMany({
    where: {
      exposureMonitoringEnabled: true,
      exposureMonitoringDpaSignedAt: { not: null },
    },
    select: { id: true },
    take: 200,
  });

  let totalNew = 0;
  const results = [];
  for (const t of tenants) {
    const r = await scanTenantDomainExposure(t.id);
    totalNew += r.newExposures;
    results.push(r);
  }

  return NextResponse.json({
    ok: true,
    globallyEnabled: true,
    scanned: tenants.length,
    totalNewExposures: totalNew,
  });
}

/** GET = preview du nombre de tenants éligibles (sans scanner). */
export async function GET(req: Request) {
  if (!(await checkAuth(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const eligible = await db.tenant.count({
    where: {
      exposureMonitoringEnabled: true,
      exposureMonitoringDpaSignedAt: { not: null },
    },
  });
  return NextResponse.json({
    globallyEnabled: isB2bGloballyEnabled(),
    eligibleTenants: eligible,
  });
}
