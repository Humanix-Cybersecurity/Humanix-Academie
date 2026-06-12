// SPDX-License-Identifier: AGPL-3.0-or-later
// Hero compact pour la page /apprendre simplifiee (mai 2026).
//
// Pourquoi un nouveau composant et pas LearnerHero existant ?
// Le LearnerHero historique fait beaucoup (mascotte qui flotte, 4 stats,
// barre niveau, hex backdrop) - c'etait correct pour une page "tableau
// de bord", trop lourd pour une page "qu'est-ce que je fais maintenant".
//
// Cette version garde la chaleur (salutation, prenom) mais condense
// tout en 1 zone horizontale qui tient au-dessus du fold sur mobile et
// laisse respirer l'action principale qui suit.

import Link from "next/link";
import type { LevelDef } from "@/lib/levels";

type Props = {
  greet: string;
  firstName: string;
  totalXP: number;
  streak: number;
  currentLevel: Pick<LevelDef, "id" | "name" | "emoji">;
  completedCount: number;
  totalEpisodes: number;
};

export default function LearnerHeroCompact({
  greet,
  firstName,
  totalXP,
  streak,
  currentLevel,
  completedCount,
  totalEpisodes,
}: Props) {
  const pct =
    totalEpisodes === 0
      ? 0
      : Math.round((completedCount / totalEpisodes) * 100);

  return (
    <section
      aria-labelledby="learner-hello"
      className="bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-slate-900 dark:via-slate-900 dark:to-accent-950/30 border-b border-gray-200 dark:border-slate-800"
    >
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-accent-500 font-bold">
            🦊 {greet}
          </p>
          <h1
            id="learner-hello"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mt-1"
          >
            {firstName}, prêt·e pour 5 minutes ?
          </h1>
        </div>

        {/* Stats compactes - pas une grille, juste une rangée respirante */}
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          <Stat
            label="Niveau"
            value={`${currentLevel.emoji} ${currentLevel.name}`}
          />
          <Stat label="XP" value={totalXP.toLocaleString("fr-FR")} />
          {streak > 0 && (
            <Stat label="Streak" value={`🔥 ${streak}j`} accent />
          )}
          <Stat label="Modules" value={`${completedCount}/${totalEpisodes}`} />
        </div>
      </div>

      {/* Barre de progression discrete sous le hero */}
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600 transition-all duration-700"
            style={{ width: `${Math.max(2, pct)}%` }}
            aria-label={`${pct}% du parcours complete`}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{pct}% du parcours</span>
          <Link
            href="/profil"
            className="hover:text-accent-500 underline-offset-2 hover:underline"
          >
            Mes badges & stats →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`font-bold text-lg leading-none ${
          accent
            ? "text-accent-500"
            : "text-primary-500 dark:text-accent-300"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-0.5">
        {label}
      </p>
    </div>
  );
}
