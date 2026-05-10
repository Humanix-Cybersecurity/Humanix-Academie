// SPDX-License-Identifier: AGPL-3.0-or-later
// Liste des "top movers" - users en plus forte degradation ou amelioration.

import type { TopMover } from "@/lib/analytics/risk-forecast";

export default function MoverList({
  movers,
  variant,
}: {
  movers: TopMover[];
  variant: "degrading" | "improving";
}) {
  return (
    <ul className="space-y-2">
      {movers.map((m) => (
        <li
          key={m.userId}
          className={`rounded-xl border p-3 ${
            variant === "degrading"
              ? "border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-900/15"
              : "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-900/15"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                {m.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {m.email}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-lg font-extrabold tabular-nums">
                {m.riskScore}
              </p>
              <p
                className={`text-xs font-bold ${
                  variant === "degrading"
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {variant === "degrading" ? "↘" : "↗"} {m.indicator.toFixed(2)}
              </p>
            </div>
          </div>
          {m.reasons.length > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
              {m.reasons.join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function EmptyMovers({ message }: { message: string }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400 italic">{message}</p>
  );
}
