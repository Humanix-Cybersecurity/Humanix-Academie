"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget KPI Strip - 4 cartes avec progress bar + sparkline.
//
// Synthese chiffree haut-niveau : sieges, maitrise, completions, engagement.
// Une carte est "highlight" (maitrise) car c'est l'indicateur cyber le plus
// significatif.

import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import type { Stats, WeeklyPoint } from "./types";
import { LEVEL_META, levelFromScore, type Level } from "./levels";

export default function KpiStrip({
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
