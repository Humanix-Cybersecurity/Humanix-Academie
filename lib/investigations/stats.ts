// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers d'agregation pour le leaderboard + stats user du Mode Enqueteur.
//
// Toutes les fonctions sont scopees par tenantId : pas de fuite cross-tenant
// (cf. lib/tenant-isolation.test.ts pour l'invariant general).

import { db } from "@/lib/db";
import { computeDetectiveRank, type DetectiveRank } from "./types";

/**
 * Top N users du tenant, classes par nb d'enquetes passees > 60%,
 * tiebreaker = ratio moyen.
 *
 * Sur 30 derniers jours par defaut (= "leaderboard du mois").
 */
export async function getTenantLeaderboard(
  tenantId: string,
  options: { sinceDays?: number; limit?: number } = {},
): Promise<
  {
    userId: string;
    userName: string | null;
    userEmail: string;
    investigationsPassed: number;
    avgScoreRatio: number;
    rank: DetectiveRank;
  }[]
> {
  const sinceDays = options.sinceDays ?? 30;
  const limit = options.limit ?? 10;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  // 1) Charge tous les resultats du tenant sur la periode
  const results = await db.investigationResult.findMany({
    where: {
      tenantId,
      createdAt: { gte: since },
    },
    select: {
      userId: true,
      scenarioSlug: true,
      score: true,
      maxScore: true,
      passed: true,
      user: {
        select: { name: true, email: true },
      },
    },
  });

  // 2) Aggrege par user - garde le MEILLEUR score par scenario
  //    (pas la moyenne, sinon retries penalisent).
  type Acc = {
    userId: string;
    userName: string | null;
    userEmail: string;
    bestByScenario: Map<
      string,
      { score: number; maxScore: number; passed: boolean }
    >;
  };
  const byUser = new Map<string, Acc>();
  for (const r of results) {
    let acc = byUser.get(r.userId);
    if (!acc) {
      acc = {
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email ?? "",
        bestByScenario: new Map(),
      };
      byUser.set(r.userId, acc);
    }
    const prev = acc.bestByScenario.get(r.scenarioSlug);
    if (!prev || r.score > prev.score) {
      acc.bestByScenario.set(r.scenarioSlug, {
        score: r.score,
        maxScore: r.maxScore,
        passed: r.passed,
      });
    }
  }

  // 3) Calcule stats finales + rank
  const leaderboard = [...byUser.values()].map((acc) => {
    const best = [...acc.bestByScenario.values()];
    const passed = best.filter((b) => b.passed);
    const investigationsPassed = passed.length;
    const totalRatio = passed.reduce(
      (sum, b) => (b.maxScore > 0 ? sum + b.score / b.maxScore : sum),
      0,
    );
    const avgScoreRatio = passed.length > 0 ? totalRatio / passed.length : 0;
    return {
      userId: acc.userId,
      userName: acc.userName,
      userEmail: acc.userEmail,
      investigationsPassed,
      avgScoreRatio,
      rank: computeDetectiveRank(best),
    };
  });

  // 4) Trie + limite
  leaderboard.sort((a, b) => {
    if (a.investigationsPassed !== b.investigationsPassed) {
      return b.investigationsPassed - a.investigationsPassed;
    }
    return b.avgScoreRatio - a.avgScoreRatio;
  });

  return leaderboard.slice(0, limit);
}

/**
 * Stats personnelles d'un user pour la page profil.
 */
export async function getUserInvestigationStats(
  userId: string,
): Promise<{
  totalAttempts: number;
  uniquePassedScenarios: number;
  avgScoreRatio: number;
  rank: DetectiveRank;
  recentResults: {
    scenarioSlug: string;
    score: number;
    maxScore: number;
    passed: boolean;
    createdAt: Date;
  }[];
}> {
  const all = await db.investigationResult.findMany({
    where: { userId },
    select: {
      scenarioSlug: true,
      score: true,
      maxScore: true,
      passed: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const bestByScenario = new Map<
    string,
    { score: number; maxScore: number; passed: boolean }
  >();
  for (const r of all) {
    const prev = bestByScenario.get(r.scenarioSlug);
    if (!prev || r.score > prev.score) {
      bestByScenario.set(r.scenarioSlug, {
        score: r.score,
        maxScore: r.maxScore,
        passed: r.passed,
      });
    }
  }

  const best = [...bestByScenario.values()];
  const passed = best.filter((b) => b.passed);
  const totalRatio = passed.reduce(
    (sum, b) => (b.maxScore > 0 ? sum + b.score / b.maxScore : sum),
    0,
  );
  const avgScoreRatio = passed.length > 0 ? totalRatio / passed.length : 0;

  return {
    totalAttempts: all.length,
    uniquePassedScenarios: passed.length,
    avgScoreRatio,
    rank: computeDetectiveRank(best),
    recentResults: all.slice(0, 10),
  };
}
