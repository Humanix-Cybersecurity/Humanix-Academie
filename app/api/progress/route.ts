// SPDX-License-Identifier: AGPL-3.0-or-later
// API : POST progression d'un episode + attribution XP, coins, level up
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  computeCoinsEarned,
  computeLevelUpCoins,
  computeTotalXP,
  getLevel,
  shouldAwardStreakBonus,
  BADGE_UNLOCK_XP_BONUS,
  PERFECT_QUIZ_XP_BONUS,
  STREAK_XP_BONUS_PER_DAY,
} from "@/lib/levels";
import { computeStreak } from "@/lib/streak";
import { fireWebhook } from "@/lib/webhooks/dispatcher";
import { triggerCisoLiveSync } from "@/lib/ciso-assistant/live-mode";
import { evaluateAndUnlock } from "@/lib/achievements/evaluate";
import { saisonVientDEtreTerminee } from "@/lib/saisons/completion";
import { remainingInvitesFor } from "@/lib/family-invites";

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
  const { episodeId, score: baseScore, status, perfectQuiz } = parsed.data;
  // Si quizScorePct non fourni, on retombe sur min(100, baseScore) pour ne pas
  // casser les anciens clients (provisoire - a retirer après deploiement
  // generalise du nouveau client).
  const quizScorePct =
    parsed.data.quizScorePct ?? Math.min(100, Math.max(0, baseScore));

  // BONUS XP : +PERFECT_QUIZ_XP_BONUS (10) si quiz parfait. Ce bonus est
  // ajoute AU score stocke (cf. commentaire du modele Progress : "score =
  // xpReward + bonus quiz + bonus scenario"). Cela se cumule naturellement
  // dans la somme totalXP utilisee pour le calcul du niveau.
  //
  // Refonte gamification mai 2026 (cf. lib/levels.ts pour la rationale).
  // Le bonus streak (+5 XP/jour a partir de J3) et le bonus badge-unlock
  // (+50 XP) sont desormais wires eux aussi, via User.bonusXP (#743) :
  // ils ne sont rattaches a aucun episode, donc ils ne peuvent pas passer
  // par Progress.score sans fausser bestScore.
  const perfectQuizBonus = perfectQuiz ? PERFECT_QUIZ_XP_BONUS : 0;
  const score = baseScore + perfectQuizBonus;

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
    let streakBonusAwarded = 0;
    let levelUpCoins = 0;
    let streakDays = 0;

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
        select: { score: true, completedAt: true, status: true },
      });

      const userBefore = await tx.user.findUnique({
        where: { id: userId },
        select: { level: true, bonusXP: true, lastStreakBonusAt: true },
      });

      // BONUS STREAK (#743) : +5 XP par jour a partir du 3e jour
      // consecutif, UNE seule fois par journee civile quel que soit le
      // nombre d'episodes termines. lastStreakBonusAt porte l'idempotence.
      const completedDates = allProgress
        .filter((p) => p.status === "COMPLETED" && p.completedAt)
        .map((p) => p.completedAt as Date);
      streakDays = computeStreak(completedDates);
      const awardStreak = shouldAwardStreakBonus(
        streakDays,
        userBefore?.lastStreakBonusAt ?? null,
        now,
      );
      streakBonusAwarded = awardStreak ? STREAK_XP_BONUS_PER_DAY : 0;

      // Le niveau se calcule sur XP episodes + bonus (y compris celui
      // qu'on vient d'accorder), sinon le palier arrive avec un episode
      // de retard.
      const totalXP = computeTotalXP(
        allProgress,
        (userBefore?.bonusXP ?? 0) + streakBonusAwarded,
      );
      const computedLevel = getLevel(totalXP);

      if (userBefore && userBefore.level !== computedLevel.id) {
        leveledUp = computedLevel.id > userBefore.level;
        newLevel = computedLevel.id;
      }
      // COINS DE PALIER (#743) : la boutique les annonce depuis toujours
      // (« 10/25/50 au passage de niveau ») sans qu'aucun increment
      // n'existe. On ne les accorde qu'a la MONTEE (leveledUp), jamais sur
      // un recalcul a la baisse.
      levelUpCoins = leveledUp && newLevel ? computeLevelUpCoins(newLevel) : 0;

      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: coinsAwarded + levelUpCoins },
          level: computedLevel.id,
          ...(streakBonusAwarded > 0
            ? {
                bonusXP: { increment: streakBonusAwarded },
                lastStreakBonusAt: now,
              }
            : {}),
        },
      });
    }

    await tx.event.create({
      data: {
        tenantId,
        userId,
        type: status === "COMPLETED" ? "episode_completed" : "episode_progress",
        payload: {
          episodeId,
          score,
          baseScore,
          perfectQuizBonus, // tracabilite : combien d'XP bonus accordes
          streakBonusAwarded,
          streakDays,
          levelUpCoins,
          coinsAwarded,
          leveledUp,
          newLevel,
        },
      },
    });

    return {
      coinsAwarded,
      leveledUp,
      newLevel,
      isFirstCompletion,
      streakBonusAwarded,
      streakDays,
      levelUpCoins,
    };
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

    // saison.completed (#734) : declare dans lib/webhooks/events.ts depuis
    // l'origine, cochable dans /admin/integrations, mais jamais emis.
    //
    // Le filtre `isPublished: true` n'est pas un detail : c'est la MEME
    // definition de "saison terminee" que isEligibleToInvite() dans
    // lib/family-invites/index.ts. Deux definitions concurrentes finiraient
    // par diverger, et un utilisateur verrait ses invitations debloquees
    // sans que l'evenement parte, ou l'inverse.
    //
    // Best-effort et hors du chemin de reponse : un webhook ne doit jamais
    // faire echouer l'enregistrement d'une progression.
    void (async () => {
      try {
        const saisonId = episode.saisonId;
        const [episodesPublies, progressions] = await Promise.all([
          db.episode.findMany({
            where: { saisonId, isPublished: true },
            select: { id: true },
          }),
          db.progress.findMany({
            where: { userId, saisonId },
            select: { episodeId: true, status: true, bestScore: true },
          }),
        ]);

        const parEpisode = new Map(progressions.map((p) => [p.episodeId, p]));
        const termine = saisonVientDEtreTerminee({
          episodes: episodesPublies.map((e) => {
            const p = parEpisode.get(e.id);
            return {
              episodeId: e.id,
              termine: p?.status === "COMPLETED",
              score: p?.bestScore ?? 0,
            };
          }),
          episodeValideId: episodeId,
          estPremiereCompletion: result.isFirstCompletion,
        });
        if (!termine) return;

        await fireWebhook(tenantId, "saison.completed", {
          userName: user?.name ?? user?.email ?? "Anonyme",
          saisonTitle: ep?.saison.title ?? "",
          averageScore: termine.scoreMoyen,
          familyInvitesUnlocked: await remainingInvitesFor(userId),
        });
      } catch (e) {
        console.error("[progress] emission saison.completed echouee", e);
      }
    })();

    // Live Mode (v2.0) : si l'admin a active enableLiveMode sur la connexion
    // CISO Assistant, on declenche une mini-sync incrementale debouncee (5s).
    // Fire-and-forget : ne bloque ni l'utilisateur ni le webhook.
    triggerCisoLiveSync(tenantId, "episode.completed");
  }

  // Evaluation des achievements (badges) : declenche aussi sur les
  // updates non-first-completion (parce que le score peut s'ameliorer
  // et debloquer "high_avg_score" / "perfect_5" / etc.). Best-effort,
  // ne bloque pas la reponse client.
  let newlyUnlockedAchievements: {
    slug: string;
    title: string;
    emoji: string;
  }[] = [];
  let badgeBonusAwarded = 0;
  if (status === "COMPLETED") {
    try {
      const evalResult = await evaluateAndUnlock(userId);
      newlyUnlockedAchievements = evalResult.newlyUnlocked;

      // BONUS BADGE (#743) : +50 XP par badge fraichement debloque.
      // Hors transaction parce que l'evaluation elle-meme l'est : c'est
      // sans risque de double attribution, le @@unique([userId,
      // achievementId]) de UserAchievement garantit qu'un badge n'est
      // "newly unlocked" qu'une fois.
      if (newlyUnlockedAchievements.length > 0) {
        badgeBonusAwarded =
          newlyUnlockedAchievements.length * BADGE_UNLOCK_XP_BONUS;
        await db.user.update({
          where: { id: userId },
          data: { bonusXP: { increment: badgeBonusAwarded } },
        });
      }
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({
    ok: true,
    ...result,
    newlyUnlockedAchievements,
    badgeBonusAwarded,
  });
}
