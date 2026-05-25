// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Evaluator des achievements (badges).
//
// Cas d'usage :
//   1. Apres une action significative (completion d'episode, partage,
//      achat boutique, signalement phishing) -> on appelle
//      evaluateAndUnlock(userId) pour debloquer les badges nouveaux
//      sans recharger toute la page.
//   2. Cron quotidien retroactif : on parcourt tous les users actifs
//      et on rattrape les badges qui auraient pu etre rates a l'epoque
//      ou il n'y avait pas le systeme.
//
// IDEMPOTENCE :
//   Le @@unique([userId, achievementId]) sur UserAchievement garantit
//   qu'on ne cree pas de doublons. On utilise createMany skipDuplicates
//   pour traiter tous les nouveaux unlocks en 1 requete.
//
// PERFORMANCE :
//   Une seule query par user pour reconstruire les UserStats. Le cron
//   retroactif itere sequentiellement (volume faible : ~ qq milliers
//   d'users / instance). Si un jour ca scale, paralleliser ou ne
//   re-evaluer que les users actifs (lastSeenAt < 30j).

import { db } from "@/lib/db";
import {
  ACHIEVEMENTS_CATALOG,
  ACHIEVEMENTS_BY_SLUG,
  type UserStats,
} from "./catalog";

/**
 * Reconstruit les stats agregeees d'un user pour evaluer les badges.
 * Une query Prisma + des aggregations en memoire.
 */
export async function buildUserStats(userId: string): Promise<UserStats | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      tenantId: true,
      coins: true,
      level: true,
      shareCount: true,
      progress: {
        select: {
          status: true,
          score: true,
          bestQuizScorePct: true,
          completedAt: true,
          saisonId: true,
          episodeId: true,
          episode: { select: { saisonId: true, slug: true } },
        },
      },
      phishingResults: {
        select: { status: true },
      },
      inventory: {
        select: { id: true },
      },
    },
  });
  if (!user) return null;

  const completedProgress = user.progress.filter(
    (p) => p.status === "COMPLETED",
  );
  const completedEpisodes = completedProgress.length;
  const totalXP = user.progress.reduce((s, p) => s + (p.score ?? 0), 0);
  const perfectQuizCount = completedProgress.filter(
    (p) => (p.bestQuizScorePct ?? 0) === 100,
  ).length;

  // Avg quiz score (sur les episodes completes uniquement)
  const avgQuizScorePct =
    completedProgress.length === 0
      ? 0
      : completedProgress.reduce(
          (s, p) => s + (p.bestQuizScorePct ?? 0),
          0,
        ) / completedProgress.length;

  // Saisons completes : on compte les saisons ou TOUS les episodes
  // publies sont COMPLETED par cet user. Pour ca, on charge les
  // episodes publies de chaque saison et on compare.
  const completedEpisodeIds = new Set(
    completedProgress.map((p) => p.episodeId),
  );
  const saisonIds = Array.from(
    new Set(user.progress.map((p) => p.saisonId)),
  );
  let completedSaisonsCount = 0;
  let hasCompletedAtLeastOneSaison = false;
  // Slugs des saisons entierement completees -- alimente les badges
  // d'audience (cyber-rh, cyber-dev...) et thematiques (anti-phishing...).
  const completedSaisonSlugs: string[] = [];
  if (saisonIds.length > 0) {
    const saisons = await db.saison.findMany({
      where: { id: { in: saisonIds }, isPublished: true },
      select: {
        id: true,
        slug: true,
        episodes: {
          where: { isPublished: true },
          select: { id: true },
        },
      },
    });
    for (const s of saisons) {
      if (s.episodes.length === 0) continue;
      const allDone = s.episodes.every((e: { id: string }) =>
        completedEpisodeIds.has(e.id),
      );
      if (allDone) {
        completedSaisonsCount++;
        hasCompletedAtLeastOneSaison = true;
        completedSaisonSlugs.push(s.slug);
      }
    }
  }

  // Total episodes publies du tenant (pour le badge "all_saisons"
  // qui est relatif au tenant courant, pas a un absolu)
  const totalEpisodes = await db.episode.count({
    where: {
      isPublished: true,
      saison: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId: user.tenantId }],
      },
    },
  });

  // Streak peak : sur les dates de completion uniques (UTC midnight),
  // calcule le plus long enchainement d'au moins 1 par jour.
  const dayKeys = new Set(
    completedProgress
      .filter((p) => p.completedAt)
      .map((p) => {
        const d = new Date(p.completedAt!);
        d.setUTCHours(0, 0, 0, 0);
        return d.getTime();
      }),
  );
  let maxStreak = 0;
  let currentStreak = 0;
  const sortedDays = Array.from(dayKeys).sort((a, b) => a - b);
  const ONE_DAY = 24 * 3600 * 1000;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0 || sortedDays[i] - sortedDays[i - 1] === ONE_DAY) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak;
  }

  // Remediation flash : episodes de la saison "remediation-flash" completes
  const remediationFlashCount = completedProgress.filter(
    (p) => p.episode?.slug?.endsWith("-flash") ?? false,
  ).length;

  const phishingReportedCount = user.phishingResults.filter(
    (r) => r.status === "REPORTED",
  ).length;

  return {
    totalXP,
    level: user.level,
    coins: user.coins,
    shareCount: user.shareCount,
    completedEpisodes,
    totalEpisodes,
    perfectQuizCount,
    remediationFlashCount,
    maxStreak,
    phishingReportedCount,
    hasCompletedAtLeastOneSaison,
    completedSaisonsCount,
    ownedItemsCount: user.inventory.length,
    avgQuizScorePct,
    completedSaisonSlugs,
  };
}

