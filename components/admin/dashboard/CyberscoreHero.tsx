"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget Cyberscore Hero - radial chart + score + breakdown pliable.
//
// Le seul "chiffre qui compte" affiche en haut du tableau de bord. Une
// section pliable explique le calcul (composantes + penalites + seuils)
// pour ceux qui veulent creuser, sans alourdir la lecture initiale.

import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import type { CyberscoreBreakdown } from "@/lib/cyber-score";
import { LEVEL_META, type Level } from "./levels";

// Mapping niveau cyberscore (5 niveaux) -> Level UI (4 niveaux)
function cyberscoreLevelToUiLevel(lvl: CyberscoreBreakdown["level"]): Level {
  if (lvl === "excellent" || lvl === "bon") return "excellent";
  if (lvl === "correct") return "ok";
  if (lvl === "warning") return "warning";
  return "danger";
}

export default function CyberscoreHero({
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

      {/* Détail pédagogique du score - pliable, transparent, sans condescendance */}
      <ScoreBreakdownDetail breakdown={breakdown} />
    </section>
  );
}

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
          refléter le risque réel - pas le confort de lecture.
        </p>

        <div className="space-y-2">
          <ScoreComponent {...breakdown.components.activation} />
          <ScoreComponent {...breakdown.components.mastery} />
          <ScoreComponent {...breakdown.components.fundamentals} />
        </div>

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
