"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget Top 3 collaborateurs - podium 🥇🥈🥉 + XP.

import type { TeamRow } from "./types";

export default function TopPerformers({
  team,
  className = "",
}: {
  team: TeamRow[];
  className?: string;
}) {
  return (
    <article
      className={`rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0 ${className}`}
    >
      <header className="flex items-baseline justify-between mb-3 gap-2">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
          Top 3 collaborateurs
        </h3>
        <p className="text-[10px] text-gray-500 italic uppercase tracking-wide">
          Visible dirigeant
        </p>
      </header>
      {team.length === 0 ? (
        <p className="text-sm text-gray-500 italic text-center py-4">
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
                <p className="text-[9px] text-gray-500 uppercase tracking-wide leading-none">
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
