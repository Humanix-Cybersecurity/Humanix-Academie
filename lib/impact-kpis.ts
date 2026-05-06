// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Impact KPIs — calcul des benefices observes grace a la plateforme.
//
// Complementaire de lib/business-impact.ts (qui calcule l'exposition
// financiere). Ici on mesure les EVOLUTIONS CONCRETES observees dans
// le tenant : adoption, apprentissage, couverture critique.
//
// Cible : DSI, RSSI, C-level qui veulent un KPI sheet "ce que la
// plateforme a fait evoluer dans ma boite". Format : delta avant/apres,
// pourcentages, hours saved, en langage qu'un dirigeant non-tech comprend.

import { db } from "@/lib/db";

// =============================================================================
// Types
// =============================================================================

export type ImpactKpis = {
  // Periode mesuree
  tenantCreatedAt: Date;
  daysSinceCreation: number;

  // Section 1 — Adoption
  adoption: {
    totalSeats: number;
    activatedSeats: number; // au moins 1 module complete
    activationRate: number; // 0..1
    weeklyActiveRate: number; // 0..1, % de users actifs au moins 1 fois cette semaine
    streakUsers: number; // users avec >= 4 semaines consecutives d'activite
    avgModulesPerWeek: number; // sur les 4 dernieres semaines, par user actif
  };

  // Section 2 — Apprentissage
  learning: {
    totalModulesCompleted: number;
    totalMinutesLearned: number; // somme durationMinutes des episodes completes
    avgQuizScorePct: number; // moyenne bestQuizScorePct sur tous les Progress completed
    // Cohorte "novice" (0-1 module) vs "engagee" (5+ modules) : proxy avant/apres
    novicesCount: number;
    novicesAvgRiskScore: number;
    engagedCount: number;
    engagedAvgRiskScore: number;
    riskScoreDelta: number; // engaged - novices (positif = la plateforme aide)
  };

  // Section 3 — Couverture critique
  coverage: {
    criticalSaisons: {
      slug: string;
      title: string;
      coveragePct: number; // % users qui ont complete >= 1 episode de la saison
      completionPct: number; // % users qui ont complete TOUTE la saison
    }[];
    averageCriticalCoverage: number; // moyenne sur les saisons critiques
  };

  // Section 4 — Reflexes operationnels (dernier mois)
  reflexes: {
    modulesCompletedLast30d: number;
    activeUsersLast30d: number;
    avgCadenceLast30d: number; // modules / user actif sur 30j
  };
};

// =============================================================================
// Constantes
// =============================================================================

const ONE_DAY_MS = 24 * 3600 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

// Saisons critiques (les sujets que tout salarie devrait avoir vus). On
// pioche dans le catalog les slugs les plus emblematiques pour chaque
// risque humain identifie (cf. saisons MDX expertes 6/6).
const CRITICAL_SAISON_SLUGS = [
  "phishing",
  "mots-de-passe",
  "fraude-president",
  "ransomware",
  "donnees-sensibles",
  "ia-generative",
];

// =============================================================================
// Calcul principal
// =============================================================================

