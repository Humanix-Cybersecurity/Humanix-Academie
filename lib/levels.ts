// Humanix Académie — Système de niveaux & gamification
// 5 paliers d'évolution de la mascotte Hex

export type LevelDef = {
  id: number;
  name: string;
  emoji: string;
  minXP: number;
  maxXP: number; // exclusif (sauf le dernier niveau qui est infini)
  description: string;
  // Style mascotte
  bgGradient: string; // tailwind classes
  ringColor: string;
  particles: boolean;
  accessory: string | null; // emoji secondaire (couronne, lunettes...)
};

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "Apprenti",
    emoji: "🦊",
    minXP: 0,
    maxXP: 100,
    description: "Tu découvres les bases. Continue !",
    bgGradient: "from-gray-100 to-white",
    ringColor: "ring-gray-200",
    particles: false,
    accessory: null,
  },
  {
    id: 2,
    name: "Vigilant",
    emoji: "🦊",
    minXP: 100,
    maxXP: 300,
    description: "Tu connais les pièges classiques.",
    bgGradient: "from-blue-50 to-cyan-50",
    ringColor: "ring-cyan-200",
    particles: false,
    accessory: "✨",
  },
  {
    id: 3,
    name: "Gardien",
    emoji: "🦊",
    minXP: 300,
    maxXP: 700,
    description: "Tu protèges activement ton équipe.",
    bgGradient: "from-emerald-50 to-teal-50",
    ringColor: "ring-emerald-300",
    particles: true,
    accessory: "🛡️",
  },
  {
    id: 4,
    name: "Sentinelle",
    emoji: "🦊",
    minXP: 700,
    maxXP: 1500,
    description: "Référent cyber dans ta PME.",
    bgGradient: "from-amber-50 to-orange-50",
    ringColor: "ring-amber-400",
    particles: true,
    accessory: "👑",
  },
  {
    id: 5,
    name: "Maître",
    emoji: "🦊",
    minXP: 1500,
    maxXP: Number.POSITIVE_INFINITY,
    description: "Légende cyber. Tu rivalises avec les RSSI.",
    bgGradient: "from-purple-100 via-pink-100 to-amber-100",
    ringColor: "ring-purple-400",
    particles: true,
    accessory: "🏆",
  },
];

export function getLevel(xp: number): LevelDef {
  return [...LEVELS].reverse().find((l) => xp >= l.minXP) ?? LEVELS[0];
}

export function getNextLevel(xp: number): LevelDef | null {
  const current = getLevel(xp);
  return LEVELS.find((l) => l.id === current.id + 1) ?? null;
}

export function getXPProgress(xp: number): {
  current: LevelDef;
  next: LevelDef | null;
  pct: number; // % vers le niveau suivant (0..100)
  xpInLevel: number; // XP gagnés dans ce niveau
  xpNeededForNext: number; // XP totaux requis pour le prochain niveau
} {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) {
    return {
      current,
      next: null,
      pct: 100,
      xpInLevel: xp - current.minXP,
      xpNeededForNext: 0,
    };
  }
  const span = next.minXP - current.minXP;
  const xpInLevel = xp - current.minXP;
  const pct = Math.min(100, Math.round((xpInLevel / span) * 100));
  return { current, next, pct, xpInLevel, xpNeededForNext: next.minXP - xp };
}

// Coins gagnés à chaque épisode complété
// Base : 10 coins / épisode + bonus selon score
export function computeCoinsEarned(
  score: number,
  isPerfectQuiz: boolean,
): number {
  const base = 10;
  const scoreBonus = Math.max(0, Math.floor(score / 10)); // 1 coin par 10 points
  const perfectBonus = isPerfectQuiz ? 15 : 0;
  return base + scoreBonus + perfectBonus;
}
