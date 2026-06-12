// SPDX-License-Identifier: AGPL-3.0-or-later
// Hero du hub apprenant : salutation chaleureuse + mascotte qui flotte
// + niveau valorise + 4 stats douces (XP / Coins / Streak / Progress).

import HexBackdrop from "@/components/HexBackdrop";
import HexMascotEvolved, {
  LevelProgressBar,
} from "@/components/HexMascotEvolved";

type Equipped = Parameters<typeof HexMascotEvolved>[0]["equipped"];

type Props = {
  greet: string;
  firstName: string;
  totalXP: number;
  coins: number;
  streak: number;
  completedCount: number;
  totalEpisodes: number;
  currentLevel: { id: number; name: string; description: string };
  /** eslint-disable-next-line - l'union mood Auth.js v5 est volatile */
  mood?: string;
  mascotSpecies?: string;
  mascotEmojiCustom?: string | null;
  equipped: Equipped;
};

export default function LearnerHero({
  greet,
  firstName,
  totalXP,
  coins,
  streak,
  completedCount,
  totalEpisodes,
  currentLevel,
  mood,
  mascotSpecies,
  mascotEmojiCustom,
  equipped,
}: Props) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative bg-humanix-soft"
    >
      <HexBackdrop intensity="soft">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="flex justify-center sm:justify-start">
              <div className="animate-float">
                <HexMascotEvolved
                  xp={totalXP}
                  size="xl"
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                  mood={(mood ?? "happy") as any}
                  showLevel
                  animated
                  equipped={equipped}
                  species={mascotSpecies ?? "fox"}
                  customEmoji={mascotEmojiCustom ?? undefined}
                />
              </div>
            </div>

            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-accent-500 font-bold mb-2">
                Niveau {currentLevel.id} · {currentLevel.name}
              </p>
              <h1
                id="hero-title"
                className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3"
              >
                {greet}, {firstName}.
              </h1>
              <p className="italic text-base sm:text-lg text-gray-700 dark:text-gray-200 mb-5">
                « {currentLevel.description} »
              </p>
              <LevelProgressBar xp={totalXP} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <SoftStat emoji="⚡" value={totalXP.toString()} label="XP gagnes" />
                <SoftStat emoji="🪙" value={coins.toString()} label="Coins" />
                <SoftStat
                  emoji="🔥"
                  value={streak.toString()}
                  label={streak <= 1 ? "jour" : "jours"}
                />
                <SoftStat
                  emoji="✓"
                  value={`${completedCount}`}
                  label={`/ ${totalEpisodes}`}
                />
              </div>
            </div>
          </div>
        </div>
      </HexBackdrop>
    </section>
  );
}

function SoftStat({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 p-3 text-center shadow-sm">
      <p className="text-base" aria-hidden="true">
        {emoji}
      </p>
      <p className="font-display text-lg sm:text-xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}
