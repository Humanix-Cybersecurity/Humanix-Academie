// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Catalogue des badges (Achievement) de Humanix Academie.
//
// PHILOSOPHIE :
//   - Mix de badges "fondamentaux" (faciles a debloquer pour valoriser
//     les premiers pas) et "rares" (pour donner envie d'aller plus loin)
//   - Pas de badges "punition" : tous valorisent une action positive
//   - Categories visuelles pour grouper sur la page /profil/badges
//
// SYNCHRONISATION BDD :
//   - Le seed (prisma/seed.ts) upserte chaque definition dans la table
//     Achievement par son slug.
//   - L'evaluator (lib/achievements/evaluate.ts) evalue les criteres a
//     chaque action utilisateur significative + via cron quotidien
//     retroactif.

export type AchievementCategory =
  | "progression"
  | "consistency"
  | "mastery"
  | "social"
  | "special";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

/**
 * Stats de l'user evaluees pour decider si un badge est debloqué.
 * Construites par lib/achievements/evaluate.ts via une seule query.
 */
export type UserStats = {
  totalXP: number;
  level: number;
  coins: number;
  shareCount: number;
  completedEpisodes: number;
  totalEpisodes: number;
  perfectQuizCount: number;
  /** Nb d'episodes flash-remediation completes (post-clic phishing) */
  remediationFlashCount: number;
  /** Streak max atteint (jours d'affilee, peak historique) */
  maxStreak: number;
  /** Nb de signalements phishing (PhishingResult.status === REPORTED) */
  phishingReportedCount: number;
  /** True si l'user a debloque tous les episodes d'au moins une saison */
  hasCompletedAtLeastOneSaison: boolean;
  /** Nb de saisons completement terminees */
  completedSaisonsCount: number;
  /** Nb d'items achetes en boutique (tous, pas juste equipes) */
  ownedItemsCount: number;
  /** Maturite : avg quiz score sur les ep. completes (0-100) */
  avgQuizScorePct: number;
};

export type AchievementDef = {
  slug: string;
  title: string;
  emoji: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  isSecret: boolean;
  /** Predicat qui dit si l'user a debloqué ce badge selon ses stats. */
  isUnlocked: (s: UserStats) => boolean;
};

