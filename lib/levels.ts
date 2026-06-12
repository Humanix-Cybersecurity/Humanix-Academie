// SPDX-License-Identifier: AGPL-3.0-or-later
// Humanix Académie - Système de niveaux & gamification
// -----------------------------------------------------------------------------
// 10 paliers d'évolution de la mascotte Hex, calibrés sur le catalogue
// COMMERCIAL de 32 saisons / 190 épisodes / ~11 420 XP de contenu de base.
//
// PHILOSOPHIE :
//   - Atteindre Maître L10 demande ~88% du contenu OU 60-70% + bonus
//     (perfect quizzes +10 XP, streak quotidien +5 XP/jour, badge +50 XP).
//   - Pas de plafond mou : Maître = vrai endgame, pas un trophée gratuit.
//   - Courbe légèrement exponentielle : chaque palier demande plus de XP
//     que le précédent (pas un simple +1500 entre L9 et L10).
//
// MIGRATION HISTORIQUE (mai 2026) :
//   Ancien système 5 niveaux (0/100/300/700/1500) déprécié - les apprenants
//   atteignaient Maître après 15% du contenu seulement (~5 saisons sur 32).
//   Les IDs 1-5 conservent leurs noms mais les seuils sont relevés ; les IDs
//   6-10 sont nouveaux. Les badges level_X référencent les nouveaux paliers.

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
    name: "Novice",
    emoji: "🦊",
    minXP: 0,
    maxXP: 150,
    description: "Tu fais tes premiers pas. Bienvenue dans l'académie !",
    bgGradient: "from-gray-100 to-white",
    ringColor: "ring-gray-200",
    particles: false,
    accessory: null,
  },
  {
    id: 2,
    name: "Apprenti",
    emoji: "🦊",
    minXP: 150,
    maxXP: 400,
    description: "Tu découvres les bases. Continue !",
    bgGradient: "from-slate-100 to-gray-50",
    ringColor: "ring-slate-300",
    particles: false,
    accessory: "✨",
  },
  {
    id: 3,
    name: "Initié",
    emoji: "🦊",
    minXP: 400,
    maxXP: 800,
    description: "Tu maîtrises les fondamentaux.",
    bgGradient: "from-blue-50 to-cyan-50",
    ringColor: "ring-cyan-300",
    particles: false,
    accessory: "🔍",
  },
  {
    id: 4,
    name: "Vigilant",
    emoji: "🦊",
    minXP: 800,
    maxXP: 1400,
    description: "Tu reconnais les pièges classiques.",
    bgGradient: "from-cyan-50 to-teal-50",
    ringColor: "ring-teal-300",
    particles: false,
    accessory: "🛡️",
  },
  {
    id: 5,
    name: "Gardien",
    emoji: "🦊",
    minXP: 1400,
    maxXP: 2200,
    description: "Tu protèges activement ton équipe.",
    bgGradient: "from-emerald-50 to-teal-50",
    ringColor: "ring-emerald-400",
    particles: true,
    accessory: "⚡",
  },
  {
    id: 6,
    name: "Sentinelle",
    emoji: "🦊",
    minXP: 2200,
    maxXP: 3300,
    description: "Référent cyber de ton entourage.",
    bgGradient: "from-amber-50 to-orange-50",
    ringColor: "ring-amber-400",
    particles: true,
    accessory: "⚔️",
  },
  {
    id: 7,
    name: "Veilleur",
    emoji: "🦊",
    minXP: 3300,
    maxXP: 4800,
    description: "Tu repères les menaces avant qu'elles n'arrivent.",
    bgGradient: "from-orange-50 to-red-50",
    ringColor: "ring-orange-500",
    particles: true,
    accessory: "👁️",
  },
  {
    id: 8,
    name: "Expert",
    emoji: "🦊",
    minXP: 4800,
    maxXP: 7000,
    description: "Ton niveau force le respect des RSSI.",
    bgGradient: "from-violet-50 to-purple-50",
    ringColor: "ring-violet-500",
    particles: true,
    accessory: "🎓",
  },
  {
    id: 9,
    name: "Champion",
    emoji: "🦊",
    minXP: 7000,
    maxXP: 10000,
    description: "Tu rivalises avec les meilleurs hunters.",
    bgGradient: "from-fuchsia-50 via-pink-50 to-rose-50",
    ringColor: "ring-fuchsia-500",
    particles: true,
    accessory: "👑",
  },
  {
    id: 10,
    name: "Maître",
    emoji: "🦊",
    minXP: 10000,
    maxXP: Number.POSITIVE_INFINITY,
    description: "Légende cyber. Tu as quasiment tout fait. Respect.",
    bgGradient: "from-purple-100 via-pink-100 to-amber-100",
    ringColor: "ring-purple-500",
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

// -----------------------------------------------------------------------------
// Bonus XP au-dela de l'XP de base par episode
// -----------------------------------------------------------------------------
// Ces bonus permettent d'atteindre Maitre L10 (10 000 XP) sans avoir
// imperativement complete 100% des 11 420 XP de base : il faut chasser les
// quizs parfaits, maintenir une streak quotidienne, et collectionner les
// badges. Cf. app/api/progress/route.ts pour le wiring.

/** Bonus XP accorde pour un quiz parfait (score = 100). */
export const PERFECT_QUIZ_XP_BONUS = 10;

/** Bonus XP quotidien accorde a partir du 3e jour consecutif (streak). */
export const STREAK_XP_BONUS_PER_DAY = 5;

/** Jour de streak a partir duquel le bonus commence a s'accumuler. */
export const STREAK_BONUS_START_DAY = 3;

/** Bonus XP one-shot accorde quand un badge est debloque. */
export const BADGE_UNLOCK_XP_BONUS = 50;

/**
 * Bonus XP cumule pour une streak donnee (jours consecutifs d'activite).
 * - Jours 1-2 : 0 bonus (on demarre)
 * - Jour 3+ : +5 XP / jour
 * - Pas de cap (mais une streak >365j est tres rare et legitimement recompensee)
 */
export function computeStreakXPBonus(streakDays: number): number {
  if (streakDays < STREAK_BONUS_START_DAY) return 0;
  return (streakDays - STREAK_BONUS_START_DAY + 1) * STREAK_XP_BONUS_PER_DAY;
}
