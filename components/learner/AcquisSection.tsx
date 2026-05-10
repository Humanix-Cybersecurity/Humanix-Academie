// SPDX-License-Identifier: AGPL-3.0-or-later
// Section "Tes acquis" - badges valorisants + phrase chaleureuse.

import Link from "next/link";

type Props = {
  completedCount: number;
  totalEpisodes: number;
  streak: number;
  totalXP: number;
  shareCount: number;
};

export default function AcquisSection({
  completedCount,
  totalEpisodes,
  streak,
  totalXP,
  shareCount,
}: Props) {
  const subtitle =
    streak >= 3
      ? `Tu construis du reflexe depuis ${streak} jours. C'est ca, la maitrise.`
      : completedCount >= 5
        ? "Tu as déjà un bagage solide. Continue d'aiguiser tes reflexes."
        : "Chaque module ajoute une corde a ton arc. Sans drame.";

  return (
    <section aria-labelledby="acquis-title">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2
            id="acquis-title"
            className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300"
          >
            Tes acquis
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1">
            {subtitle}
          </p>
        </div>
        <Link
          href="/profil/badges"
          className="text-sm text-accent-500 hover:text-accent-600 font-semibold underline-offset-4 hover:underline"
        >
          Tous mes badges →
        </Link>
      </div>

      <div className="card bg-gradient-to-br from-amber-50 via-white to-amber-50/50 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/10 border-amber-200 dark:border-amber-900/40">
        <div className="flex flex-wrap gap-3">
          {completedCount >= 1 && <Acquis emoji="🎯" label="Premier pas" />}
          {completedCount >= 3 && <Acquis emoji="🚀" label="3 episodes" />}
          {completedCount >= 5 && <Acquis emoji="🌟" label="5 episodes" />}
          {completedCount >= totalEpisodes && totalEpisodes > 0 && (
            <Acquis emoji="👑" label="Toutes saisons" />
          )}
          {streak >= 3 && <Acquis emoji="🔥" label="3 jours d'affilee" />}
          {streak >= 7 && <Acquis emoji="🌊" label="Une semaine" />}
          {totalXP >= 100 && <Acquis emoji="💯" label="100 XP" />}
          {totalXP >= 250 && <Acquis emoji="💎" label="250 XP" />}
          {totalXP >= 500 && <Acquis emoji="🏅" label="500 XP" />}
          {shareCount >= 1 && <Acquis emoji="📤" label="Partageur" />}
          {shareCount >= 3 && <Acquis emoji="🎖️" label="Ambassadeur" />}
          {shareCount >= 10 && <Acquis emoji="🌟" label="Evangeliste cyber" />}
          {completedCount === 0 && (
            <p className="text-sm text-amber-900/70 dark:text-amber-100/70 italic">
              Ton premier badge t'attend des le premier episode termine. Pas de
              pression - quand tu te sens pret.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Acquis({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 border-2 border-amber-200 dark:border-amber-900/50 flex items-center gap-2 shadow-sm hover:scale-105 hover:-translate-y-0.5 transition-all">
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-sm font-medium text-primary-500 dark:text-accent-300">
        {label}
      </span>
    </div>
  );
}
