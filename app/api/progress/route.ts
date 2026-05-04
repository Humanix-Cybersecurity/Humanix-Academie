// API : POST progression d'un episode + attribution XP, coins, level up
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeCoinsEarned, getLevel } from "@/lib/levels";
import { fireWebhook } from "@/lib/webhooks/dispatcher";

export const dynamic = "force-dynamic";

// Note semantique :
//   - score = XP brute gagnee (gamification, peut depasser 100)
//   - quizScorePct = pourcentage de bonnes reponses au quiz (0..100, indicateur
//     de maitrise reelle utilise par lib/risk-score.ts)
// Backward compat : si quizScorePct est absent, on l'estime depuis le score
// XP en clamp [0..100] pour ne pas casser les anciens clients.
const Schema = z.object({
  episodeId: z.string(),
  score: z.number().int().min(0).max(1000),
  quizScorePct: z.number().int().min(0).max(100).optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
  perfectQuiz: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error },
      { status: 400 },
    );
  }
  const { episodeId, score, status, perfectQuiz } = parsed.data;
  // Si quizScorePct non fourni, on retombe sur min(100, score) pour ne pas
  // casser les anciens clients (provisoire — a retirer apres deploiement
  // generalise du nouveau client).
  const quizScorePct =
    parsed.data.quizScorePct ?? Math.min(100, Math.max(0, score));

  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string;
  if (!tenantId)
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });

  const episode = await db.episode.findUnique({ where: { id: episodeId } });
  if (!episode)
    return NextResponse.json({ error: "episode_not_found" }, { status: 404 });

  const now = new Date();

  // Tout dans une transaction pour éviter les race conditions
  // (clic-spam, double-soumission → double attribution coins/XP)
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.progress.findUnique({
      where: { userId_episodeId: { userId, episodeId } },
    });
    const isFirstCompletion = !existing || existing.status !== "COMPLETED";
    const previousScore = existing?.bestScore ?? 0;
    const previousQuizPct = existing?.bestQuizScorePct ?? 0;
    const newBestScore = Math.max(previousScore, score);
    const newBestQuizPct = Math.max(previousQuizPct, quizScorePct);
    const isImprovement = score > previousScore;

    await tx.progress.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      create: {
        tenantId,
        userId,
        saisonId: episode.saisonId,
        episodeId,
        status,
        score,
        bestScore: score,
        quizScorePct,
        bestQuizScorePct: quizScorePct,
        attempts: 1,
        startedAt: now,
        completedAt: status === "COMPLETED" ? now : null,
      },
      update: {
        status,
        score, // dernier score realise (XP)
        bestScore: newBestScore,
        quizScorePct, // dernier % quiz
        bestQuizScorePct: newBestQuizPct,
        attempts: { increment: 1 },
        completedAt: status === "COMPLETED" ? now : existing?.completedAt,
      },
    });

    let coinsAwarded = 0;
    let leveledUp = false;
    let newLevel: number | null = null;

    // Attribution coins + level uniquement si première completion OU amélioration
    // ET si score > 0 (pas de coins gratuits sur quiz vide)
    if (
      status === "COMPLETED" &&
      score > 0 &&
      (isFirstCompletion || isImprovement)
    ) {
      coinsAwarded = computeCoinsEarned(score, !!perfectQuiz);

      // TODO perf : dénormaliser User.totalXP au lieu de recalculer (N+1).
      // Filtrage tenantId : on prend bien la progression du tenant courant.
      const allProgress = await tx.progress.findMany({
        where: { userId, tenantId },
        select: { score: true },
      });
      const totalXP = allProgress.reduce((s, p) => s + (p.score || 0), 0);
      const computedLevel = getLevel(totalXP);

      const userBefore = await tx.user.findUnique({
        where: { id: userId },
        select: { level: true },
      });
      if (userBefore && userBefore.level !== computedLevel.id) {
        leveledUp = computedLevel.id > userBefore.level;
        newLevel = computedLevel.id;
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: coinsAwarded },
          level: computedLevel.id,
        },
      });
    }

    await tx.event.create({
      data: {
        tenantId,
        userId,
        type: status === "COMPLETED" ? "episode_completed" : "episode_progress",
        payload: { episodeId, score, coinsAwarded, leveledUp, newLevel },
      },
    });

    return { coinsAwarded, leveledUp, newLevel, isFirstCompletion };
  });

  // Hook webhook : fire-and-forget, ne bloque PAS la reponse utilisateur.
  // Uniquement sur premiere completion d'un episode (pas sur reprise).
  if (status === "COMPLETED" && result.isFirstCompletion) {
    const [user, ep] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      }),
      db.episode.findUnique({
        where: { id: episodeId },
        select: { title: true, saison: { select: { title: true } } },
      }),
    ]);
    void fireWebhook(tenantId, "episode.completed", {
      userName: user?.name ?? user?.email ?? "Anonyme",
      userEmail: user?.email ?? "",
      saisonTitle: ep?.saison.title ?? "",
      episodeTitle: ep?.title ?? "",
      score,
      bestScore: Math.max(score, 0),
    }).catch(() => {
      // log silencieux : les erreurs sont enregistrees dans TenantWebhook.lastError
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
