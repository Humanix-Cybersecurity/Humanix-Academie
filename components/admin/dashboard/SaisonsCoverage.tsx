"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget Couverture par saison - barres horizontales avec emoji + pct.

import type { SaisonRow } from "./types";
import { LEVEL_META, levelFromScore } from "./levels";

export default function SaisonsCoverage({
  data,
  className = "",
}: {
  data: SaisonRow[];
  className?: string;
}) {
  return (
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
