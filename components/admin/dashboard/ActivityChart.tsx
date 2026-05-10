"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget Activity Chart - barchart compact 7 jours + footer stats.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import type { WeeklyPoint } from "./types";

export default function ActivityChart({
  data,
  className = "",
}: {
  data: WeeklyPoint[];
  className?: string;
}) {
  const total = data.reduce((s, p) => s + p.completions, 0);
  const avgPerDay = data.length === 0 ? 0 : Math.round(total / data.length);
  const bestDay = data.reduce(
    (best, p) => (p.completions > (best?.completions ?? -1) ? p : best),
    data[0],
  );

  return (
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
