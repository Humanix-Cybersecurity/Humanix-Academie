"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// AdminDashboard — Console dirigeant v3 (mai 2026, refonte Linear/Vercel-like).
//
// Design principle : un DG non-tech doit comprendre l'état cyber de sa boîte
// en 30 secondes, sans aucune doc, sans cliquer sur un tooltip.
//
// Hiérarchie de lecture (top-down) :
//   1. Cyberscore HERO — le seul chiffre qui compte, énorme, contextualisé
//   2. Actions urgentes — 3 max, avec verbe d'action et 1 clic pour résoudre
//   3. KPI strip — 4 indicateurs avec sparklines (barres mini) inline
//   4. Activité 7j — UN gros chart (pas 2 côte à côte qui se font la guerre)
//   5. Couverture saisons — barres horizontales, scannable
//   6. Top 3 + Engagement — sociale légère (pas top 5, on garde l'essentiel)
//   7. Suivi équipe — table filtrable (déjà OK depuis refonte précédente)
//
// Contrat de Props : INCHANGE (compatible avec app/admin/page.tsx existant).
// =============================================================================

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { computeCyberscore, type CyberscoreBreakdown } from "@/lib/cyber-score";

// =============================================================================
// Types Props (inchangés)
// =============================================================================

type Stats = {
  totalSeats: number;
  activatedSeats: number;
  activationRate: number;
  completedEpisodes: number;
  totalEpisodes: number;
  averageXpPerEpisode: number;
  masteryAverage: number;
  totalXP: number;
};

type SaisonRow = {
  name: string;
  emoji: string;
  completed: number;
  total: number;
  pct: number;
};

type TeamRow = {
  name: string;
  service: string;
  episodesDone: number;
  totalEpisodes: number;
  xp: number;
  lastActivity: string | null;
};

type WeeklyPoint = { day: string; completions: number };

type Props = {
  stats: Stats;
  saisonsBreakdown: SaisonRow[];
  teamProgress: TeamRow[];
  weeklyActivity: WeeklyPoint[];
};

// =============================================================================
// Helpers — statut couleur
// =============================================================================

type Level = "excellent" | "ok" | "warning" | "danger";

function levelFromScore(score: number): Level {
  if (score >= 80) return "excellent";
  if (score >= 60) return "ok";
  if (score >= 40) return "warning";
  return "danger";
}

const LEVEL_META: Record<
  Level,
  {
    label: string;
    text: string;
    bg: string;
    bar: string;
    hex: string;
  }
