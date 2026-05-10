"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget Actions urgentes - max 3 cartes avec verbe + 1 clic.
//
// Le cerveau du dashboard : on transforme les KPI en actions concretes.
// Pas de tableau, pas de tooltip, juste 3 cartes "ce que tu dois faire".

import type { Action, Stats, SaisonRow, TeamRow } from "./types";

const ACTION_STYLES: Record<
  Action["level"],
  { border: string; iconBg: string; titleText: string; btn: string }
> = {
  danger: {
    border: "border-rose-200 dark:border-rose-900/50",
    iconBg: "bg-rose-50 dark:bg-rose-900/20",
    titleText: "text-rose-700 dark:text-rose-300",
    btn: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  warning: {
    border: "border-amber-200 dark:border-amber-900/50",
    iconBg: "bg-amber-50 dark:bg-amber-900/20",
    titleText: "text-amber-700 dark:text-amber-300",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    border: "border-teal-200 dark:border-teal-900/50",
    iconBg: "bg-teal-50 dark:bg-teal-900/20",
    titleText: "text-teal-700 dark:text-teal-300",
    btn: "bg-teal-600 hover:bg-teal-700 text-white",
  },
};

/**
 * Heuristiques de recommandations. Pure : pas d'effet de bord, testable.
 * Renvoie max ~4 actions, l'orchestrateur tronque a 3 pour rester scannable.
 */
export function buildRecommendations(
  stats: Stats,
  saisons: SaisonRow[],
  team: TeamRow[],
): Action[] {
  const actions: Action[] = [];

  if (stats.totalSeats > 0 && stats.activationRate < 80) {
    const inactifs = stats.totalSeats - stats.activatedSeats;
    actions.push({
      level: stats.activationRate < 50 ? "danger" : "warning",
      icon: "🎯",
      title: `Activation à ${stats.activationRate}%`,
      description: `${inactifs} collaborateur${inactifs > 1 ? "s" : ""} n'${inactifs > 1 ? "ont" : "a"} pas commencé.`,
      cta: { label: "Relancer", href: "/admin/utilisateurs?filter=inactive" },
    });
  }

  if (stats.totalSeats > 0 && stats.masteryAverage < 60) {
    actions.push({
      level: stats.masteryAverage < 40 ? "danger" : "warning",
      icon: "🛡️",
      title: `Maîtrise à ${stats.masteryAverage}/100`,
      description:
        "Sous le seuil de sécurité. Un challenge collectif aide à booster.",
      cta: { label: "Lancer un challenge", href: "/admin/challenge" },
    });
  }

  const worst = saisons
    .filter((s) => s.total > 0)
    .sort((a, b) => a.pct - b.pct)[0];
  if (worst && worst.pct < 40 && stats.totalSeats >= 3) {
    actions.push({
      level: "warning",
      icon: worst.emoji || "📚",
      title: `Saison « ${worst.name} » à ${worst.pct}%`,
      description: `${worst.completed}/${worst.total} équipiers ont terminé.`,
      cta: { label: "Voir le module", href: "/admin/modules" },
    });
  }

  const dormants = team.filter(
    (t) => t.lastActivity === null && t.episodesDone === 0,
  ).length;
  if (dormants >= 3) {
    actions.push({
      level: "info",
      icon: "📨",
      title: `${dormants} jamais connectés`,
      description: "Une campagne de relance ou un kick-off peut débloquer.",
      cta: { label: "Voir la liste", href: "/admin/utilisateurs?filter=never" },
    });
  }

  return actions;
}

export default function UrgentActions({ actions }: { actions: Action[] }) {
  return (
    <section aria-label="Actions urgentes">
      <div className="flex items-baseline justify-between mb-2.5 px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span aria-hidden="true">⚠️</span>À faire maintenant
        </h2>
        <span className="text-[11px] text-gray-400 tabular-nums">
          {actions.length} action{actions.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 list-none">
        {actions.map((a, i) => {
          const s = ACTION_STYLES[a.level];
          return (
            <li
              key={i}
              className={`group relative rounded-xl border ${s.border} bg-white dark:bg-slate-900 p-3.5 flex flex-col gap-3 hover:shadow-sm transition`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`shrink-0 w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center text-lg`}
                  aria-hidden="true"
                >
                  {a.icon}
                </span>
                <div className="min-w-0">
                  <p className={`font-bold text-sm ${s.titleText} truncate`}>
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
                    {a.description}
                  </p>
                </div>
              </div>
              <a
                href={a.cta.href}
                className={`inline-flex items-center justify-center gap-1 self-start rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${s.btn}`}
              >
                {a.cta.label}
                <span aria-hidden="true">→</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
