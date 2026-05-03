// Calcul des metriques GRC pour un tenant donne.
// Centralise les requetes Prisma pour eviter de les dupliquer dans l'endpoint
// /api/v1/evidence-export et dans la page /integrations/ciso-assistant (preview).

import { db } from "@/lib/db";
import type { ArtifactSource } from "@/lib/mapping-grc";

export type GrcMetrics = {
  tenantScore: number; // 0-1, score de maturite cyber humaine
  completionRate: number; // 0-1, taux de completion sensibilisation
  phishingReportRate: number; // 0-1, taux de signalement phishing
  totalUsers: number;
  activeUsers: number;
  totalEpisodes: number;
  completedEpisodes: number;
  certificatesCount: number;
  marketplaceModulesActive: number;
  // Map slug -> 0/1 pour les filtres specifiques
  modulesBySlug: Record<string, number>;
  // Map category -> count
  modulesByCategory: Record<string, number>;
};

/**
 * Calcule en une seule passe l'ensemble des metriques GRC d'un tenant.
 * Optimise : 4 requetes Prisma en parallele.
 */
export async function computeGrcMetrics(tenantId: string): Promise<GrcMetrics> {
  const [users, saisons, allProgress, customSaisons] = await Promise.all([
    db.user.findMany({
      where: { tenantId, isActive: true, role: "LEARNER" },
      select: { id: true, role: true },
    }),
    db.saison.findMany({
      where: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId }],
      },
      include: { episodes: { select: { id: true } } },
    }),
    db.progress.findMany({
      where: { tenantId },
      select: {
        userId: true,
        episodeId: true,
        status: true,
        quizScorePct: true,
      },
    }),
    db.saison.findMany({
      where: { tenantId, sourceModuleId: { not: null } },
      select: { sourceModuleId: true },
    }),
  ]);

  const totalUsers = users.length;
  const totalEpisodes = saisons.reduce(
    (s: number, sa: { episodes: { id: string }[] }) => s + sa.episodes.length,
    0,
  );
  const completed = allProgress.filter(
    (p: { status: string }) => p.status === "COMPLETED",
  );
  const seenAtLeastOne = new Set(
    allProgress.map((p: { userId: string }) => p.userId),
  ).size;
  const activationRate = totalUsers === 0 ? 0 : seenAtLeastOne / totalUsers;
  const completionRate =
    totalUsers === 0 || totalEpisodes === 0
      ? 0
      : completed.length / (totalUsers * totalEpisodes);

  // Score tenant : 40% activation + 60% completion ponderes par scores quiz
  const avgQuizScore =
    completed.length === 0
      ? 0
      : completed.reduce(
          (s: number, p: { quizScorePct: number | null }) =>
            s + (p.quizScorePct ?? 70),
          0,
        ) /
        completed.length /
        100;
  const tenantScore = Math.min(
    1,
    activationRate * 0.4 + completionRate * 0.4 + avgQuizScore * 0.2,
  );

  // Phishing : taux de signalement (events / users)
  const phishingReportEvents = await db.event
    .count({ where: { tenantId, type: "phishing.report" } })
    .catch(() => 0);
  const phishingReportRate =
    totalUsers === 0 ? 0 : Math.min(1, phishingReportEvents / totalUsers);

  // Certificats : on compte les utilisateurs ayant termine au moins une saison complete
  const completedByUser: Record<string, Set<string>> = {};
  for (const p of completed as { userId: string; episodeId: string }[]) {
    completedByUser[p.userId] ??= new Set();
    completedByUser[p.userId].add(p.episodeId);
  }
  let certificatesCount = 0;
  for (const sa of saisons as { episodes: { id: string }[] }[]) {
    const epIds = new Set(sa.episodes.map((e: { id: string }) => e.id));
    for (const userId of Object.keys(completedByUser)) {
      const userEps = completedByUser[userId];
      const allDone = [...epIds].every((id: string) => userEps.has(id));
      if (allDone) certificatesCount += 1;
    }
  }

  // Marketplace : modules actifs sur le tenant (saisons custom liees)
  const moduleIds = customSaisons
    .map((s: { sourceModuleId: string | null }) => s.sourceModuleId)
    .filter((id: string | null): id is string => id !== null);
  const marketplaceModulesActive = moduleIds.length;

  let modulesBySlug: Record<string, number> = {};
  let modulesByCategory: Record<string, number> = {};
  if (moduleIds.length > 0) {
    const modules = await db.marketplaceModule.findMany({
      where: { id: { in: moduleIds } },
      select: { slug: true, category: true },
    });
    for (const m of modules as { slug: string; category: string }[]) {
      modulesBySlug[m.slug] = 1;
      modulesByCategory[m.category] = (modulesByCategory[m.category] ?? 0) + 1;
    }
  }

  return {
    tenantScore,
    completionRate,
    phishingReportRate,
    totalUsers,
    activeUsers: seenAtLeastOne,
    totalEpisodes,
    completedEpisodes: completed.length,
    certificatesCount,
    marketplaceModulesActive,
    modulesBySlug,
    modulesByCategory,
  };
}

/**
 * Resout un ArtifactSource en valeur metric (0-1) si applicable, sinon null.
 */
export function resolveMetricValue(
  artifact: ArtifactSource,
  metrics: GrcMetrics,
): number | null {
  switch (artifact.source) {
    case "tenant_score":
      return metrics.tenantScore;
    case "completion_rate":
      return metrics.completionRate;
    case "phishing_report_rate":
      return metrics.phishingReportRate;
    case "marketplace_modules": {
      const slug = artifact.filter?.slug as string | undefined;
      const category = artifact.filter?.category as string | undefined;
      if (slug) return metrics.modulesBySlug[slug] ?? 0;
      if (category)
        return (metrics.modulesByCategory[category] ?? 0) > 0 ? 1 : 0;
      return metrics.marketplaceModulesActive > 0 ? 1 : 0;
    }
    default:
      return null;
  }
}

/**
 * Construit l'URL publique d'un artifact a partir de sa source logique.
 * Le baseUrl est passe par l'endpoint pour absoluifier les liens.
 */
export function resolveArtifactUrl(
  artifact: ArtifactSource,
  baseUrl: string,
  tenantId: string,
): string | null {
  switch (artifact.source) {
    case "user_certificates":
      return `${baseUrl}/api/me/certificate?tenant=${tenantId}&bulk=true`;
    case "pack_nis2_pdf":
      return `${baseUrl}/api/admin/pack-nis2/download?tenant=${tenantId}`;
    case "registre_traitements_pdf":
      return `${baseUrl}/registre-traitements`;
    case "dpa_pdf":
      return `${baseUrl}/dpa`;
    case "audit_trail":
      return `${baseUrl}/api/admin/audit-trail?tenant=${tenantId}`;
    case "incident_procedure":
      return `${baseUrl}/api/admin/pack-nis2/download?tenant=${tenantId}#incident`;
    default:
      return null;
  }
}
