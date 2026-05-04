"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// BusinessMethodology — Section pliable "Méthodologie & sources" pour le
// dashboard /admin/business.
//
// Objectif : transformer un dashboard "joli" en outil de pilotage CRÉDIBLE.
// Pour chaque chiffre du hero, on expose :
//   - Formule mathématique
//   - Variables avec valeurs courantes
//   - Sources publiques (avec liens)
//   - Phrase prête à reprendre en COMEX
//
// Le tout dans une zone pliable pour ne pas alourdir le hero, mais visible
// au moindre clic — la transparence à la demande.
// =============================================================================

import { useState } from "react";
import type { MetricExplanation } from "@/lib/business-impact-methodology";

type Props = {
  explanations: MetricExplanation[];
  limitations: string[];
};

export default function BusinessMethodology({
  explanations,
  limitations,
}: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section
      aria-label="Méthodologie et sources"
      className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5"
    >
      <header className="mb-4 flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span aria-hidden="true">🧮</span>
            Méthodologie &amp; sources
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Comment chaque chiffre est calculé. À reprendre tel quel en COMEX.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
          Transparence à la demande
        </span>
      </header>

      <ul className="space-y-2 list-none">
        {explanations.map((e, i) => {
          const isOpen = openIdx === i;
          return (
            <li
              key={i}
              className="rounded-lg border border-gray-100 dark:border-slate-800 overflow-hidden"
            >
              {/* En-tête cliquable */}
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 p-3 hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`text-gray-400 transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`}
                  >
                    ▸
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {e.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic truncate">
                      {e.formula}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-base font-bold tabular-nums text-accent-500 dark:text-accent-300">
                  {e.valueLabel}
                </span>
              </button>

              {/* Détail déplié */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-4 bg-gray-50/40 dark:bg-slate-900/40 border-t border-gray-100 dark:border-slate-800">
                  {/* Formule rappelée + variables */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-2">
                      Détail du calcul
                    </p>
                    <pre className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-md p-3 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {e.formula}
                    </pre>
                    <ul className="mt-3 space-y-2 list-none">
                      {e.variables.map((v, j) => (
                        <li key={j} className="text-xs">
                          <p className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {v.name}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                              {v.value}
                            </span>
                          </p>
                          {v.explain && (
                            <p className="text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                              {v.explain}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Sources publiques */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-2">
                      Sources publiques
                    </p>
                    <ul className="space-y-2 list-none">
                      {e.sources.map((s, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-xs bg-white dark:bg-slate-950 rounded-md p-2.5 border border-gray-100 dark:border-slate-800"
                        >
                          <span
                            aria-hidden="true"
                            className="text-gray-400 shrink-0"
                          >
                            📚
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {s.url ? (
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary-500 dark:hover:text-accent-300 hover:underline"
                                >
                                  {s.name} ↗
                                </a>
                              ) : (
                                s.name
                              )}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                              {s.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pitch COMEX prêt à copier */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <span aria-hidden="true">🎤</span>À dire en COMEX (prêt à
                      copier)
                    </p>
                    <blockquote className="bg-primary-50/60 dark:bg-blue-900/15 border-l-4 border-primary-500 dark:border-accent-500 rounded-r-md p-3 text-sm italic text-gray-700 dark:text-gray-200 leading-relaxed">
                      {e.comexPitch}
                    </blockquote>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Limites méthodologiques (honnêteté intellectuelle) */}
      <details className="mt-4 group">
        <summary className="cursor-pointer text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-accent-300 list-none flex items-center gap-2">
          <span
            aria-hidden="true"
            className="text-gray-400 group-open:rotate-90 transition-transform"
          >
            ▸
          </span>
          <span>
            Limites méthodologiques (à connaître pour ne pas survendre)
          </span>
        </summary>
        <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-400 list-none pl-5 border-l-2 border-amber-300 dark:border-amber-700">
          {limitations.map((l, i) => (
            <li
              key={i}
              className="leading-relaxed"
              dangerouslySetInnerHTML={{
                __html:
                  "<span class='text-amber-600 dark:text-amber-400 font-bold mr-1'>⚠</span>" +
                  l.replace(
                    /\*\*(.+?)\*\*/g,
                    '<strong class="text-gray-900 dark:text-gray-200">$1</strong>',
                  ),
              }}
            />
          ))}
        </ul>
      </details>
    </section>
  );
}