> = {
  excellent: {
    label: "Excellent",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    bar: "bg-emerald-500",
    hex: "#10b981",
  },
  ok: {
    label: "Correct",
    text: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    bar: "bg-teal-500",
    hex: "#14b8a6",
  },
  warning: {
    label: "À surveiller",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    bar: "bg-amber-500",
    hex: "#f59e0b",
  },
  danger: {
    label: "Critique",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    bar: "bg-rose-500",
    hex: "#f43f5e",
  },
};

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export default function AdminDashboard({
  stats,
  saisonsBreakdown,
  teamProgress,
  weeklyActivity,
}: Props) {
  // Cyberscore SÉVÈRE (mai 2026) — cf. lib/cyber-score.ts
  // Privilégie la sévérité pour ne jamais induire de fausse confiance.
  // 3 composantes (activation 25 + maîtrise 50 + fondamentaux 25) + pénalités
  // explicites + courbe concave. 100/100 mathématiquement quasi-impossible.
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

      {/* Inversion mai 2026 : on remonte la table équipe (plus dense, plus
          utile pour le pilotage quotidien) et on descend les visualisations
          synthétiques en bas. Équilibre mieux le rythme top-down. */}
      <TeamTable rows={teamProgress} />

      {/* Layout équilibré "1 grand + 3 empilés" :
          - GAUCHE (col-7) : Couverture par saison (le plus dense, le plus haut)
          - DROITE (col-5) : 3 blocs empilés verticalement (Top 3 / Activité / Engagement)
          Le SaisonsCoverage utilise h-full pour matcher la hauteur totale
          de la stack droite. Visuellement équilibré quel que soit le nombre
          de saisons et de collaborateurs. */}
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

// =============================================================================
// SECTION : Hero Cyberscore
// =============================================================================

// Mapping niveau cyberscore -> Level UI (5 niveaux côté score, 4 niveaux côté UI)
function cyberscoreLevelToUiLevel(lvl: CyberscoreBreakdown["level"]): Level {
  if (lvl === "excellent" || lvl === "bon") return "excellent";
  if (lvl === "correct") return "ok";
  if (lvl === "warning") return "warning";
  return "danger";
}

function CyberscoreHero({
  breakdown,
  totalSeats,
  activatedSeats,
}: {
  breakdown: CyberscoreBreakdown;
  totalSeats: number;
  activatedSeats: number;
}) {
  const uiLvl = cyberscoreLevelToUiLevel(breakdown.level);
  const meta = LEVEL_META[uiLvl];

  return (
    <section
      aria-label="Vue d'ensemble"
      className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="78%"
                outerRadius="100%"
                data={[
                  { name: "Score", value: breakdown.score, fill: meta.hex },
                ]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background={{ fill: "rgba(0,0,0,0.06)" }}
                  dataKey="value"
                  cornerRadius={20}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-3xl sm:text-4xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
                {breakdown.score}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">
                / 100
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
              Cyberscore
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold leading-tight mt-0.5">
              <span className={meta.text}>{breakdown.label}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              Maîtrise équipe&nbsp;:{" "}
              <strong className="text-gray-900 dark:text-gray-200 tabular-nums">
                {breakdown.components.mastery.score * 2}/100
              </strong>
              <span
                className="mx-2 text-gray-300 dark:text-slate-600"
                aria-hidden="true"
              >
                ·
              </span>
              Activation&nbsp;:{" "}
              <strong className="text-gray-900 dark:text-gray-200 tabular-nums">
                {activatedSeats}/{totalSeats}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex flex-row lg:flex-col gap-2 shrink-0">
          <a
            href="/api/admin/conformity-report"
            download
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold px-4 py-2.5 text-sm transition shadow-sm"
          >
            <span aria-hidden="true">📄</span>
            <span>Exporter conformité</span>
          </a>
          <a
            href="/admin/business"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-accent-500 dark:hover:border-accent-500 text-gray-700 dark:text-gray-200 hover:text-accent-500 dark:hover:text-accent-300 font-semibold px-4 py-2.5 text-sm transition"
          >
            <span aria-hidden="true">💼</span>
            <span>Impact business</span>
          </a>
        </div>
      </div>

      {/* Détail pédagogique du score — pliable, transparent, sans condescendance */}
      <ScoreBreakdownDetail breakdown={breakdown} />
    </section>
  );
}

// =============================================================================
// SECTION : Détail pédagogique du Cyberscore (pliable)
// =============================================================================

function ScoreBreakdownDetail({
  breakdown,
}: {
  breakdown: CyberscoreBreakdown;
}) {
  return (
    <details className="group mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
      <summary className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-accent-300 list-none">
        <span
          aria-hidden="true"
          className="text-gray-400 group-open:rotate-90 transition-transform"
        >
          ▸
        </span>
        <span>Comment ce score est calculé&nbsp;?</span>
        <span className="ml-auto text-gray-400 italic">
          Note de sévérité&nbsp;: élevée
        </span>
      </summary>

      <div className="mt-4 space-y-4 text-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">
          En cyber, mieux vaut un score sévère qu'un score complaisant. Cette
          note intègre 3 composantes pondérées + des pénalités explicites pour
          refléter le risque réel — pas le confort de lecture.
        </p>

        {/* Composantes */}
        <div className="space-y-2">
          <ScoreComponent {...breakdown.components.activation} />
          <ScoreComponent {...breakdown.components.mastery} />
          <ScoreComponent {...breakdown.components.fundamentals} />
        </div>

        {/* Pénalités si présentes */}
        {breakdown.penalties.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-2">
              <span aria-hidden="true">⚠️</span>
              Pénalités appliquées ({breakdown.penalties.length})
            </p>
            <ul className="space-y-1.5 list-none">
              {breakdown.penalties.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs bg-rose-50/60 dark:bg-rose-900/15 rounded-md p-2.5 border border-rose-100 dark:border-rose-900/40"
                >
                  <span className="shrink-0 font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                    −{p.points}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-rose-700 dark:text-rose-300">
                      {p.label}
                    </p>
                    <p className="text-rose-700/80 dark:text-rose-300/80 mt-0.5 leading-snug">
                      {p.reason}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Calcul résumé */}
        <div className="pt-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-gray-400">
          <p className="leading-relaxed">
            Score brut&nbsp;:{" "}
            <strong className="text-gray-700 dark:text-gray-300 tabular-nums">
              {breakdown.raw}/100
            </strong>
            <span
              className="mx-1.5 text-gray-300 dark:text-slate-600"
              aria-hidden="true"
            >
              →
            </span>
            courbe concave (ø1.25)
            {breakdown.penalties.length > 0 && (
              <>
                <span
                  className="mx-1.5 text-gray-300 dark:text-slate-600"
                  aria-hidden="true"
                >
                  →
                </span>
                <span className="text-rose-600 dark:text-rose-400">
                  −{breakdown.penalties.reduce((s, p) => s + p.points, 0)}
                  &nbsp;pénalités
                </span>
              </>
            )}
            <span
              className="mx-1.5 text-gray-300 dark:text-slate-600"
              aria-hidden="true"
            >
              =
            </span>
            <strong className="text-gray-900 dark:text-gray-100 tabular-nums">
              {breakdown.score}/100
            </strong>
          </p>
          <p className="mt-2 text-[11px]">
            Seuils&nbsp;:
            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">
              85+ Excellent
            </span>{" "}
            ·
            <span className="ml-1.5 text-teal-600 dark:text-teal-400">
              70+ Bon
            </span>{" "}
            ·
            <span className="ml-1.5 text-gray-600 dark:text-gray-400">
              55+ Correct
            </span>{" "}
            ·
            <span className="ml-1.5 text-amber-600 dark:text-amber-400">
              40+ À surveiller
            </span>{" "}
            ·
            <span className="ml-1.5 text-rose-600 dark:text-rose-400">
              &lt;40 Critique
            </span>
          </p>
        </div>
      </div>
    </details>
  );
}

function ScoreComponent({
  score,
  max,
  label,
  explanation,
}: {
  score: number;
  max: number;
  label: string;
  explanation: string;
}) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
            {label}
          </span>
          <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
            {score}
            <span className="text-gray-400 font-normal">/{max}</span>
          </span>
        </div>
        <div className="h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
          {explanation}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// SECTION : Actions urgentes (max 3)
// =============================================================================

type Action = {
  level: "danger" | "warning" | "info";
  icon: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
};

function buildRecommendations(
  stats: Stats,
  saisons: SaisonRow[],
  team: TeamRow[],
): Action[] {
  const actions: Action[] = [];

  if (stats.totalSeats > 0 && stats.activationRate < 80) {
    const inactifs = stats.totalSeats - stats.activatedSeats;
    actions.push({
      level: stats.activationRate < 50 ? "danger" : "warning",
      icon: "🎯",
      title: `Activation à ${stats.activationRate}%`,
      description: `${inactifs} collaborateur${inactifs > 1 ? "s" : ""} n'${inactifs > 1 ? "ont" : "a"} pas commencé.`,
      cta: { label: "Relancer", href: "/admin/utilisateurs?filter=inactive" },
    });
  }

  if (stats.totalSeats > 0 && stats.masteryAverage < 60) {
    actions.push({
      level: stats.masteryAverage < 40 ? "danger" : "warning",
      icon: "🛡️",
      title: `Maîtrise à ${stats.masteryAverage}/100`,
      description:
        "Sous le seuil de sécurité. Un challenge collectif aide à booster.",
      cta: { label: "Lancer un challenge", href: "/admin/challenge" },
    });
  }

  const worst = saisons
    .filter((s) => s.total > 0)
    .sort((a, b) => a.pct - b.pct)[0];
  if (worst && worst.pct < 40 && stats.totalSeats >= 3) {
    actions.push({
      level: "warning",
      icon: worst.emoji || "📚",
      title: `Saison « ${worst.name} » à ${worst.pct}%`,
      description: `${worst.completed}/${worst.total} équipiers ont terminé.`,
      cta: { label: "Voir le module", href: "/admin/modules" },
    });
  }

  const dormants = team.filter(
    (t) => t.lastActivity === null && t.episodesDone === 0,
  ).length;
  if (dormants >= 3) {
    actions.push({
      level: "info",
      icon: "📨",
      title: `${dormants} jamais connectés`,
      description: "Une campagne de relance ou un kick-off peut débloquer.",
      cta: { label: "Voir la liste", href: "/admin/utilisateurs?filter=never" },
    });
  }

  return actions;
}

const ACTION_STYLES: Record<
  Action["level"],
  { border: string; iconBg: string; titleText: string; btn: string }
> = {
  danger: {
    border: "border-rose-200 dark:border-rose-900/50",
    iconBg: "bg-rose-50 dark:bg-rose-900/20",
    titleText: "text-rose-700 dark:text-rose-300",
    btn: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  warning: {
    border: "border-amber-200 dark:border-amber-900/50",
    iconBg: "bg-amber-50 dark:bg-amber-900/20",
    titleText: "text-amber-700 dark:text-amber-300",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    border: "border-teal-200 dark:border-teal-900/50",
    iconBg: "bg-teal-50 dark:bg-teal-900/20",
    titleText: "text-teal-700 dark:text-teal-300",
    btn: "bg-teal-600 hover:bg-teal-700 text-white",
  },
};

function UrgentActions({ actions }: { actions: Action[] }) {
  return (
    <section aria-label="Actions urgentes">
      <div className="flex items-baseline justify-between mb-2.5 px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span aria-hidden="true">⚠️</span>À faire maintenant
        </h2>
        <span className="text-[11px] text-gray-400 tabular-nums">
          {actions.length} action{actions.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 list-none">
        {actions.map((a, i) => {
          const s = ACTION_STYLES[a.level];
          return (
            <li
              key={i}
              className={`group relative rounded-xl border ${s.border} bg-white dark:bg-slate-900 p-3.5 flex flex-col gap-3 hover:shadow-sm transition`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`shrink-0 w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center text-lg`}
                  aria-hidden="true"
                >
                  {a.icon}
                </span>
                <div className="min-w-0">
                  <p className={`font-bold text-sm ${s.titleText} truncate`}>
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
                    {a.description}
                  </p>
                </div>
              </div>
              <a
                href={a.cta.href}
                className={`inline-flex items-center justify-center gap-1 self-start rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${s.btn}`}
              >
                {a.cta.label}
                <span aria-hidden="true">→</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// =============================================================================
// SECTION : KPI STRIP avec sparklines
// =============================================================================

function KpiStrip({
  stats,
  weeklyActivity,
}: {
  stats: Stats;
  weeklyActivity: WeeklyPoint[];
}) {
  const completionRate =
    stats.totalEpisodes * stats.totalSeats === 0
      ? 0
      : Math.round(
          (stats.completedEpisodes / (stats.totalEpisodes * stats.totalSeats)) *
            100,
        );

  return (
    <section
      aria-label="Indicateurs clés"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      <KpiCard
        label="Sièges actifs"
        value={stats.totalSeats}
        delta={`${stats.activatedSeats} ont commencé`}
        progress={stats.activationRate}
        level={levelFromScore(stats.activationRate)}
        sparkline={weeklyActivity}
      />
      <KpiCard
        label="Maîtrise cyber"
        value={`${stats.masteryAverage}/100`}
        delta="Risk score moyen"
        progress={stats.masteryAverage}
        level={levelFromScore(stats.masteryAverage)}
        highlight
      />
      <KpiCard
        label="Modules complétés"
        value={stats.completedEpisodes}
        delta={`sur ${stats.totalEpisodes * stats.totalSeats} possibles`}
        progress={completionRate}
        level={levelFromScore(completionRate)}
      />
      <KpiCard
        label="Engagement XP"
        value={stats.averageXpPerEpisode}
        delta="moyenne / épisode"
        progress={Math.min(100, stats.averageXpPerEpisode / 1.5)}
        level={stats.averageXpPerEpisode >= 80 ? "excellent" : "ok"}
      />
    </section>
  );
}

function KpiCard({
  label,
  value,
  delta,
  progress,
  level,
  highlight,
  sparkline,
}: {
  label: string;
  value: string | number;
  delta: string;
  progress: number;
  level: Level;
  highlight?: boolean;
  sparkline?: WeeklyPoint[];
}) {
  const meta = LEVEL_META[level];
  return (
    <article
      className={`group relative rounded-xl border bg-white dark:bg-slate-900 p-4 transition-all hover:shadow-sm overflow-hidden min-w-0
        ${
          highlight
            ? "border-accent-500/40 ring-1 ring-accent-500/10"
            : "border-gray-200 dark:border-slate-800"
        }`}
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1.5">
        {label}
        {highlight && (
          <span className="text-accent-500" aria-hidden="true">
            ★
          </span>
        )}
      </p>

      <div className="flex items-baseline justify-between mt-1.5 gap-2">
        <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </p>
        {sparkline && sparkline.length > 0 && (
          <div className="w-16 h-8 opacity-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sparkline}>
                <Bar
                  dataKey="completions"
                  fill={meta.hex}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
        {delta}
      </p>

      <div className="mt-3 w-full h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${meta.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </article>
  );
}

// =============================================================================
// SECTION : Activity chart
// =============================================================================

function ActivityChart({
  data,
  className = "",
}: {
  data: WeeklyPoint[];
  className?: string;
}) {
  const total = data.reduce((s, p) => s + p.completions, 0);
  // Stats secondaires utiles : moyenne/jour + meilleur jour. Affichées en
  // footer compact, donnent du contexte au DG sans alourdir.
  const avgPerDay = data.length === 0 ? 0 : Math.round(total / data.length);
  const bestDay = data.reduce(
    (best, p) => (p.completions > (best?.completions ?? -1) ? p : best),
    data[0],
  );

  return (
    // Card autoportante (plus de h-full forcé : on est dans une stack vertical
    // à droite, taille naturelle suffit). Chart à 160px (compact, lisible).
    <article
      className={`rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0 ${className}`}
    >
      <header className="flex items-baseline justify-between mb-2 gap-2">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
          Activité de la semaine
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {total}
          </span>{" "}
          complétions
        </p>
      </header>

      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barSize={20}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              stroke="#9ca3af"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              stroke="#9ca3af"
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,163,161,0.06)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 11,
              }}
              formatter={(v: number) => [
                `${v} épisode${v > 1 ? "s" : ""}`,
                "Complétions",
              ]}
            />
            <Bar dataKey="completions" radius={[5, 5, 0, 0]}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === data.length - 1 ? "#0B3D91" : "#00A3A1"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <footer className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {avgPerDay}
          </span>{" "}
          moy./jour
        </span>
        {bestDay && bestDay.completions > 0 && (
          <span className="text-gray-500 dark:text-gray-400">
            Top&nbsp;:&nbsp;
            <span className="font-bold text-gray-900 dark:text-gray-100 capitalize">
              {bestDay.day}
            </span>{" "}
            <span className="font-bold text-accent-500 tabular-nums">
              ({bestDay.completions})
            </span>
          </span>
        )}
      </footer>
    </article>
  );
}

// =============================================================================
// SECTION : Couverture saisons
// =============================================================================

function SaisonsCoverage({
  data,
  className = "",
}: {
  data: SaisonRow[];
  className?: string;
}) {
  return (
    // h-full pour matcher la hauteur de l'ActivityChart en grid (les 2 cards
    // sont sur la même row).
    <article
      className={`h-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 min-w-0 ${className}`}
    >
      <header className="flex items-baseline justify-between mb-4 gap-2">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">
          Couverture par saison
        </h3>
        <p className="text-xs text-gray-500">
          {data.length} saison{data.length > 1 ? "s" : ""}
        </p>
      </header>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-8">
          Aucune saison publiée.
        </p>
      ) : (
        <ul className="space-y-3 list-none">
          {data.map((s) => {
            const lvl = levelFromScore(s.pct);
            const meta = LEVEL_META[lvl];
            return (
              <li key={s.name}>
                <div className="flex justify-between text-sm mb-1 gap-2">
                  <span className="font-medium truncate flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                    <span aria-hidden="true">{s.emoji}</span>
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                    {s.completed}/{s.total} ·{" "}
                    <span className={`font-bold ${meta.text}`}>{s.pct}%</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${meta.bar}`}
                    style={{ width: `${Math.min(100, s.pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

// =============================================================================
// SECTION : Top 3 performers
// =============================================================================

function TopPerformers({
  team,
  className = "",
}: {
  team: TeamRow[];
  className?: string;
}) {
  return (
    // Compact (plus de h-full) car c'est dans une stack verticale à droite.
    <article
      className={`rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0 ${className}`}
    >
      <header className="flex items-baseline justify-between mb-3 gap-2">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
          Top 3 collaborateurs
        </h3>
        <p className="text-[10px] text-gray-400 italic uppercase tracking-wide">
          Visible dirigeant
        </p>
      </header>
      {team.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-4">
          Aucun collaborateur actif.
        </p>
      ) : (
        <ol className="space-y-1.5 list-none">
          {team.slice(0, 3).map((u, i) => (
            <li
              key={u.name + i}
              className="flex items-center gap-2.5 px-1 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800/40 transition"
            >
              <span
                className={`shrink-0 w-8 h-8 rounded-md font-bold flex items-center justify-center text-sm
                  ${
                    i === 0
                      ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                      : i === 1
                        ? "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-200"
                        : "bg-orange-100 text-orange-700"
                  }`}
              >
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100 leading-tight">
                  {u.name}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {u.service}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-extrabold text-accent-500 tabular-nums text-sm">
                  {u.xp}
                </p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide leading-none">
                  XP
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

// =============================================================================
// SECTION : Engagement mini
// =============================================================================

function EngagementMini({
  averageXpPerEpisode,
  totalXP,
  className = "",
}: {
  averageXpPerEpisode: number;
  totalXP: number;
  className?: string;
}) {
  return (
    // Compact (stack vertical à droite, plus de h-full).
    <article
      className={`rounded-xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 p-4 min-w-0 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="shrink-0 w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-base"
            aria-hidden="true"
          >
            🎮
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-300 leading-tight">
              Engagement
            </p>
            <p className="text-[10px] text-amber-800/70 dark:text-amber-200/70 leading-tight">
              Gamification, pas un score
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums leading-none">
            {averageXpPerEpisode}
          </p>
          <p className="text-[10px] text-amber-800/80 dark:text-amber-200/80 mt-0.5">
            XP / épisode
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/50 flex items-center justify-between text-[11px]">
        <span className="text-amber-800/80 dark:text-amber-200/80">
          Total cumulé
        </span>
        <span className="font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
          {totalXP.toLocaleString("fr-FR")}
        </span>
      </div>
    </article>
  );
}

// =============================================================================
// SECTION : Table équipe (filtrable, déjà responsive)
// =============================================================================

type SortKey = "name" | "service" | "progress" | "xp" | "lastActivity";

function TeamTable({ rows }: { rows: TeamRow[] }) {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("xp");
  const [sortAsc, setSortAsc] = useState(false);

  const services = useMemo(() => {
    const set = new Set(rows.map((r) => r.service));
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let res = rows.filter((r) => {
      if (serviceFilter !== "all" && r.service !== serviceFilter) return false;
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.service.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    res = [...res].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "fr");
      else if (sortKey === "service")
        cmp = a.service.localeCompare(b.service, "fr");
      else if (sortKey === "xp") cmp = a.xp - b.xp;
      else if (sortKey === "progress") {
        const pa = a.totalEpisodes ? a.episodesDone / a.totalEpisodes : 0;
        const pb = b.totalEpisodes ? b.episodesDone / b.totalEpisodes : 0;
        cmp = pa - pb;
      } else if (sortKey === "lastActivity") {
        cmp = (a.lastActivity ? 1 : 0) - (b.lastActivity ? 1 : 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return res;
  }, [rows, search, serviceFilter, sortKey, sortAsc]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  }

  return (
    <section
      aria-label="Suivi équipe complet"
      className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 min-w-0"
    >
      <header className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">
            Suivi équipe
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="tabular-nums">{filtered.length}</span> /{" "}
            <span className="tabular-nums">{rows.length}</span> collaborateur
            {rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <label className="relative flex-1 sm:flex-none">
            <span className="sr-only">Rechercher</span>
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
            >
              🔎
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full sm:w-44 lg:w-52 pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:border-accent-500 focus:outline-none"
            />
          </label>
          {services.length > 2 && (
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              aria-label="Filtrer par service"
              className="py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:border-accent-500 focus:outline-none max-w-[140px] truncate"
            >
              {services.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Tous" : s}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <table className="w-full text-sm table-auto">
        <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
          <tr>
            <Th
              label="Collaborateur"
              k="name"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
            />
            <Th
              label="Service"
              k="service"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
              hideUnder="md"
            />
            <Th
              label="Progression"
              k="progress"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
            />
            <Th
              label="XP"
              k="xp"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
              numeric
            />
            <Th
              label="Dernière activité"
              k="lastActivity"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
              hideUnder="xl"
            />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="py-10 text-center text-gray-400 italic"
              >
                Aucun résultat.
              </td>
            </tr>
          )}
          {filtered.map((u, i) => {
            const pct =
              u.totalEpisodes === 0
                ? 0
                : Math.round((u.episodesDone / u.totalEpisodes) * 100);
            const lvl = levelFromScore(pct);
            return (
              <tr
                key={u.name + i}
                className="border-b border-gray-100 dark:border-slate-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition align-middle"
              >
                <td className="py-3 pr-3 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {u.name}
                  </div>
                  <div className="md:hidden mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {u.service}
                    <span
                      className="mx-1.5 text-gray-300 dark:text-slate-600"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                    <span className="xl:hidden">
                      {u.lastActivity ?? (
                        <span className="italic">Pas connecté</span>
                      )}
                    </span>
                  </div>
                  <div className="hidden md:block xl:hidden mt-0.5 text-[11px] text-gray-400 truncate">
                    {u.lastActivity ?? (
                      <span className="italic">Pas connecté</span>
                    )}
                  </div>
                </td>
                <td className="hidden md:table-cell py-3 pr-3 text-gray-600 dark:text-gray-400 truncate max-w-[160px]">
                  {u.service}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-16 sm:w-20 lg:w-28 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                      <div
                        className={`h-full ${LEVEL_META[lvl].bar} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums shrink-0">
                      {u.episodesDone}/{u.totalEpisodes}
                    </span>
                  </div>
                </td>
                <td className="py-3 pl-2 font-extrabold text-accent-500 tabular-nums text-right whitespace-nowrap">
                  {u.xp}
                </td>
                <td className="hidden xl:table-cell py-3 pl-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                  {u.lastActivity ?? (
                    <span className="italic text-gray-400">Pas encore</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortAsc,
  onSort,
  numeric,
  hideUnder,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  numeric?: boolean;
  hideUnder?: "sm" | "md" | "lg" | "xl";
}) {
  const active = sortKey === k;
  const hideClass =
    hideUnder === "md"
      ? "hidden md:table-cell"
      : hideUnder === "lg"
        ? "hidden lg:table-cell"
        : hideUnder === "xl"
          ? "hidden xl:table-cell"
          : "";
  return (
    <th
      scope="col"
      className={`pb-2.5 font-medium text-xs ${numeric ? "text-right pl-2" : "pr-3"} ${hideClass}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-primary-500 dark:hover:text-accent-300 transition ${active ? "text-primary-500 dark:text-accent-300 font-bold" : ""}`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px] opacity-70">
          {active ? (sortAsc ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
