// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// Accordéon des saisons par catégorie (remplace le carrousel horizontal).
//
// Pourquoi : avec ~58 saisons commerciales, le carrousel horizontal était
// "trop compliqué" (tout sur une rangée à scroller). On regroupe par
// catégorie (Fondamentaux / Métiers / Conformité / Avancé), et on déplie une
// catégorie à la fois pour voir ses modules. UNE SEULE section ouverte :
// ouvrir une catégorie referme la précédente.
//
// Accessibilité (motif "Accordion" WAI-ARIA APG) :
//   - Chaque en-tête est un <button> dans un <h3> (structure de titres).
//   - aria-expanded sur le bouton + aria-controls -> id du panneau.
//   - Panneau : role="region" + aria-labelledby -> id de l'en-tête, et
//     attribut `hidden` quand replié (retiré de l'arbre a11y ET du tab order).
//   - Clavier entre en-têtes : ↑/↓ (avec boucle), Home, Début/Fin. Enter/Espace
//     togglent nativement (c'est un <button>).
//   - Le contenu révélé réutilise l'anim slide-up staggered des cards (douce,
//     et neutralisée par prefers-reduced-motion via la config Tailwind globale).
// =============================================================================

"use client";

import { useRef, useState, type ReactNode, type KeyboardEvent } from "react";

export type AccordionSection = {
  id: string;
  label: string;
  emoji: string;
  /** Nombre de saisons dans la catégorie (affiché dans l'en-tête). */
  saisonCount: number;
  /** Modules terminés / total (pour la mini-barre de progression d'en-tête). */
  doneModules: number;
  totalModules: number;
  /** Contenu déplié (grille de SaisonCard, rendu côté serveur). */
  content: ReactNode;
};

export default function SaisonsAccordion({
  sections,
  defaultOpenId,
}: {
  sections: AccordionSection[];
  defaultOpenId?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(
    defaultOpenId ?? sections[0]?.id ?? null,
  );
  const headerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function onHeaderKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    const last = sections.length - 1;
    let target = -1;
    switch (e.key) {
      case "ArrowDown":
        target = idx === last ? 0 : idx + 1;
        break;
      case "ArrowUp":
        target = idx === 0 ? last : idx - 1;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    headerRefs.current[target]?.focus();
  }

  return (
    <div className="space-y-3">
      {sections.map((s, idx) => {
        const expanded = openId === s.id;
        const headerId = `saisons-acc-h-${s.id}`;
        const panelId = `saisons-acc-p-${s.id}`;
        const pct =
          s.totalModules === 0
            ? 0
            : Math.round((s.doneModules / s.totalModules) * 100);
        return (
          <div
            key={s.id}
            className={`rounded-2xl border-2 transition-colors overflow-hidden ${
              expanded
                ? "border-accent-300 dark:border-accent-800 bg-white dark:bg-slate-900"
                : "border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/40 hover:border-accent-200 dark:hover:border-accent-900"
            }`}
          >
            <h3 className="m-0">
              <button
                ref={(el) => {
                  headerRefs.current[idx] = el;
                }}
                id={headerId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpenId(expanded ? null : s.id)}
                onKeyDown={(e) => onHeaderKeyDown(e, idx)}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset rounded-2xl"
              >
                <span
                  className="text-3xl shrink-0 leading-none"
                  aria-hidden="true"
                >
                  {s.emoji}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block font-display font-extrabold text-lg text-primary-600 dark:text-accent-200 truncate">
                    {s.label}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {s.saisonCount} saison{s.saisonCount > 1 ? "s" : ""} ·{" "}
                    {s.doneModules}/{s.totalModules} module
                    {s.totalModules > 1 ? "s" : ""} terminé
                    {s.doneModules > 1 ? "s" : ""}
                  </span>
                </span>

                {/* Mini-barre de progression de la catégorie */}
                <span
                  className="hidden sm:block w-24 h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden shrink-0"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full bg-gradient-to-r from-accent-400 to-emerald-400 rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </span>

                {/* Chevron qui pivote selon l'état */}
                <svg
                  className={`shrink-0 w-5 h-5 text-gray-400 transition-transform duration-300 ${
                    expanded ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!expanded}
              className="px-4 sm:px-5 pb-5 pt-1"
            >
              {s.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
