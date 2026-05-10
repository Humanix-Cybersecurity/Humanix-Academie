// SPDX-License-Identifier: AGPL-3.0-or-later
// Bandeau discret qui annonce un challenge inter-equipes en cours.
// Ton chaleureux, non-urgent. Affiche seulement si activeChallenge != null.

import Link from "next/link";

export default function ChallengeBanner({
  title,
  endDate,
}: {
  title: string;
  endDate: Date;
}) {
  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - Date.now()) / (24 * 3600 * 1000)),
  );

  return (
    <Link href="/classement" className="block mx-auto max-w-5xl mt-6 mb-2 px-4">
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-50 dark:from-amber-900/30 dark:via-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
        <div className="flex items-center gap-4">
          <div className="text-3xl animate-bounce-slow" aria-hidden="true">
            🏆
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-200">
              Challenge en cours · entre équipes
            </p>
            <p className="text-sm sm:text-base font-bold text-primary-500 dark:text-accent-300 truncate">
              {title}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-xl sm:text-2xl font-extrabold text-amber-700 dark:text-amber-200 tabular-nums">
              J–{daysLeft}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-amber-700/70 dark:text-amber-200/70">
              Voir →
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
