// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/v1/progress - progressions des collaborateurs du tenant
import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authenticateApiKey(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status"); // COMPLETED / IN_PROGRESS / NOT_STARTED

  const progress = await db.progress.findMany({
    where: {
      tenantId: a.tenantId!,
      ...(userId ? { userId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: {
      user: { select: { id: true, email: true, name: true, service: true } },
      saison: { select: { id: true, slug: true, title: true } },
      episode: { select: { id: true, slug: true, title: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    data: progress.map((p) => ({
      id: p.id,
      user: p.user,
      saison: p.saison,
      episode: p.episode,
      status: p.status,
      // score = XP brute (gamification, peut depasser 100)
      score: p.score,
      bestScore: p.bestScore,
      // quizScorePct = % maitrise (0..100), pour reporting et analytics
      quizScorePct: p.quizScorePct,
      bestQuizScorePct: p.bestQuizScorePct,
      attempts: p.attempts,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
    })),
    meta: { count: progress.length, tenantId: a.tenantId },
  });
}