export type EvaluateResult = {
  newlyUnlocked: { slug: string; title: string; emoji: string }[];
  totalUnlocked: number;
};

/**
 * Evalue les achievements du catalogue pour un user et persiste les
 * nouveaux unlocks en BDD. Idempotent : si tous les badges deja
 * unlocked, ne fait rien.
 *
 * Retourne la liste des badges NEWLY unlocked (utile pour afficher
 * un toast cote client apres une action).
 */
export async function evaluateAndUnlock(
  userId: string,
): Promise<EvaluateResult> {
  const stats = await buildUserStats(userId);
  if (!stats) return { newlyUnlocked: [], totalUnlocked: 0 };

  // Achievements qui devraient etre unlocked selon les stats
  const shouldBeUnlocked = ACHIEVEMENTS_CATALOG.filter((a) =>
    a.isUnlocked(stats),
  );

  if (shouldBeUnlocked.length === 0) {
    return { newlyUnlocked: [], totalUnlocked: 0 };
  }

  // Slugs deja unlocked en BDD
  const slugs = shouldBeUnlocked.map((a) => a.slug);
  const existingUnlocks = await db.userAchievement.findMany({
    where: {
      userId,
      achievement: { slug: { in: slugs } },
    },
    select: { achievement: { select: { slug: true } } },
  });
  const alreadyUnlocked = new Set(
    existingUnlocks.map((u) => u.achievement.slug),
  );

  const toUnlock = shouldBeUnlocked.filter((a) => !alreadyUnlocked.has(a.slug));
  if (toUnlock.length === 0) {
    return { newlyUnlocked: [], totalUnlocked: existingUnlocks.length };
  }

  // Charge user.tenantId pour denormaliser sur UserAchievement
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  if (!user) return { newlyUnlocked: [], totalUnlocked: existingUnlocks.length };

  // Resolve les Achievement.id (ils sont upserted au seed)
  const dbAchievements = await db.achievement.findMany({
    where: { slug: { in: toUnlock.map((a) => a.slug) } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(dbAchievements.map((a) => [a.slug, a.id]));

  const createData = toUnlock
    .filter((a) => idBySlug.has(a.slug))
    .map((a) => ({
      userId,
      achievementId: idBySlug.get(a.slug)!,
      tenantId: user.tenantId,
    }));

  if (createData.length > 0) {
    await db.userAchievement.createMany({
      data: createData,
      skipDuplicates: true, // defense en profondeur
    });
    // Log un Event par user pour traçabilite (1 par batch d'unlock,
    // pas 1 par badge pour eviter le spam)
    await db.event.create({
      data: {
        tenantId: user.tenantId,
        userId,
        type: "achievement.unlocked_batch",
        payload: {
          slugs: toUnlock.map((a) => a.slug),
          count: createData.length,
        },
      },
    });
  }

  return {
    newlyUnlocked: toUnlock.map((a) => ({
      slug: a.slug,
      title: a.title,
      emoji: a.emoji,
    })),
    totalUnlocked: existingUnlocks.length + createData.length,
  };
}

/**
 * Helper "fire and forget" pour les callers qui ne veulent pas attendre
 * (ex: /api/progress qui doit repondre rapidement). Best-effort.
 */
export function fireAndForgetEvaluate(userId: string): void {
  void evaluateAndUnlock(userId).catch(() => {
    // best-effort : un echec ne casse pas le flow user
  });
}

/**
 * Re-evalue les achievements pour TOUS les users actifs du systeme.
 * Utilise par le cron quotidien pour rattraper les badges qui n'auraient
 * pas ete debloques au moment de l'action (parce qu'on a ajoute un
 * nouveau badge au catalogue par exemple).
 */
export async function reEvaluateAllUsers(): Promise<{
  evaluated: number;
  totalNewUnlocks: number;
}> {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  let totalNewUnlocks = 0;
  for (const u of users) {
    try {
      const r = await evaluateAndUnlock(u.id);
      totalNewUnlocks += r.newlyUnlocked.length;
    } catch {
      // skip user en erreur, on continue
    }
  }
  return { evaluated: users.length, totalNewUnlocks };
}

/**
 * Resolveur d'icones et metadata depuis le catalogue. Utile pour la
 * page /profil/badges qui doit afficher la liste complete (debloquees
 * + non debloquees) avec descriptions.
 */
export function getCatalogEntry(slug: string) {
  return ACHIEVEMENTS_BY_SLUG[slug] ?? null;
}
