// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Bandeau "evenement cyber actif" affiche en haut de /apprendre quand
// un event du calendrier est en cours (Cybermois, World Password Day,
// etc.). Lien vers la saison highlightee.
//
// Server component : pas de state client, pas d'interactivite.

import Link from "next/link";
import { getActiveEventDef } from "@/lib/events/calendar";

export default function CyberEventBanner() {
  const active = getActiveEventDef();
  if (!active) return null;
  const { def } = active;
  return (
    <Link
      href={`/apprendre/${def.highlightSaisonSlug}`}
      className="block mx-auto max-w-5xl mt-6 mb-2 px-4"
    >
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-purple-100 via-pink-50 to-amber-50 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-amber-900/20 border-2 border-purple-200 dark:border-purple-800/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-bounce-slow" aria-hidden="true">
            {def.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-purple-700 dark:text-purple-200">
              Événement cyber en cours
            </p>
            <p className="text-sm sm:text-base font-bold text-primary-500 dark:text-accent-300 truncate">
              {def.title}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 italic mt-0.5 line-clamp-1">
              {def.description}
            </p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs uppercase tracking-widest text-purple-700/70 dark:text-purple-200/70 font-bold">
              Voir la saison →
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