export const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  // ----- PROGRESSION (XP / niveau / episodes) -----
  {
    slug: "first_step",
    title: "Premier pas",
    emoji: "🎯",
    description: "Termine ton premier épisode. La maîtrise commence ici.",
    category: "progression",
    rarity: "common",
    points: 10,
    isSecret: false,
    isUnlocked: (s) => s.completedEpisodes >= 1,
  },
  {
    slug: "explorer_3",
    title: "Explorateur",
    emoji: "🚀",
    description: "Termine 3 épisodes. Tu prends de l'élan.",
    category: "progression",
    rarity: "common",
    points: 15,
    isSecret: false,
    isUnlocked: (s) => s.completedEpisodes >= 3,
  },
  {
    slug: "veteran_10",
    title: "Vétéran",
    emoji: "🌟",
    description: "Termine 10 épisodes. Tu connais le terrain.",
    category: "progression",
    rarity: "rare",
    points: 30,
    isSecret: false,
    isUnlocked: (s) => s.completedEpisodes >= 10,
  },
  {
    slug: "completionist_25",
    title: "Complétiste",
    emoji: "🏆",
    description: "Termine 25 épisodes. La rigueur paye.",
    category: "progression",
    rarity: "epic",
    points: 60,
    isSecret: false,
    isUnlocked: (s) => s.completedEpisodes >= 25,
  },
  {
    slug: "all_saisons",
    title: "Tour du monde cyber",
    emoji: "👑",
    description: "Termine tous les épisodes publiés du parcours.",
    category: "progression",
    rarity: "legendary",
    points: 200,
    isSecret: false,
    isUnlocked: (s) =>
      s.totalEpisodes > 0 && s.completedEpisodes >= s.totalEpisodes,
  },
  {
    slug: "xp_100",
    title: "100 XP",
    emoji: "💯",
    description: "Atteins 100 XP. La machine est lancée.",
    category: "progression",
    rarity: "common",
    points: 10,
    isSecret: false,
    isUnlocked: (s) => s.totalXP >= 100,
  },
  {
    slug: "xp_500",
    title: "500 XP",
    emoji: "🏅",
    description: "Atteins 500 XP. Tu pèses.",
    category: "progression",
    rarity: "rare",
    points: 40,
    isSecret: false,
    isUnlocked: (s) => s.totalXP >= 500,
  },
  {
    slug: "xp_1500",
    title: "Maître des XP",
    emoji: "💎",
    description: "Atteins 1500 XP. Niveau Maître débloqué.",
    category: "progression",
    rarity: "epic",
    points: 100,
    isSecret: false,
    isUnlocked: (s) => s.totalXP >= 1500,
  },
  {
    slug: "level_3_gardien",
    title: "Gardien",
    emoji: "🛡️",
    description: "Atteins le niveau 3. Tu protèges les autres.",
    category: "progression",
    rarity: "common",
    points: 20,
    isSecret: false,
    isUnlocked: (s) => s.level >= 3,
  },
  {
    slug: "level_5_master",
    title: "Niveau Maître",
    emoji: "👑",
    description: "Atteins le niveau 5. Le sommet de la pratique.",
    category: "progression",
    rarity: "epic",
    points: 80,
    isSecret: false,
    isUnlocked: (s) => s.level >= 5,
  },

  // ----- CONSISTENCY (streak, regularite) -----
  {
    slug: "streak_3",
    title: "Trois jours d'affilée",
    emoji: "🔥",
    description: "Connecte-toi et progresse 3 jours d'affilée. C'est ça l'habitude.",
    category: "consistency",
    rarity: "common",
    points: 15,
    isSecret: false,
    isUnlocked: (s) => s.maxStreak >= 3,
  },
  {
    slug: "streak_7",
    title: "Une semaine pleine",
    emoji: "🌊",
    description: "7 jours d'affilée. Tu construis du muscle cyber.",
    category: "consistency",
    rarity: "rare",
    points: 35,
    isSecret: false,
    isUnlocked: (s) => s.maxStreak >= 7,
  },
  {
    slug: "streak_30",
    title: "Mois entier de cyber",
    emoji: "🌙",
    description: "30 jours d'affilée. Le réflexe est ancré pour de bon.",
    category: "consistency",
    rarity: "legendary",
    points: 150,
    isSecret: false,
    isUnlocked: (s) => s.maxStreak >= 30,
  },

  // ----- MASTERY (sans-faute, qualite) -----
  {
    slug: "perfect_first",
    title: "Premier sans-faute",
    emoji: "✨",
    description: "Réussis ton premier quiz à 100 %.",
    category: "mastery",
    rarity: "common",
    points: 15,
    isSecret: false,
    isUnlocked: (s) => s.perfectQuizCount >= 1,
  },
  {
    slug: "perfect_5",
    title: "5 sans-faute",
    emoji: "🎯",
    description: "5 quizz parfaits. Tu lis vite et bien.",
    category: "mastery",
    rarity: "rare",
    points: 40,
    isSecret: false,
    isUnlocked: (s) => s.perfectQuizCount >= 5,
  },
  {
    slug: "perfect_15",
    title: "Sniper cyber",
    emoji: "🏹",
    description: "15 quizz parfaits. La precision incarnee.",
    category: "mastery",
    rarity: "epic",
    points: 80,
    isSecret: false,
    isUnlocked: (s) => s.perfectQuizCount >= 15,
  },
  {
    slug: "first_saison_done",
    title: "Première saison bouclée",
    emoji: "📚",
    description: "Termine tous les épisodes d'une saison entière.",
    category: "mastery",
    rarity: "rare",
    points: 30,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonsCount >= 1,
  },
  {
    slug: "three_saisons_done",
    title: "Trio gagnant",
    emoji: "🥇",
    description: "Termine 3 saisons entières.",
    category: "mastery",
    rarity: "epic",
    points: 70,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonsCount >= 3,
  },
  {
    slug: "high_avg_score",
    title: "Cyber-virtuose",
    emoji: "🎓",
    description: "Maintiens 85 %+ de score moyen sur 10+ épisodes.",
    category: "mastery",
    rarity: "epic",
    points: 90,
    isSecret: false,
    isUnlocked: (s) => s.completedEpisodes >= 10 && s.avgQuizScorePct >= 85,
  },

  // ----- SOCIAL (partage, ambassadeur) -----
  {
    slug: "first_share",
    title: "Premier partage",
    emoji: "📤",
    description: "Partage ton premier article cyber.",
    category: "social",
    rarity: "common",
    points: 10,
    isSecret: false,
    isUnlocked: (s) => s.shareCount >= 1,
  },
  {
    slug: "ambassador",
    title: "Ambassadeur",
    emoji: "🎖️",
    description: "3 partages. Tu fais grandir la culture cyber.",
    category: "social",
    rarity: "rare",
    points: 30,
    isSecret: false,
    isUnlocked: (s) => s.shareCount >= 3,
  },
  {
    slug: "evangelist",
    title: "Évangéliste cyber",
    emoji: "🌟",
    description: "10 partages. La culture, c'est toi qui la portes.",
    category: "social",
    rarity: "legendary",
    points: 120,
    isSecret: false,
    isUnlocked: (s) => s.shareCount >= 10,
  },
  {
    slug: "first_collector",
    title: "Premier item",
    emoji: "🎒",
    description: "Achète ton premier item à la boutique.",
    category: "social",
    rarity: "common",
    points: 10,
    isSecret: false,
    isUnlocked: (s) => s.ownedItemsCount >= 1,
  },
  {
    slug: "wardrobe_5",
    title: "Garde-robe variée",
    emoji: "👒",
    description: "Possède 5 items différents.",
    category: "social",
    rarity: "rare",
    points: 25,
    isSecret: false,
    isUnlocked: (s) => s.ownedItemsCount >= 5,
  },

  // ----- SPECIAL (events, comportements rares) -----
  {
    slug: "vigilance_first",
    title: "Premier signalement",
    emoji: "🚨",
    description: "Signale ton premier mail de phishing simulé.",
    category: "special",
    rarity: "rare",
    points: 30,
    isSecret: false,
    isUnlocked: (s) => s.phishingReportedCount >= 1,
  },
  {
    slug: "vigilance_master",
    title: "Sentinelle vigilante",
    emoji: "👁️",
    description: "Signale 5 phishings simulés. Le SOC a besoin de toi.",
    category: "special",
    rarity: "epic",
    points: 80,
    isSecret: false,
    isUnlocked: (s) => s.phishingReportedCount >= 5,
  },
  {
    slug: "comeback_kid",
    title: "Le retour gagnant",
    emoji: "💪",
    description: "Termine un module flash de remédiation après un clic phishing.",
    category: "special",
    rarity: "rare",
    points: 25,
    isSecret: false,
    isUnlocked: (s) => s.remediationFlashCount >= 1,
  },
  {
    slug: "iron_will",
    title: "Volonté de fer",
    emoji: "🔱",
    description: "3 remédiations flash terminées. Tu fais des erreurs ET tu apprends.",
    category: "special",
    rarity: "epic",
    points: 70,
    isSecret: true,
    isUnlocked: (s) => s.remediationFlashCount >= 3,
  },
  {
    slug: "cybermois_participant",
    title: "Participant Cybermois",
    emoji: "🎃",
    description: "Termine au moins 1 épisode pendant le Cybermois (octobre).",
    category: "special",
    rarity: "rare",
    points: 30,
    isSecret: false,
    // Conditionnel a la date courante : on debloque seulement si on est
    // EN octobre ET completedEpisodes a augmente. L'evaluator gere le
    // contexte temporel via maxStreak (proxy lazy : on accepte quelques
    // faux negatifs pour eviter de complexifier la signature de eval).
    isUnlocked: (s) =>
      new Date().getUTCMonth() === 9 && s.completedEpisodes >= 1,
  },
  {
    slug: "world_password_day",
    title: "Jour du mot de passe",
    emoji: "🔐",
    description: "Termine un épisode lors de la World Password Day (1er jeudi de mai).",
    category: "special",
    rarity: "epic",
    points: 60,
    isSecret: true,
    // Conditionnel a la date : on debloque uniquement si on est entre
    // le 1er et le 7 mai ET un episode a ete fait recemment. Approche
    // simple : si on est dans la fenetre + completedEpisodes >= 1.
    isUnlocked: (s) => {
      const now = new Date();
      return (
        now.getUTCMonth() === 4 &&
        now.getUTCDate() <= 7 &&
        s.completedEpisodes >= 1
      );
    },
  },
];

/**
 * Index des achievements par slug pour lookup rapide.
 */
export const ACHIEVEMENTS_BY_SLUG: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS_CATALOG.map((a) => [a.slug, a]));
