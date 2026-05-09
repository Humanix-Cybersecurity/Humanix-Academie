"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTransition, useState } from "react";
import Link from "next/link";
import {
  toggleSaisonActive,
  toggleSaisonMandatory,
  moveSaison,
  resetSaisonsOrder,
} from "@/app/admin/actions";

type Episode = {
  slug: string;
  title: string;
  order: number;
  durationMinutes: number;
  xpReward: number;
};

type Saison = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverEmoji: string;
  baseOrder: number;
  episodesCount: number;
  /** Duree totale reelle de la saison, en minutes (somme des durationMinutes
   * de chaque episode). Calculee cote serveur dans /admin/modules.
   * Avant fix : on affichait `episodesCount * 6` ce qui donnait toujours
   * 36 min et cassait la promesse "5 min/episode". */
  totalMinutes: number;
  totalXp: number;
  isActive: boolean;
  isMandatory: boolean;
  customOrder: number | null;
  episodes: Episode[];
  /** Nombre total d'episodes completes par les apprenants du tenant */
  completionsCount: number;
  /** Score moyen tous episodes confondus pour ce tenant (ou null si aucun) */
  avgScore: number | null;
};

export default function ModulesTable({ saisons }: { saisons: Saison[] }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onToggleActive = (id: string, isActive: boolean) => {
    setBusy(id);
    startTransition(async () => {
      await toggleSaisonActive(id, isActive);
      setBusy(null);
    });
  };
  const onToggleMandatory = (id: string, isMandatory: boolean) => {
    setBusy(id);
    startTransition(async () => {
      await toggleSaisonMandatory(id, isMandatory);
      setBusy(null);
    });
  };
  const onMove = (id: string, dir: "up" | "down") => {
    setBusy(id);
    startTransition(async () => {
      await moveSaison(id, dir);
      setBusy(null);
    });
  };
  const onReset = () => {
    if (!confirm("Réinitialiser l'ordre par défaut ?")) return;
    startTransition(async () => {
      await resetSaisonsOrder();
    });
  };

  return (
    <>
      <div className="space-y-3">
        {saisons.map((s, idx) => {
          const isExpanded = expanded.has(s.id);
          return (
            <div
              key={s.id}
              className={`rounded-2xl border-2 transition-all ${
                s.isActive
                  ? "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  : "border-gray-200 bg-gray-50 opacity-70 dark:border-slate-800 dark:bg-slate-800/40"
              } ${busy === s.id ? "animate-pulse" : ""}`}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Ordre + flèches */}
                <div className="flex flex-col items-center gap-0.5 pt-1">
                  <button
                    onClick={() => onMove(s.id, "up")}
                    disabled={idx === 0 || pending}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary-500 disabled:opacity-20 disabled:cursor-not-allowed text-xs"
                    aria-label="Monter"
                  >
                    ▲
                  </button>
                  <span className="font-bold text-primary-500 text-sm tabular-nums">
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => onMove(s.id, "down")}
                    disabled={idx === saisons.length - 1 || pending}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary-500 disabled:opacity-20 disabled:cursor-not-allowed text-xs"
                    aria-label="Descendre"
                  >
                    ▼
                  </button>
                </div>

                {/* Contenu module : titre cliquable pour expand */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(s.id)}
                  className="flex-1 min-w-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-lg"
                  aria-expanded={isExpanded}
                  aria-controls={`module-details-${s.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl" aria-hidden="true">
                      {s.coverEmoji}
                    </span>
                    <h3 className="font-bold text-primary-500 group-hover:text-accent-500 transition truncate">
                      {s.title}
                    </h3>
                    {s.isMandatory && (
                      <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">
                        OBLIGATOIRE
                      </span>
                    )}
                    {!s.isActive && (
                      <span className="text-xs bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        INACTIF
                      </span>
                    )}
                    <span
                      className={`ml-auto text-xs text-gray-400 transition-transform shrink-0 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      ▼
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {s.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {s.episodesCount} épisode{s.episodesCount > 1 ? "s" : ""}
                    {s.episodesCount > 0 && (
                      <>
                        {" "}
                        · ~{Math.round(s.totalMinutes / s.episodesCount)} min /
                        épisode · {s.totalMinutes} min total · {s.totalXp} XP
                      </>
                    )}
                  </p>
                </button>

                {/* Toggles */}
                <div className="flex flex-col gap-2 items-end pt-1">
                  <Toggle
                    checked={s.isActive}
                    onChange={(v) => onToggleActive(s.id, v)}
                    label="Actif"
                    disabled={pending}
                  />
                  <Toggle
                    checked={s.isMandatory}
                    onChange={(v) => onToggleMandatory(s.id, v)}
                    label="Obligatoire"
                    disabled={pending || !s.isActive}
                    color="red"
                  />
                </div>
              </div>

              {/* Zone expand-able : details du module */}
              {isExpanded && (
                <div
                  id={`module-details-${s.id}`}
                  className="border-t border-gray-200 dark:border-slate-700 p-4 bg-gray-50/60 dark:bg-slate-800/40 rounded-b-2xl space-y-4 animate-fadeIn"
                >
                  {/* Description complete */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                      {s.description}
                    </p>
                  </div>

                  {/* Liste des episodes */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-2">
                      Episodes ({s.episodes.length})
                    </p>
                    {s.episodes.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        Aucun episode publie pour le moment.
                      </p>
                    ) : (
                      <ol className="space-y-1.5">
                        {s.episodes.map((ep, epIdx) => (
                          <li
                            key={ep.slug}
                            className="flex items-center gap-3 text-sm py-1"
                          >
                            <span className="font-mono text-xs text-gray-400 tabular-nums shrink-0 w-6">
                              {String(epIdx + 1).padStart(2, "0")}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
                              {ep.title}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                              {ep.durationMinutes} min · {ep.xpReward} XP
                            </span>
                            <Link
                              href={`/apprendre/${s.slug}/${ep.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent-500 hover:underline font-medium shrink-0"
                            >
                              Aperçu ↗
                            </Link>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  {/* Stats tenant si dispo */}
                  {(s.completionsCount > 0 || s.avgScore !== null) && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-2">
                        Engagement de tes équipes
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5">
                          <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Completions
                          </p>
                          <p className="font-bold text-primary-500 dark:text-accent-300 tabular-nums">
                            {s.completionsCount}
                          </p>
                        </div>
                        {s.avgScore !== null && (
                          <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Score moyen
                            </p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-300 tabular-nums">
                              {s.avgScore} XP
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <p className="text-gray-500">
          {pending
            ? "Sauvegarde en cours…"
            : "✓ Toutes les modifications sont sauvegardées automatiquement"}
        </p>
        <button
          onClick={onReset}
          disabled={pending}
          className="text-gray-500 hover:text-primary-500 disabled:opacity-50"
        >
          Réinitialiser l'ordre par défaut
        </button>
      </div>
    </>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
  color = "accent",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  color?: "accent" | "red";
}) {
  const onColor = color === "red" ? "bg-red-500" : "bg-accent-500";
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="text-xs text-gray-600 font-medium">{label}</span>
      <span
        className={`w-10 h-6 rounded-full transition-all relative ${
          checked ? onColor : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}
