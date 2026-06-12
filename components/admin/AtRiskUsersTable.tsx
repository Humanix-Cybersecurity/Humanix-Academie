// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Table client pour /admin/users/at-risk.
//
// Features :
//   - Filtres threshold + daysInactive en URL (router.replace pour
//     bookmark / partage de lien)
//   - Selection multiple (checkbox header pour tout cocher)
//   - Bouton "Exporter CSV" : telecharge directement (link vers
//     /api/admin/users/at-risk/export?...)
//   - Bouton "Envoyer rappel" : POST /api/admin/users/at-risk/remind
//     avec userIds[]. Disabled si selection vide ou si !canAct.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type TrendVerdict =
  | "improving"
  | "stable"
  | "degrading"
  | "insufficient_data";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  service: string | null;
  riskScore: number;
  daysSinceActivity: number | null;
  completedEpisodes: number;
  reason: "low_score" | "inactive" | "both";
  groupBadges: { name: string; emoji: string; color: string | null }[];
  trend: TrendVerdict;
  trendIndicator: number;
  trendReasons: string[];
};

type Totals = {
  lowScore: number;
  inactive: number;
  both: number;
  total: number;
};

type Filters = { threshold: number; daysInactive: number };

export default function AtRiskUsersTable({
  initialUsers,
  totals,
  filters,
  canAct,
}: {
  initialUsers: User[];
  totals: Totals;
  filters: Filters;
  canAct: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [threshold, setThreshold] = useState(filters.threshold);
  const [days, setDays] = useState(filters.daysInactive);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [remindState, setRemindState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; sent: number; simulated: number; errors: number }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  const allSelected =
    initialUsers.length > 0 && selected.size === initialUsers.length;
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(initialUsers.map((u) => u.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyFilters = () => {
    const t = Math.max(0, Math.min(100, threshold));
    const d = Math.max(7, Math.min(365, days));
    startTransition(() => {
      router.replace(`/admin/users/at-risk?threshold=${t}&days=${d}`);
    });
  };

  const exportUrl = `/api/admin/users/at-risk/export?threshold=${filters.threshold}&days=${filters.daysInactive}`;

  const sendReminders = async () => {
    if (selected.size === 0) return;
    setRemindState({ kind: "loading" });
    try {
      const res = await fetch("/api/admin/users/at-risk/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!data.ok) {
        setRemindState({
          kind: "err",
          message: data.message ?? data.error ?? "Erreur lors de l'envoi",
        });
        return;
      }
      setRemindState({
        kind: "ok",
        sent: data.sent ?? 0,
        simulated: data.simulated ?? 0,
        errors: data.errors ?? 0,
      });
      setSelected(new Set());
    } catch (e) {
      setRemindState({
        kind: "err",
        message: e instanceof Error ? e.message : "Erreur réseau",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats sommaire */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryCard
          label="Total signalés"
          value={totals.total}
          accent="rose"
        />
        <SummaryCard
          label="Score bas + inactif"
          value={totals.both}
          accent="rose-dark"
        />
        <SummaryCard
          label="Score < seuil"
          value={totals.lowScore}
          accent="amber"
        />
        <SummaryCard
          label="Inactifs uniquement"
          value={totals.inactive}
          accent="slate"
        />
      </div>

      {/* Filtres */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">
              Score &lt; (0-100)
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 0)}
              min={0}
              max={100}
              className="w-24 rounded-lg border-2 border-gray-200 dark:border-slate-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">
              Inactif &gt; (jours, 7-365)
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || 7)}
              min={7}
              max={365}
              className="w-24 rounded-lg border-2 border-gray-200 dark:border-slate-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="px-4 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold transition"
          >
            Appliquer
          </button>
          <div className="flex-1" />
          <a
            href={exportUrl}
            className="px-4 py-1.5 rounded-lg border-2 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-bold transition inline-flex items-center gap-1.5"
          >
            <span aria-hidden="true">📥</span> Exporter CSV
          </a>
        </div>
      </div>

      {/* Action en masse + feedback */}
      {canAct && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={sendReminders}
            disabled={!someSelected || remindState.kind === "loading"}
            className="btn-primary text-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {remindState.kind === "loading"
              ? "Envoi…"
              : `📨 Envoyer rappel (${selected.size})`}
          </button>
          {remindState.kind === "ok" && (
            <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              ✅ {remindState.sent} envoyé{remindState.sent > 1 ? "s" : ""}
              {remindState.simulated > 0
                ? `, ${remindState.simulated} simulé${remindState.simulated > 1 ? "s" : ""}`
                : ""}
              {remindState.errors > 0
                ? `, ${remindState.errors} erreur${remindState.errors > 1 ? "s" : ""}`
                : ""}
            </span>
          )}
          {remindState.kind === "err" && (
            <span className="text-sm text-rose-700 dark:text-rose-300 font-medium">
              ⚠️ {remindState.message}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <caption className="sr-only">Utilisateurs identifies comme a risque cyber</caption>
          <thead className="bg-gray-50 dark:bg-slate-800/40">
            <tr>
              {canAct && (
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </th>
              )}
              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-300">
                Collaborateur
              </th>
              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-300">
                Motif
              </th>
              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-300 hidden md:table-cell">
                Groupe
              </th>
              <th className="p-3 text-right font-bold text-gray-700 dark:text-gray-300">
                Score
              </th>
              <th
                className="p-3 text-center font-bold text-gray-700 dark:text-gray-300"
                title="Tendance sur les 30 derniers jours (cf. lib/analytics/risk-trend.ts)"
              >
                Tendance
              </th>
              <th className="p-3 text-right font-bold text-gray-700 dark:text-gray-300">
                Inactif
              </th>
              <th className="p-3 text-right font-bold text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                Modules
              </th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((u) => (
              <tr
                key={u.id}
                className="border-t border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30"
              >
                {canAct && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleOne(u.id)}
                      aria-label={`Sélectionner ${u.name}`}
                    />
                  </td>
                )}
                <td className="p-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {u.name}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="p-3">
                  <ReasonBadge reason={u.reason} />
                </td>
                <td className="p-3 hidden md:table-cell">
                  {u.groupBadges.length === 0 ? (
                    <span className="text-xs text-gray-500">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.groupBadges.map((g, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                        >
                          <span aria-hidden="true">{g.emoji}</span>
                          <span>{g.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums font-bold">
                  <span
                    className={
                      u.riskScore < 30
                        ? "text-rose-600 dark:text-rose-400"
                        : u.riskScore < 50
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-gray-700 dark:text-gray-300"
                    }
                  >
                    {u.riskScore}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <TrendBadge
                    verdict={u.trend}
                    indicator={u.trendIndicator}
                    reasons={u.trendReasons}
                  />
                </td>
                <td className="p-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                  {u.daysSinceActivity === null
                    ? "-"
                    : `${u.daysSinceActivity}j`}
                </td>
                <td className="p-3 text-right tabular-nums text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                  {u.completedEpisodes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "rose" | "rose-dark" | "amber" | "slate";
}) {
  const styles =
    accent === "rose-dark"
      ? "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200"
      : accent === "rose"
        ? "bg-rose-50 dark:bg-rose-900/15 text-rose-700 dark:text-rose-300"
        : accent === "amber"
          ? "bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300"
          : "bg-gray-50 dark:bg-slate-800/40 text-gray-700 dark:text-gray-300";
  return (
    <div className={`rounded-xl p-3 ${styles}`}>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-widest font-bold mt-0.5">
        {label}
      </p>
    </div>
  );
}

function TrendBadge({
  verdict,
  indicator,
  reasons,
}: {
  verdict: TrendVerdict;
  indicator: number;
  reasons: string[];
}) {
  const map: Record<
    TrendVerdict,
    { label: string; arrow: string; cls: string }
  > = {
    improving: {
      label: "Amélioration",
      arrow: "↗",
      cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    },
    stable: {
      label: "Stable",
      arrow: "→",
      cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    },
    degrading: {
      label: "Dégradation",
      arrow: "↘",
      cls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
    },
    insufficient_data: {
      label: "Données insuffisantes",
      arrow: "?",
      cls: "bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-500",
    },
  };
  const s = map[verdict];
  // Tooltip natif via title : signe + composantes
  const tooltip =
    reasons.length === 0
      ? `${s.label} (signal ${indicator.toFixed(2)})`
      : `${s.label} (signal ${indicator.toFixed(2)}) - ${reasons.join(" · ")}`;
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${s.cls}`}
    >
      <span aria-hidden="true">{s.arrow}</span>
      <span className="hidden md:inline">{s.label}</span>
    </span>
  );
}

function ReasonBadge({ reason }: { reason: User["reason"] }) {
  const map = {
    both: {
      label: "Score bas + inactif",
      bg: "bg-rose-100 dark:bg-rose-900/30",
      txt: "text-rose-800 dark:text-rose-200",
    },
    low_score: {
      label: "Score bas",
      bg: "bg-amber-100 dark:bg-amber-900/30",
      txt: "text-amber-800 dark:text-amber-200",
    },
    inactive: {
      label: "Inactif",
      bg: "bg-slate-100 dark:bg-slate-800",
      txt: "text-slate-700 dark:text-slate-300",
    },
  } as const;
  const s = map[reason];
  return (
    <span
      className={`inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${s.bg} ${s.txt}`}
    >
      {s.label}
    </span>
  );
}
