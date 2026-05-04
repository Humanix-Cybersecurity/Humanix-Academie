// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/v1/conformity-score — score global de conformite cyber humaine
import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authenticateApiKey(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  const [users, saisons, allProgress] = await Promise.all([
    db.user.findMany({
      where: { tenantId: a.tenantId!, isActive: true, role: "LEARNER" },
    }),
    // Multi-tenant : saisons globales + custom du tenant uniquement
    db.saison.findMany({
      where: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId: a.tenantId! }],
      },
      include: { episodes: true },
    }),
    db.progress.findMany({
      where: { tenantId: a.tenantId!, status: "COMPLETED" },
    }),
  ]);

  const totalSeats = users.length;
  const totalEpisodes = saisons.reduce((s, sa) => s + sa.episodes.length, 0);
  const seenAtLeastOne = new Set(allProgress.map((p) => p.userId)).size;
  const activationRate =
    totalSeats === 0 ? 0 : Math.round((seenAtLeastOne / totalSeats) * 100);
  const conformityScore = Math.round(
    activationRate * 0.4 +
      (allProgress.length / Math.max(totalEpisodes * totalSeats, 1)) *
        100 *
        0.6,
  );

  return NextResponse.json({
    data: {
      conformityScore,
      activationRate,
      totalSeats,
      activatedSeats: seenAtLeastOne,
      completedEpisodes: allProgress.length,
      totalEpisodes: totalEpisodes * totalSeats,
      verdict:
        conformityScore >= 80
          ? "EXCELLENT"
          : conformityScore >= 50
            ? "CORRECT"
            : "À AMÉLIORER",
      computedAt: new Date().toISOString(),
    },
    meta: { tenantId: a.tenantId },
  });
}
