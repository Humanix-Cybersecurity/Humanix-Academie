// Mascotte evolutive — 5 paliers + customizations boutique + choix d'espece
import { getLevel, getXPProgress, type LevelDef } from "@/lib/levels";
import type { EquippedItems } from "@/lib/shop";
import { getMascotById } from "@/lib/mascots";
import clsx from "clsx";

type Mood = "neutral" | "happy" | "sad" | "curious" | "celebrate" | "thinking";
type Size = "sm" | "md" | "lg" | "xl" | "hero";

const SIZES: Record<
  Size,
  { emoji: string; container: string; accessory: string; subAcc: string }
> = {
  sm: {
    emoji: "text-2xl",
    container: "w-12 h-12",
    accessory: "text-sm",
    subAcc: "text-xs",
  },
  md: {
    emoji: "text-4xl",
    container: "w-20 h-20",
    accessory: "text-base",
    subAcc: "text-sm",
  },
  lg: {
    emoji: "text-6xl",
    container: "w-28 h-28",
    accessory: "text-2xl",
    subAcc: "text-base",
  },
  xl: {
    emoji: "text-7xl",
    container: "w-36 h-36",
    accessory: "text-3xl",
    subAcc: "text-xl",
  },
  hero: {
    emoji: "text-9xl",
    container: "w-48 h-48",
    accessory: "text-5xl",
    subAcc: "text-3xl",
  },
};

const MOOD_ANIM: Record<Mood, string> = {
  neutral: "",
  happy: "animate-wiggle",
  sad: "animate-fadeIn opacity-70",
  curious: "animate-pulse-once",
  celebrate: "animate-bounce-once",
  thinking: "animate-pulse-once",
};

export default function HexMascotEvolved({
  xp = 0,
  level: levelOverride,
  mood = "neutral",
  size = "md",
  showLevel = false,
  animated = false,
  equipped,
  species = "fox",
  customEmoji,
}: {
  xp?: number;
  level?: LevelDef;
  mood?: Mood;
  size?: Size;
  showLevel?: boolean;
  animated?: boolean;
  equipped?: EquippedItems;
  species?: string;
  // Emoji libre qui override l'emoji de l'espece. Utile pour permettre a
  // l'utilisateur de personnaliser au-dela du catalogue MASCOT_SPECIES.
  customEmoji?: string | null;
}) {
  const level = levelOverride ?? getLevel(xp);
  const sz = SIZES[size];
  const animClass = animated ? MOOD_ANIM[mood] : "";
  const mascot = getMascotById(species);
  // L'emoji affiche : custom > espece de la liste
  const displayedEmoji =
    customEmoji && customEmoji.trim().length > 0 ? customEmoji : mascot.emoji;

  // Le chapeau equipe override l'accessoire de niveau (couronne/bouclier...)
  const hatToShow = equipped?.hat ?? level.accessory;
  const glassesToShow = equipped?.glasses;
  const accessoryToShow = equipped?.accessory; // accessoire flottant additionnel

  // Background : custom equipe override le gradient de niveau
  const bgGradient = equipped?.background ?? level.bgGradient;

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative">
        {/* Particules pour les niveaux 3+ */}
        {level.particles && (
          <>
            <span className="absolute -top-2 -left-2 text-amber-400 animate-bounce-slow text-xs">
              ✦
            </span>
            <span
              className="absolute -top-1 -right-3 text-amber-400 animate-bounce-slow text-xs"
              style={{ animationDelay: "0.5s" }}
            >
              ✦
            </span>
            <span
              className="absolute -bottom-2 -left-3 text-amber-400 animate-bounce-slow text-xs"
              style={{ animationDelay: "1s" }}
            >
              ✦
            </span>
          </>
        )}

        {/* Bulle de fond (gradient) */}
        <div
          className={clsx(
            "rounded-full bg-gradient-to-br flex items-center justify-center ring-4 transition-all duration-500 relative",
            bgGradient,
            level.ringColor,
            sz.container,
            animClass,
          )}
        >
          <span
            className={sz.emoji}
            role="img"
            aria-label={`Mascotte ${mascot.name}, niveau ${level.id}`}
          >
            {displayedEmoji}
          </span>

          {/* Lunettes equipees - sur le visage */}
          {glassesToShow && (
            <span
              className={clsx("absolute drop-shadow-md", sz.subAcc)}
              style={{ top: "30%", transform: "translateY(-50%)" }}
            >
              {glassesToShow}
            </span>
          )}
        </div>

        {/* Chapeau / accessoire de tete (top-right) */}
        {hatToShow && (
          <span
            className={clsx(
              "absolute -top-3 -right-3 drop-shadow-md",
              sz.accessory,
              level.id >= 4 ? "animate-bounce-slow" : "",
            )}
          >
            {hatToShow}
          </span>
        )}

        {/* Accessoire flottant equipe (bottom-left) */}
        {accessoryToShow && (
          <span
            className={clsx(
              "absolute -bottom-3 -left-3 drop-shadow-md animate-bounce-slow",
              sz.subAcc,
            )}
            style={{ animationDelay: "0.7s" }}
          >
            {accessoryToShow}
          </span>
        )}

        {/* Mood bubble */}
        {mood !== "neutral" && (
          <span className="absolute -bottom-2 -right-2 bg-white rounded-full px-1.5 py-0.5 shadow-md text-base animate-fadeIn">
            {mood === "happy" && "😊"}
            {mood === "sad" && "😟"}
            {mood === "curious" && "🤔"}
            {mood === "celebrate" && "🎉"}
            {mood === "thinking" && "💭"}
          </span>
        )}
      </div>

      {showLevel && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
            Niveau {level.id}
          </p>
          <p
            className={clsx(
              "font-bold",
              level.id === 5
                ? "text-purple-600"
                : level.id === 4
                  ? "text-amber-600"
                  : level.id === 3
                    ? "text-emerald-600"
                    : level.id === 2
                      ? "text-cyan-600"
                      : "text-gray-700",
            )}
          >
            {level.name}
          </p>
        </div>
      )}
    </div>
  );
}

export function LevelProgressBar({ xp }: { xp: number }) {
  const { current, next, pct, xpInLevel, xpNeededForNext } = getXPProgress(xp);

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1.5 text-xs">
        <span className="font-bold text-primary-500">
          Niveau {current.id} · {current.name}
        </span>
        {next ? (
          <span className="text-gray-500">
            {xpNeededForNext} XP pour le niveau {next.id}
          </span>
        ) : (
          <span className="text-purple-600 font-bold">
            Niveau max atteint 🏆
          </span>
        )}
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-500 via-primary-500 to-purple-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1 text-center">
        {xpInLevel} XP gagnés dans ce niveau
      </p>
    </div>
  );
}