export async function computeImpactKpis(tenantId: string): Promise<ImpactKpis> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { createdAt: true },
  });
  const tenantCreatedAt = tenant?.createdAt ?? new Date();
  const daysSinceCreation = Math.max(
    1,
    Math.floor((Date.now() - tenantCreatedAt.getTime()) / ONE_DAY_MS),
  );

  // Tous les users actifs (LEARNER) du tenant
  const users = await db.user.findMany({
    where: { tenantId, role: "LEARNER", isActive: true },
    select: {
      id: true,
      riskScore: true,
    },
  });
  const totalSeats = users.length;
  const userIds = users.map((u) => u.id);

  // Tous les Progress completes du tenant
  const allProgress = await db.progress.findMany({
    where: { tenantId, status: "COMPLETED", userId: { in: userIds } },
    select: {
      userId: true,
      saisonId: true,
      episodeId: true,
      bestQuizScorePct: true,
      completedAt: true,
      episode: {
        select: { durationMinutes: true, saison: { select: { slug: true } } },
      },
    },
  });

  // ============ ADOPTION ============
  const usersByActivity = new Map<string, number>();
  for (const p of allProgress) {
    usersByActivity.set(p.userId, (usersByActivity.get(p.userId) ?? 0) + 1);
  }
  const activatedSeats = usersByActivity.size;
  const activationRate = totalSeats === 0 ? 0 : activatedSeats / totalSeats;

  // Activite hebdomadaire : users avec au moins 1 progress cette semaine
  const oneWeekAgo = new Date(Date.now() - ONE_WEEK_MS);
  const weeklyActiveUsers = new Set(
    allProgress
      .filter((p) => p.completedAt && p.completedAt >= oneWeekAgo)
      .map((p) => p.userId),
  );
  const weeklyActiveRate =
    totalSeats === 0 ? 0 : weeklyActiveUsers.size / totalSeats;

  // Streak >= 4 semaines : on regarde les 4 dernieres semaines, et compte les
  // users qui ont au moins 1 module dans CHACUNE des 4 semaines.
  const streakUsers = countStreakUsers(allProgress, 4);

  // Cadence sur les 4 dernieres semaines
  const fourWeeksAgo = new Date(Date.now() - 4 * ONE_WEEK_MS);
  const last4wProgress = allProgress.filter(
    (p) => p.completedAt && p.completedAt >= fourWeeksAgo,
  );
  const last4wActiveUsers = new Set(last4wProgress.map((p) => p.userId)).size;
  const avgModulesPerWeek =
    last4wActiveUsers === 0 ? 0 : last4wProgress.length / 4 / last4wActiveUsers;

  // ============ APPRENTISSAGE ============
  const totalModulesCompleted = allProgress.length;
  const totalMinutesLearned = allProgress.reduce(
    (acc, p) => acc + (p.episode.durationMinutes ?? 0),
    0,
  );
  const avgQuizScorePct =
    allProgress.length === 0
      ? 0
      : Math.round(
          allProgress.reduce((acc, p) => acc + p.bestQuizScorePct, 0) /
            allProgress.length,
        );

  // Cohortes novice (0-1 module) vs engagee (5+ modules)
  const novices = users.filter(
    (u) => (usersByActivity.get(u.id) ?? 0) <= 1,
  );
  const engaged = users.filter(
    (u) => (usersByActivity.get(u.id) ?? 0) >= 5,
  );
  const novicesAvgRiskScore =
    novices.length === 0
      ? 50 // valeur neutre par defaut
      : Math.round(
          novices.reduce((acc, u) => acc + (u.riskScore ?? 50), 0) /
            novices.length,
        );
  const engagedAvgRiskScore =
    engaged.length === 0
      ? 50
      : Math.round(
          engaged.reduce((acc, u) => acc + (u.riskScore ?? 50), 0) /
            engaged.length,
        );

  // ============ COUVERTURE CRITIQUE ============
  const saisons = await db.saison.findMany({
    where: {
      slug: { in: CRITICAL_SAISON_SLUGS },
      OR: [{ tenantId: null }, { tenantId }],
      isPublished: true,
    },
    include: { episodes: true },
  });

  const criticalSaisons = saisons.map((s) => {
    const epIdsInSaison = new Set(s.episodes.map((e) => e.id));
    const usersWithAny = new Set(
      allProgress
        .filter((p) => epIdsInSaison.has(p.episodeId))
        .map((p) => p.userId),
    );
    const usersWithFull = new Set<string>();
    for (const u of users) {
      const userEps = allProgress.filter(
        (p) => p.userId === u.id && epIdsInSaison.has(p.episodeId),
      );
      if (s.episodes.length > 0 && userEps.length === s.episodes.length) {
        usersWithFull.add(u.id);
      }
    }
    const coveragePct =
      totalSeats === 0 ? 0 : (usersWithAny.size / totalSeats) * 100;
    const completionPct =
      totalSeats === 0 ? 0 : (usersWithFull.size / totalSeats) * 100;
    return {
      slug: s.slug,
      title: s.title,
      coveragePct: Math.round(coveragePct),
      completionPct: Math.round(completionPct),
    };
  });

  const averageCriticalCoverage =
    criticalSaisons.length === 0
      ? 0
      : Math.round(
          criticalSaisons.reduce((acc, s) => acc + s.coveragePct, 0) /
            criticalSaisons.length,
        );

  // ============ REFLEXES OPERATIONNELS (30j) ============
  const thirtyDaysAgo = new Date(Date.now() - 30 * ONE_DAY_MS);
  const last30d = allProgress.filter(
    (p) => p.completedAt && p.completedAt >= thirtyDaysAgo,
  );
  const activeUsersLast30d = new Set(last30d.map((p) => p.userId)).size;
  const avgCadenceLast30d =
    activeUsersLast30d === 0 ? 0 : last30d.length / activeUsersLast30d;

  return {
    tenantCreatedAt,
    daysSinceCreation,
    adoption: {
      totalSeats,
      activatedSeats,
      activationRate,
      weeklyActiveRate,
      streakUsers,
      avgModulesPerWeek: Math.round(avgModulesPerWeek * 10) / 10,
    },
    learning: {
      totalModulesCompleted,
      totalMinutesLearned,
      avgQuizScorePct,
      novicesCount: novices.length,
      novicesAvgRiskScore,
      engagedCount: engaged.length,
      engagedAvgRiskScore,
      riskScoreDelta: engagedAvgRiskScore - novicesAvgRiskScore,
    },
    coverage: {
      criticalSaisons: criticalSaisons.sort(
        (a, b) => b.coveragePct - a.coveragePct,
      ),
      averageCriticalCoverage,
    },
    reflexes: {
      modulesCompletedLast30d: last30d.length,
      activeUsersLast30d,
      avgCadenceLast30d: Math.round(avgCadenceLast30d * 10) / 10,
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

/** Compte les users qui ont eu au moins 1 progress completed dans CHACUNE
 * des N dernieres semaines (= "streak" de N semaines consecutives). */
function countStreakUsers(
  progress: { userId: string; completedAt: Date | null }[],
  weeks: number,
): number {
  const now = Date.now();
  const userActiveWeeks = new Map<string, Set<number>>();

  for (const p of progress) {
    if (!p.completedAt) continue;
    const weeksAgo = Math.floor((now - p.completedAt.getTime()) / ONE_WEEK_MS);
    if (weeksAgo < 0 || weeksAgo >= weeks) continue;
    const set = userActiveWeeks.get(p.userId) ?? new Set<number>();
    set.add(weeksAgo);
    userActiveWeeks.set(p.userId, set);
  }

  let count = 0;
  for (const weeksSet of userActiveWeeks.values()) {
    if (weeksSet.size >= weeks) count++;
  }
  return count;
}
