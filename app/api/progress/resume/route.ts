// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/progress/resume
//
// Endpoint LEGER pour persister la position courante de l'user dans un
// episode (pour reprise mid-episode). Distinct de POST /api/progress qui
// est lourd (XP, coins, level up, audit log, webhook).
//
// Appele par EpisodePlayer a chaque transition de step (scenario ->
// debrief -> quiz q1 -> quiz q2 -> ...). Idempotent : même requete deux
// fois = même effet.
//
// Pas d'attribution de XP / coins ici : juste un upsert minimal sur
// Progress.{resumeStep, resumeQuizIndex, resumeChoiceId, status}.
//
// Status passe a IN_PROGRESS si NOT_STARTED. Si COMPLETED, on ne touche
// rien (l'user a déjà fini, pas besoin de reprise).

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const Schema = z.object({
  episodeId: z.string().min(1),
  step: z.enum(["scenario", "debrief", "quiz"]),
  quizIndex: z.number().int().min(0).max(50).optional(),
  choiceId: z.string().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const { episodeId, step, quizIndex, choiceId } = parsed.data;

  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string;
  if (!tenantId) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }

  const episode = await db.episode.findUnique({
    where: { id: episodeId },
    select: { id: true, saisonId: true },
  });
  if (!episode) {
    return NextResponse.json({ error: "episode_not_found" }, { status: 404 });
  }

  // upsert minimal : si COMPLETED on ne touche pas, sinon on update les
  // champs resume*.
  const existing = await db.progress.findUnique({
    where: { userId_episodeId: { userId, episodeId } },
    select: { id: true, status: true },
  });

  if (existing?.status === "COMPLETED") {
    // L'user reprend un episode déjà termine pour le rejouer : on
    // accepte mais on ne change pas le status (sinon on perd le
    // completedAt). Resume state utile uniquement si l'user reload
    // au milieu de la replay.
    await db.progress.update({
      where: { userId_episodeId: { userId, episodeId } },
      data: {
        resumeStep: step,
        resumeQuizIndex: quizIndex ?? 0,
        resumeChoiceId: choiceId ?? null,
      },
    });
    return NextResponse.json({ ok: true, replayMode: true });
  }

  await db.progress.upsert({
    where: { userId_episodeId: { userId, episodeId } },
    create: {
      tenantId,
      userId,
      saisonId: episode.saisonId,
      episodeId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      resumeStep: step,
      resumeQuizIndex: quizIndex ?? 0,
      resumeChoiceId: choiceId ?? null,
    },
    update: {
      status: "IN_PROGRESS",
      resumeStep: step,
      resumeQuizIndex: quizIndex ?? 0,
      resumeChoiceId: choiceId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
