// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tableau de bord de la posture ReCyF vivante d'un tenant (composant serveur).
// Score global + tendance, scores par thematique, objectifs (mesures vs
// declares), et ce qui bouge tout seul (formation + exercices).

import { RECYF_GROUPES, type RecyfGroupe } from "@/lib/nis2/recyf";
import {
  RECYF_STATUS_LABEL,
  RECYF_VERDICT_LABEL,
  type RecyfStatus,
} from "@/lib/nis2/recyf-scoring";
import type { TenantRecyf } from "@/lib/nis2/recyf-tenant";

const STATUS_STYLE: Record<RecyfStatus, string> = {
  prioritaire: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  a_renforcer:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  solide:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
};

const GROUP_ORDER = (Object.keys(RECYF_GROUPES) as RecyfGroupe[]).sort(
  (a, b) => RECYF_GROUPES[a].ordre - RECYF_GROUPES[b].ordre,
);

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = 100;
  const step = w / (points.length - 1);
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${Math.round(i * step)} ${Math.round(h - (p / max) * h)}`,
    )
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Tendance du score sur les derniers jours"
      className="overflow-visible"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-accent-500"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RecyfPostureBoard({ data }: { data: TenantRecyf }) {
  const { plan } = data;
  const verdict = RECYF_VERDICT_LABEL[plan.verdict];
  const measuredById = new Map(
    data.measured.map((m) => [m.objectifId, m.label]),
  );
  const measuredSet = new Set(data.measuredIds);
  const trendPoints = data.trend.map((t) => t.globalScore);

  return (
    <div>
      {/* Score global + tendance */}
      <section
        className="rounded-3xl border-2 p-6 sm:p-8 mb-6"
        style={{
          borderColor: verdict.color,
          background: `linear-gradient(135deg, ${verdict.color}12 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold opacity-70 mb-1">
              Ma posture ReCyF ·{" "}
              {data.profil === "EE"
                ? "Entité essentielle"
                : "Entité importante"}
            </p>
            <p
              className="font-display text-5xl font-extrabold tabular-nums"
              style={{ color: verdict.color }}
            >
              {plan.globalScore}
              <span className="text-2xl opacity-70">/100</span>
            </p>
            <p className="font-bold" style={{ color: verdict.color }}>
              {verdict.label}
            </p>
          </div>
          <div className="text-right">
            <div style={{ color: verdict.color }}>
              <Sparkline points={trendPoints} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {plan.priorityCount} à engager · {plan.solidCount} en place
            </p>
          </div>
        </div>
      </section>

      {/* Ce qui bouge tout seul */}
      <section className="rounded-2xl border-2 border-accent-200 dark:border-accent-900/40 bg-accent-50/50 dark:bg-accent-950/20 p-5 mb-6">
        <h2 className="font-bold text-accent-800 dark:text-accent-200 mb-2 flex items-center gap-2">
          <span aria-hidden="true">📈</span> Mesuré automatiquement
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Ces objectifs montent tout seuls quand ton équipe agit. Le reste, tu
          le déclares.
        </p>
        <ul className="space-y-1.5 list-none p-0">
          {data.measured.map((m) => (
            <li
              key={m.objectifId}
              className="text-sm text-accent-900 dark:text-accent-100"
            >
              <span aria-hidden="true">•</span> {m.label}
            </li>
          ))}
        </ul>
      </section>

      {/* Scores par thematique */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 mb-6">
        <h2 className="font-display text-lg font-bold text-primary-500 dark:text-accent-300 mb-4">
          Par thématique
        </h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {plan.groupScores.map((g) => {
            const color =
              g.score >= 80
                ? "bg-emerald-500"
                : g.score >= 50
                  ? "bg-amber-500"
                  : "bg-red-500";
            return (
              <div key={g.groupe}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    <span aria-hidden="true">{g.emoji} </span>
                    {g.label}
                  </span>
                  <span className="tabular-nums text-gray-500 dark:text-gray-400">
                    {g.score}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${g.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Objectifs par thematique */}
      <section>
        <h2 className="font-display text-lg font-bold text-primary-500 dark:text-accent-300 mb-3">
          Les {plan.objectifsCount} objectifs
        </h2>
        <div className="space-y-4">
          {GROUP_ORDER.map((g) => {
            const items = plan.items.filter((i) => i.objectif.groupe === g);
            if (items.length === 0) return null;
            const meta = RECYF_GROUPES[g];
            return (
              <div key={g}>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                  <span aria-hidden="true">{meta.emoji} </span>
                  {meta.label}
                </p>
                <ul className="space-y-2 list-none p-0">
                  {items
                    .slice()
                    .sort((a, b) => a.objectif.num - b.objectif.num)
                    .map((item) => {
                      const isMeasured = measuredSet.has(item.objectif.id);
                      return (
                        <li
                          key={item.objectif.id}
                          className="rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 text-xs font-bold tabular-nums">
                              {item.objectif.num}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">
                                {item.objectif.titre}
                              </p>
                              {isMeasured &&
                                measuredById.get(item.objectif.id) && (
                                  <p className="text-xs text-accent-700 dark:text-accent-300 mt-0.5">
                                    {measuredById.get(item.objectif.id)}
                                  </p>
                                )}
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <span
                                className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[item.status]}`}
                              >
                                {RECYF_STATUS_LABEL[item.status]}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isMeasured
                                    ? "bg-accent-100 text-accent-800 dark:bg-accent-950/50 dark:text-accent-200"
                                    : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400"
                                }`}
                              >
                                {isMeasured ? "mesuré" : "déclaré"}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
