// SPDX-License-Identifier: AGPL-3.0-or-later
//
// LineChart timeseries du score de risque agrege du tenant.
//
// Ce composant fait l'appel /api/admin/analytics/timeseries au mount,
// affiche un skeleton pendant ~300ms, puis le LineChart Recharts.
//
// 3 lignes :
//   - p10Score (queue de gauche, "users les plus exposes") en rouge léger
//   - p50Score / avgScore (typique) en bleu plein
//   - p90Score (best-in-class) en vert leger
//
// Une ligne pointillee horizontale a 40 marque le seuil "vulnerable".
//
// Empty state : si aucun snapshot n'existe encore (cron pas encore
// passe, tenant tout neuf), on affiche un message pedagogique.

"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Point = {
  day: string;
  avgScore: number;
  p10Score: number;
  p50Score: number;
  p90Score: number;
  atRiskCount: number;
};

type Summary = {
  from: string | null;
  to: string | null;
  current: number | null;
  delta30d: number | null;
  totalPoints: number;
};

type State =
  | { kind: "loading" }
  | { kind: "ready"; points: Point[]; summary: Summary }
  | { kind: "error"; message: string };

export default function RiskTimeseriesChart({
  days = 90,
}: {
  days?: number;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/analytics/timeseries?days=${days}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok) {
          setState({
            kind: "error",
            message: data.error ?? "Erreur de chargement",
          });
          return;
        }
        setState({
          kind: "ready",
          points: data.points,
          summary: data.summary,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Erreur réseau",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (state.kind === "loading") {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
        ⚠️ Impossible de charger l&apos;évolution du score : {state.message}
      </div>
    );
  }

  const { points, summary } = state;

  // Empty state : pas encore de snapshot (tenant neuf, cron pas passe)
  if (points.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-8 text-center">
        <p className="text-2xl mb-2">📈</p>
        <p className="font-bold text-gray-700 dark:text-gray-200 mb-1">
          Pas encore de courbe d&apos;évolution
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Le score moyen est photographié chaque nuit. Reviens demain pour
          voir la première mesure, et dans 30 jours pour avoir une tendance
          actionnable.
        </p>
      </div>
    );
  }

  const deltaLabel =
    summary.delta30d === null
      ? "—"
      : summary.delta30d > 0
        ? `+${summary.delta30d}`
        : `${summary.delta30d}`;
  const deltaColor =
    summary.delta30d === null
      ? "text-gray-500"
      : summary.delta30d >= 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <header className="flex items-end justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-extrabold text-gray-900 dark:text-gray-100">
            Évolution du score humain
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {points.length} jour{points.length > 1 ? "s" : ""} de mesures —
            seuil vulnérable à 40
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
            {summary.current ?? "—"}
          </p>
          <p className={`text-xs font-bold tabular-nums ${deltaColor}`}>
            {deltaLabel} pts sur 30j
          </p>
        </div>
      </header>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={points}
          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            tickFormatter={(v: string) => v.slice(5)} // MM-DD
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            contentStyle={{
              fontSize: "12px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
            // recharts v3 : signature 5-args (value, name, item, index, payload).
            // On laisse TS inferer ; cast vers string pour labelByKey.
            formatter={(value, name) => [
              typeof value === "number" ? value.toFixed(1) : String(value),
              labelByKey(String(name)),
            ]}
            labelFormatter={(l) => `Jour : ${l}`}
          />
          <ReferenceLine
            y={40}
            stroke="#dc2626"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{
              value: "Seuil vulnérable",
              fontSize: 9,
              fill: "#dc2626",
              position: "insideTopRight",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
            formatter={(v: string) => labelByKey(v)}
          />
          <Line
            type="monotone"
            dataKey="p90Score"
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
            strokeOpacity={0.6}
          />
          <Line
            type="monotone"
            dataKey="avgScore"
            stroke="#0EA5E9"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p10Score"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            strokeOpacity={0.6}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-gray-500 dark:text-gray-500 italic mt-2 text-center">
        🟦 Score moyen · 🟢 Top 10% (best-in-class) · 🟡 Bottom 10% (les plus
        exposés)
      </p>
    </div>
  );
}

function labelByKey(k: string): string {
  switch (k) {
    case "avgScore":
      return "Score moyen";
    case "p10Score":
      return "Bottom 10% (à risque)";
    case "p50Score":
      return "Médiane";
    case "p90Score":
      return "Top 10% (best)";
    default:
      return k;
  }
}
