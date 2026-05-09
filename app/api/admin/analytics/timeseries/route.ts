// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/admin/analytics/timeseries
//
// Renvoie la timeseries du score de risque agrege du tenant courant
// sur N derniers jours (par defaut 90). Utilise par le LineChart du
// dashboard RSSI.
//
// Query params :
//   ?days=90    (entier, 7-365, defaut 90)
//
// Reponse :
//   {
//     ok: true,
//     points: [
//       { day: "2026-02-09", avgScore: 67.4, p10Score: 38, ..., atRiskCount: 4 },
//       ...
//     ],
//     summary: { from: "...", to: "...", current: 71.2, delta30d: +4.8 }
//   }
//
// Auth : NextAuth + role ∈ {ADMIN, RSSI, MANAGER, SUPERADMIN}
// (MANAGER lit en read-only, normal pour le reporting d'equipe)

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantTimeseries } from "@/lib/analytics/snapshot";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (
    role !== "ADMIN" &&
    role !== "RSSI" &&
    role !== "MANAGER" &&
    role !== "SUPERADMIN"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user.tenantId as string;

  const url = new URL(req.url);
  const daysParam = url.searchParams.get("days");
  const daysParsed = daysParam ? parseInt(daysParam, 10) : 90;
  const days = Number.isFinite(daysParsed)
    ? Math.max(7, Math.min(365, daysParsed))
    : 90;

  const points = await getTenantTimeseries(tenantId, days);

  // Summary : score actuel (dernier point) + delta 30j (dernier - point ~30j avant)
  const current = points.length > 0 ? points[points.length - 1].avgScore : null;
  let delta30d: number | null = null;
  if (points.length >= 2) {
    const today = points[points.length - 1];
    // On cherche le point le plus proche de 30j avant le dernier
    const targetDay = new Date(today.day);
    targetDay.setUTCDate(targetDay.getUTCDate() - 30);
    const targetIso = targetDay.toISOString().slice(0, 10);
    const ref = points
      .slice()
      .reverse()
      .find((p) => p.day <= targetIso);
    if (ref) {
      delta30d = Math.round((today.avgScore - ref.avgScore) * 10) / 10;
    }
  }

  return NextResponse.json({
    ok: true,
    points,
    summary: {
      from: points[0]?.day ?? null,
      to: points[points.length - 1]?.day ?? null,
      current: current === null ? null : Math.round(current * 10) / 10,
      delta30d,
      totalPoints: points.length,
    },
  });
}
