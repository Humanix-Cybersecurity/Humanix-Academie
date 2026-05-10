"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// AdminDashboard - Console dirigeant v3 (mai 2026, refonte Linear/Vercel-like).
//
// Refonte Sprint 2 (juin 2026) : decomposition du fichier monolithique
// (1357 lignes) en widgets composables sous components/admin/dashboard/.
// Ce fichier ne fait plus que de l'orchestration : il assemble les widgets,
// chacun teste et lisible isolement.
//
// Design principle : un DG non-tech doit comprendre l'état cyber de sa boîte
// en 30 secondes, sans aucune doc, sans cliquer sur un tooltip.
//
// Hiérarchie de lecture (top-down) :
//   1. Cyberscore HERO - le seul chiffre qui compte
//   2. Actions urgentes - 3 max, avec verbe et 1 clic
//   3. KPI strip - 4 indicateurs avec sparklines
//   4. Suivi équipe - table filtrable
//   5. Bloc visualisations (couverture saisons / top 3 / activité / engagement)
//
// Contrat de Props : INCHANGE (compatible avec app/admin/page.tsx existant).
// =============================================================================

import { useMemo } from "react";
import { computeCyberscore } from "@/lib/cyber-score";
import CyberscoreHero from "@/components/admin/dashboard/CyberscoreHero";
import UrgentActions, {
  buildRecommendations,
} from "@/components/admin/dashboard/UrgentActions";
import KpiStrip from "@/components/admin/dashboard/KpiStrip";
import TeamTable from "@/components/admin/dashboard/TeamTable";
import SaisonsCoverage from "@/components/admin/dashboard/SaisonsCoverage";
import TopPerformers from "@/components/admin/dashboard/TopPerformers";
import ActivityChart from "@/components/admin/dashboard/ActivityChart";
import EngagementMini from "@/components/admin/dashboard/EngagementMini";
import type {
  Stats,
  SaisonRow,
  TeamRow,
  WeeklyPoint,
} from "@/components/admin/dashboard/types";

type Props = {
  stats: Stats;
  saisonsBreakdown: SaisonRow[];
  teamProgress: TeamRow[];
  weeklyActivity: WeeklyPoint[];
};

export default function AdminDashboard({
  stats,
  saisonsBreakdown,
  teamProgress,
  weeklyActivity,
}: Props) {
  // Cyberscore SEVERE (mai 2026) - cf. lib/cyber-score.ts
  // Privilegie la severite pour ne jamais induire de fausse confiance.
  const cyberscoreData = useMemo(
    () => computeCyberscore(stats, saisonsBreakdown, teamProgress),
    [stats, saisonsBreakdown, teamProgress],
  );

  const recommendations = useMemo(
    () =>
      buildRecommendations(stats, saisonsBreakdown, teamProgress).slice(0, 3),
    [stats, saisonsBreakdown, teamProgress],
  );

  return (
    <div className="space-y-6 min-w-0">
      <CyberscoreHero
        breakdown={cyberscoreData}
        totalSeats={stats.totalSeats}
        activatedSeats={stats.activatedSeats}
      />

      {recommendations.length > 0 && (
        <UrgentActions actions={recommendations} />
      )}

      <KpiStrip stats={stats} weeklyActivity={weeklyActivity} />

      {/* On remonte la table équipe : plus dense, plus utile pour le pilotage
          quotidien. Les visualisations synthétiques descendent en bas. */}
      <TeamTable rows={teamProgress} />

      {/* Layout équilibré "1 grand + 3 empilés" :
          - GAUCHE (col-7) : Couverture par saison
          - DROITE (col-5) : Top 3 / Activité / Engagement empilés */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <SaisonsCoverage data={saisonsBreakdown} className="lg:col-span-7" />

        <div className="lg:col-span-5 flex flex-col gap-4">
          <TopPerformers team={teamProgress} />
          <ActivityChart data={weeklyActivity} />
          <EngagementMini
            averageXpPerEpisode={stats.averageXpPerEpisode}
            totalXP={stats.totalXP}
          />
        </div>
      </div>

      <details className="group rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-gray-600 dark:text-gray-400 list-none flex items-center gap-2 hover:text-primary-500 dark:hover:text-accent-300">
          <span
            className="text-gray-400 group-open:rotate-90 transition-transform"
            aria-hidden="true"
          >
            ▸
          </span>
          Comment lire ces indicateurs ?
        </summary>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2 text-gray-600 dark:text-gray-400 leading-relaxed">
          <p>
            <strong className="text-gray-900 dark:text-gray-200">
              Cyberscore
            </strong>{" "}
            : composite activation (40&nbsp;%) + complétion (60&nbsp;%).
            Indicateur de pilotage rapide.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-200">
              Maîtrise cyber
            </strong>{" "}
            : moyenne du risk score individuel (0–100). Vrai indicateur de
            maturité humaine.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-200">
              Activation
            </strong>{" "}
            : % de collaborateurs ayant lancé au moins un module. Cible
            ≥&nbsp;80&nbsp;%.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-200">
              XP / épisode
            </strong>{" "}
            : indicateur de gamification. Peut dépasser 100. Pas un score de
            maîtrise.
          </p>
        </div>
      </details>
    </div>
  );
}
