"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget Engagement mini - XP / episode + total cumule, ton chaleureux.

export default function EngagementMini({
  averageXpPerEpisode,
  totalXP,
  className = "",
}: {
  averageXpPerEpisode: number;
  totalXP: number;
  className?: string;
}) {
  return (
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
