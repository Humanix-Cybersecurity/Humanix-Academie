// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/modules - Catalogue des modules pédagogiques (activer/désactiver,
// réordonner, marquer obligatoire).
//
// REFONTE MAI 2026 : aligné design system Linear (PageHeader, Section).
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ModulesTable from "@/components/ModulesTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth déjà appliquée).
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  // Multi-tenant : saisons globales + custom du tenant courant
  const [saisons, configs] = await Promise.all([
    db.saison.findMany({
      where: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId }],
      },
      orderBy: { order: "asc" },
      include: {
        episodes: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
          select: {
            id: true,
            slug: true,
            title: true,
            order: true,
            durationMinutes: true,
            xpReward: true,
          },
        },
      },
    }),
    db.tenantSaisonConfig.findMany({ where: { tenantId } }),
  ]);

  // Stats de completion par saison (limite a tenant courant) :
  // pour chaque saison, on compte combien d'apprenants l'ont entamee/finie.
  const allEpisodeIds = saisons.flatMap((s) => s.episodes.map((e) => e.id));
  const progressStats = allEpisodeIds.length
    ? await db.progress.groupBy({
        by: ["episodeId", "status"],
        where: {
          episodeId: { in: allEpisodeIds },
          user: { tenantId },
        },
        _count: { _all: true },
        _avg: { score: true },
      })
    : [];
  // Map<episodeId, { completed: number, started: number, avgScore: number|null }>
  const statsByEpisode = new Map<
    string,
    { completed: number; started: number; avgScore: number | null }
  >();
  for (const row of progressStats) {
    const cur = statsByEpisode.get(row.episodeId) ?? {
      completed: 0,
      started: 0,
      avgScore: null,
    };
    if (row.status === "COMPLETED") {
      cur.completed += row._count._all;
      cur.avgScore = row._avg.score ?? cur.avgScore;
    } else if (row.status === "IN_PROGRESS") {
      cur.started += row._count._all;
    }
    statsByEpisode.set(row.episodeId, cur);
  }

  const configBySaison = new Map(configs.map((c) => [c.saisonId, c]));

  // Enrichi avec config tenant + tri par ordre effectif
  const enriched = saisons
    .map((s) => {
      const cfg = configBySaison.get(s.id);
      const totalMinutes = s.episodes.reduce(
        (acc, e) => acc + (e.durationMinutes ?? 6),
        0,
      );
      const totalXp = s.episodes.reduce(
        (acc, e) => acc + (e.xpReward ?? 50),
        0,
      );
      // Aggregation stats au niveau saison
      const episodeStats = s.episodes.map((e) => statsByEpisode.get(e.id));
      const completedSum = episodeStats.reduce(
        (acc, st) => acc + (st?.completed ?? 0),
        0,
      );
      const avgScores = episodeStats
        .map((st) => st?.avgScore)
        .filter((v): v is number => v !== null && v !== undefined);
      const saisonAvgScore = avgScores.length
        ? Math.round(
            avgScores.reduce((a, b) => a + b, 0) / avgScores.length,
          )
        : null;
      return {
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        coverEmoji: s.coverEmoji,
        baseOrder: s.order,
        episodesCount: s.episodes.length,
        totalMinutes,
        totalXp,
        isActive: cfg?.isActive ?? true,
        isMandatory: cfg?.isMandatory ?? false,
        customOrder: cfg?.customOrder ?? null,
        episodes: s.episodes.map((e) => ({
          slug: e.slug,
          title: e.title,
          order: e.order,
          durationMinutes: e.durationMinutes,
          xpReward: e.xpReward,
        })),
        completionsCount: completedSum,
        avgScore: saisonAvgScore,
      };
    })
    .sort(
      (a, b) => (a.customOrder ?? a.baseOrder) - (b.customOrder ?? b.baseOrder),
    );

  const activeCount = enriched.filter((s) => s.isActive).length;
  const mandatoryCount = enriched.filter((s) => s.isMandatory).length;

  return (
    <>
      <AdminPageHeader
        title="Modules"
        description="Gérez votre catalogue de sensibilisation : activez ce qui est pertinent, marquez les modules critiques comme obligatoires, ajustez l'ordre."
      />

      <div className="space-y-6 min-w-0">
        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Modules disponibles" value={enriched.length} />
          <StatCard
            label="Actifs pour vos équipes"
            value={activeCount}
            accent="emerald"
          />
          <StatCard
            label="Marqués obligatoires"
            value={mandatoryCount}
            accent="amber"
          />
        </div>

        {/* Catalogue principal */}
        <AdminSection
          title="Catalogue des modules"
          description="Active uniquement ce qui est pertinent pour ta PME. L'ordre détermine la séquence d'apprentissage proposée à tes équipes."
        >
          <ModulesTable saisons={enriched} />
        </AdminSection>

        {/* Bonnes pratiques */}
        <article className="rounded-xl border border-primary-500/20 bg-primary-50/40 dark:bg-blue-900/10 p-5">
          <h3 className="font-bold text-primary-600 dark:text-accent-300 mb-3 flex items-center gap-2">
            <span aria-hidden="true">💡</span>
            Bonnes pratiques
          </h3>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>
              Active 2 à 3 modules au démarrage pour éviter la surcharge
              cognitive.
            </li>
            <li>
              Marque comme <strong>obligatoires</strong> les modules critiques
              (phishing, mots de passe).
            </li>
            <li>
              Réorganise l'ordre selon tes priorités : commence par ce qui
              rapporte le plus vite (phishing).
            </li>
            <li>
              Tu peux désactiver un module à tout moment sans perdre la
              progression des collaborateurs (elle est conservée).
            </li>
          </ul>
        </article>
      </div>
    </>
  );
}

// =============================================================================
// Sous-composants locaux
// =============================================================================

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber" | "rose";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : accent === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : "text-gray-900 dark:text-gray-100";
  return (
    <article className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
        {label}
      </p>
      <p
        className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums ${accentClass}`}
      >
        {value}
      </p>
    </article>
  );
}
