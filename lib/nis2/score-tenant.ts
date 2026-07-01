// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Score NIS2 per-article TEMPS REEL pour un tenant existant.
//
// Difference avec le diagnostic public (lib/nis2/recyf-scoring.ts) :
//   - Le diagnostic = auto-evaluation ReCyF (20 objectifs, gratuit, public)
//   - Ce score-tenant = base sur les DONNEES REELLES d'apprentissage du
//     tenant (utilisateurs actifs, modules completes, score moyen)
//
// LOGIQUE :
//   Pour chaque article NIS2, on liste les saisons Humanix qui le
//   couvrent (mapping NIS2_ARTICLES[id].coveredBySaisons). Pour chaque
//   saison mappee on calcule un ratio :
//
//     completion_saison = (sum over user.completed_modules_in_saison)
//                       / (active_users * total_modules_in_saison)
//
//   Score article = moyenne des completion_saison pour toutes les
//   saisons mappees (0-100).
//
//   Si un article n'a aucune saison disponible dans le catalogue tenant,
//   le score est null (= "non couvert" plutot que 0).
//
// PERFORMANCE :
//   Une seule query Prisma qui aggrege par saisonId + un compte d'users.
//   In-memory reduce ensuite. Acceptable jusqu'a ~10000 users / tenant.
//
// DEFENSE EN PROFONDEUR :
//   Lecture seule -> passe par dbReadOnly (cf. PR #548 Sprint securite).

import { dbReadOnly } from "@/lib/db-readonly";
import {
  NIS2_ARTICLES,
  NIS2_ARTICLES_ORDER,
  type Nis2Article,
} from "./articles";

export type Nis2TenantArticleScore = {
  article: Nis2Article;
  title: string;
  description: string;
  /** Score 0-100, ou null si l'article n'a pas de saison disponible */
  score: number | null;
  /** Saisons mappees a cet article + leur completion ratio dans le tenant */
  saisons: Array<{
    slug: string;
    title: string;
    /** % d'episodes completes / (total_episodes * users_actifs) */
    completion: number;
    isAvailable: boolean;
  }>;
};

export type Nis2TenantScore = {
  /** Score global 0-100 (moyenne des articles non-null) */
  globalScore: number;
  articles: Nis2TenantArticleScore[];
  /** Nb d'utilisateurs actifs pris en compte */
  activeUsersCount: number;
  computedAt: string;
};

/**
 * Calcule le score NIS2 per-article d'un tenant a partir de ses donnees
 * reelles d'apprentissage.
 */
export async function computeTenantNis2Score(
  tenantId: string,
): Promise<Nis2TenantScore> {
  // 1. Compte les users actifs (denominator pour les ratios de completion)
  const activeUsers = await dbReadOnly.user.count({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER", "ADMIN", "RSSI"] },
    },
  });

  // 2. Recupere les saisons disponibles du tenant (catalogue global +
  // saisons custom du tenant) avec leurs episodes
  const allCoveringSlugs = new Set<string>();
  for (const a of Object.values(NIS2_ARTICLES)) {
    for (const slug of a.coveredBySaisons) allCoveringSlugs.add(slug);
  }

  const tenantSaisons = await dbReadOnly.saison.findMany({
    where: {
      slug: { in: [...allCoveringSlugs] },
      isPublished: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      _count: { select: { episodes: { where: { isPublished: true } } } },
    },
  });

  // 3. Pour chaque saison disponible, compte les progress COMPLETED des
  // users actifs du tenant
  let progressBySaison: Record<string, number> = {};
  if (activeUsers > 0 && tenantSaisons.length > 0) {
    const saisonIds = tenantSaisons.map((s) => s.id);
    const progress = await dbReadOnly.progress.groupBy({
      by: ["saisonId"],
      where: {
        tenantId,
        saisonId: { in: saisonIds },
        status: "COMPLETED",
        user: {
          isActive: true,
          role: { in: ["LEARNER", "MANAGER", "ADMIN", "RSSI"] },
        },
      },
      _count: { _all: true },
    });
    progressBySaison = Object.fromEntries(
      progress.map((p) => [p.saisonId, p._count._all]),
    );
  }

  // 4. Map { slug -> { totalEpisodes, completedProgressCount, ... } }
  const saisonStats: Record<
    string,
    {
      slug: string;
      title: string;
      totalEpisodes: number;
      completedProgress: number;
      isAvailable: boolean;
    }
  > = {};
  for (const s of tenantSaisons) {
    saisonStats[s.slug] = {
      slug: s.slug,
      title: s.title,
      totalEpisodes: s._count.episodes,
      completedProgress: progressBySaison[s.id] ?? 0,
      isAvailable: true,
    };
  }

  // 5. Pour chaque article NIS2, agrege les completion ratios des saisons
  const articleScores: Nis2TenantArticleScore[] = NIS2_ARTICLES_ORDER.map(
    (articleId) => {
      const meta = NIS2_ARTICLES[articleId];
      const saisons: Nis2TenantArticleScore["saisons"] = [];
      let totalCompletion = 0;
      let availableCount = 0;

      for (const slug of meta.coveredBySaisons) {
        const stats = saisonStats[slug];
        if (!stats) {
          // Saison non disponible dans le tenant
          saisons.push({
            slug,
            title: slug,
            completion: 0,
            isAvailable: false,
          });
          continue;
        }
        const denominator = stats.totalEpisodes * activeUsers;
        const completion =
          denominator === 0
            ? 0
            : Math.min(
                100,
                Math.round((stats.completedProgress / denominator) * 100),
              );
        saisons.push({
          slug,
          title: stats.title,
          completion,
          isAvailable: true,
        });
        totalCompletion += completion;
        availableCount += 1;
      }

      const score =
        availableCount === 0
          ? null
          : Math.round(totalCompletion / availableCount);

      return {
        article: articleId,
        title: meta.title,
        description: meta.description,
        score,
        saisons,
      };
    },
  );

  // 6. Score global = moyenne des articles non-null
  const scored = articleScores.filter((a) => a.score !== null);
  const globalScore =
    scored.length === 0
      ? 0
      : Math.round(
          scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length,
        );

  return {
    globalScore,
    articles: articleScores,
    activeUsersCount: activeUsers,
    computedAt: new Date().toISOString(),
  };
}
