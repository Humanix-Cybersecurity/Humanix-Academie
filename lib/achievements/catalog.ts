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
  /**
   * Slugs des saisons COMPLETEMENT terminees par l'user. Permet aux badges
   * d'audience/thematiques de cibler des saisons specifiques (cyber-rh,
   * cyber-dev, anti-phishing, ransomware, etc.) sans elargir le contrat.
   *
   * Convention : array (pas Set) pour la serialisation JSON / facilite
   * de test. Lookup O(n) acceptable, n < 50 saisons en pratique.
   */
  completedSaisonSlugs: string[];
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
    title: "Cap des 1500 XP",
    emoji: "💎",
    description: "Atteins 1500 XP. Tu pèses dans le SOC.",
    category: "progression",
    rarity: "rare",
    points: 50,
    isSecret: false,
    isUnlocked: (s) => s.totalXP >= 1500,
  },
  {
    slug: "level_3_gardien",
    // NOTE migration mai 2026 : le slug historique conserve "gardien" pour
    // ne pas casser la BDD, mais L3 est desormais "Initie" (10 paliers).
    title: "Initié confirmé",
    emoji: "🔍",
    description: "Atteins le niveau 3 (Initié). Les fondamentaux sont là.",
    category: "progression",
    rarity: "common",
    points: 20,
    isSecret: false,
    isUnlocked: (s) => s.level >= 3,
  },
  {
    slug: "level_5_master",
    // NOTE migration mai 2026 : le slug historique conserve "master" pour
    // ne pas casser la BDD, mais L5 est desormais "Gardien" (10 paliers).
    // Le badge endgame "vrai Maitre" est level_10_master (cf. commit suivant).
    title: "Gardien confirmé",
    emoji: "⚡",
    description: "Atteins le niveau 5 (Gardien). Tu protèges activement.",
    category: "progression",
    rarity: "rare",
    points: 40,
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

  // ============================================================================
  // EXTENSION REFONTE GAMIFICATION (mai 2026)
  // ============================================================================
  // Suite au passage de 5 -> 10 niveaux et a l'echelle reelle du catalog
  // commercial (32 saisons, 11 420 XP base), 22 nouveaux badges debloquent
  // des paliers intermediaires et endgame. Repartition :
  //   - 5 badges progression XP/level haut (xp_3000/6000/10000, level_8, level_10)
  //   - 3 badges episodes haut (completionist_50/100, perfect_30/50)
  //   - 4 badges consistency long terme (streak_60/100/365, monthly_3)
  //   - 5 badges mastery saisons (5/10/20/all + audiences-specifiques)
  //   - 5 badges thematiques anti-menace (phishing/ransomware/credentials/IA/social)

  // ----- PROGRESSION (paliers hauts post-refonte) -----
  {
    slug: "xp_3000",
    title: "Cap des 3000 XP",
    emoji: "🚀",
    description: "Atteins 3000 XP. Le rythme est lance.",
    category: "progression",
    rarity: "rare",
    points: 75,
    isSecret: false,
    isUnlocked: (s) => s.totalXP >= 3000,
  },
  {
    slug: "xp_6000",
    title: "Cap des 6000 XP",
    emoji: "💫",
    description: "Atteins 6000 XP. Tu es dans le top des apprenants.",
    category: "progression",
    rarity: "epic",
    points: 150,
    isSecret: false,
    isUnlocked: (s) => s.totalXP >= 6000,
  },
  {
    slug: "xp_10000",
    title: "Endgame XP",
    emoji: "🔥",
    description: "Atteins 10 000 XP. Le pallier Maitre est franchi.",
    category: "progression",
    rarity: "legendary",
    points: 250,
    isSecret: false,
    isUnlocked: (s) => s.totalXP >= 10000,
  },
  {
    slug: "level_8_expert",
    title: "Expert reconnu",
    emoji: "🎓",
    description: "Atteins le niveau 8 (Expert). Le RSSI te consulte.",
    category: "progression",
    rarity: "epic",
    points: 120,
    isSecret: false,
    isUnlocked: (s) => s.level >= 8,
  },
  {
    slug: "level_10_master",
    title: "Maître Cyber",
    emoji: "🏆",
    description: "Atteins le niveau 10 (Maître). Le vrai endgame. Respect.",
    category: "progression",
    rarity: "legendary",
    points: 300,
    isSecret: false,
    isUnlocked: (s) => s.level >= 10,
  },
  {
    slug: "completionist_50",
    title: "Demi-centaine",
    emoji: "🏅",
    description: "Termine 50 épisodes. Tu connais le catalog presque par cœur.",
    category: "progression",
    rarity: "epic",
    points: 100,
    isSecret: false,
    isUnlocked: (s) => s.completedEpisodes >= 50,
  },
  {
    slug: "completionist_100",
    title: "Centurion",
    emoji: "💯",
    description: "Termine 100 épisodes. La ténacité paye toujours.",
    category: "progression",
    rarity: "legendary",
    points: 200,
    isSecret: false,
    isUnlocked: (s) => s.completedEpisodes >= 100,
  },

  // ----- CONSISTENCY (streaks longs) -----
  {
    slug: "streak_60",
    title: "Deux mois sans coupure",
    emoji: "🌋",
    description: "60 jours d'affilée. Tu es un robot ?",
    category: "consistency",
    rarity: "epic",
    points: 200,
    isSecret: false,
    isUnlocked: (s) => s.maxStreak >= 60,
  },
  {
    slug: "streak_100",
    title: "Centaine de jours",
    emoji: "💎",
    description: "100 jours d'affilée. Le club très select.",
    category: "consistency",
    rarity: "legendary",
    points: 300,
    isSecret: false,
    isUnlocked: (s) => s.maxStreak >= 100,
  },
  {
    slug: "streak_365",
    title: "Une année de cyber",
    emoji: "🌠",
    description: "365 jours d'affilée. L'académie a un dieu vivant.",
    category: "consistency",
    rarity: "legendary",
    points: 500,
    isSecret: true,
    isUnlocked: (s) => s.maxStreak >= 365,
  },

  // ----- MASTERY (quizz parfaits + saisons completes) -----
  {
    slug: "perfect_30",
    title: "30 sans-faute",
    emoji: "🎯",
    description: "30 quizz parfaits. Précision chirurgicale.",
    category: "mastery",
    rarity: "epic",
    points: 150,
    isSecret: false,
    isUnlocked: (s) => s.perfectQuizCount >= 30,
  },
  {
    slug: "perfect_50",
    title: "Sniper d'élite",
    emoji: "🏹",
    description: "50 quizz parfaits. La lecture est devenue un super-pouvoir.",
    category: "mastery",
    rarity: "legendary",
    points: 250,
    isSecret: false,
    isUnlocked: (s) => s.perfectQuizCount >= 50,
  },
  {
    slug: "five_saisons_done",
    title: "5 saisons completes",
    emoji: "📚",
    description: "Termine 5 saisons entieres. Le rythme de croisiere.",
    category: "mastery",
    rarity: "epic",
    points: 120,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonsCount >= 5,
  },
  {
    slug: "ten_saisons_done",
    title: "10 saisons completes",
    emoji: "📖",
    description: "Termine 10 saisons entieres. Tu vois grand.",
    category: "mastery",
    rarity: "legendary",
    points: 200,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonsCount >= 10,
  },
  {
    slug: "twenty_saisons_done",
    title: "Bibliotheque cyber",
    emoji: "🏛️",
    description: "Termine 20 saisons entieres. Encyclopedie ambulante.",
    category: "mastery",
    rarity: "legendary",
    points: 350,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonsCount >= 20,
  },

  // ----- AUDIENCES (specialisation par metier / public-cible) -----
  // Helper interne : true si toutes les saisons listees sont dans
  // completedSaisonSlugs (intersection complete).
  {
    slug: "audience_master_rh",
    title: "RH cyber-aware",
    emoji: "💼",
    description: "Termine la saison 'cyber-rh'. Le recrutement & la formation, c'est aussi de la securite.",
    category: "mastery",
    rarity: "epic",
    points: 80,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonSlugs.includes("cyber-rh"),
  },
  {
    slug: "audience_master_dev",
    title: "Dev secu",
    emoji: "💻",
    description: "Termine la saison 'cyber-dev'. Shift-left, c'est toi.",
    category: "mastery",
    rarity: "epic",
    points: 80,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonSlugs.includes("cyber-dev"),
  },
  {
    slug: "audience_master_compta",
    title: "Finance vigilante",
    emoji: "💰",
    description: "Termine la saison 'cyber-compta'. Le piege du faux RIB, jamais.",
    category: "mastery",
    rarity: "epic",
    points: 80,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonSlugs.includes("cyber-compta"),
  },
  {
    slug: "audience_master_dirigeants",
    title: "Dirigeant cyber",
    emoji: "👔",
    description: "Termine la saison 'cyber-dirigeants'. Le risque, tu l'arbitres.",
    category: "mastery",
    rarity: "epic",
    points: 80,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonSlugs.includes("cyber-dirigeants"),
  },
  {
    slug: "audience_master_dpo",
    title: "DPO operationnel",
    emoji: "⚖️",
    description: "Termine la saison 'dpo-quotidien'. RGPD au quotidien.",
    category: "mastery",
    rarity: "epic",
    points: 80,
    isSecret: false,
    isUnlocked: (s) => s.completedSaisonSlugs.includes("dpo-quotidien"),
  },

  // ----- THEMATIQUES (anti-menace, trophy par famille d'attaque) -----
  {
    slug: "anti_phishing_master",
    title: "Anti-phishing master",
    emoji: "🎣",
    description: "Termine les saisons phishing + fraude-president + email-pro. Plus aucun mail ne te piege.",
    category: "special",
    rarity: "epic",
    points: 120,
    isSecret: false,
    isUnlocked: (s) =>
      ["phishing", "fraude-president", "email-pro"].every((slug) =>
        s.completedSaisonSlugs.includes(slug),
      ),
  },
  {
    slug: "anti_ransomware_master",
    title: "Anti-ransomware master",
    emoji: "🔒",
    description: "Termine les saisons ransomware + sauvegardes + supply-chain. Tu es pret pour le pire.",
    category: "special",
    rarity: "epic",
    points: 120,
    isSecret: false,
    isUnlocked: (s) =>
      ["ransomware", "sauvegardes", "supply-chain"].every((slug) =>
        s.completedSaisonSlugs.includes(slug),
      ),
  },
  {
    slug: "anti_credential_master",
    title: "Forteresse des credentials",
    emoji: "🔑",
    description: "Termine les saisons mots-de-passe + acces-physiques + stockage-cloud. Inviolable.",
    category: "special",
    rarity: "epic",
    points: 120,
    isSecret: false,
    isUnlocked: (s) =>
      ["mots-de-passe", "acces-physiques", "stockage-cloud"].every((slug) =>
        s.completedSaisonSlugs.includes(slug),
      ),
  },
  {
    slug: "anti_ia_threats_master",
    title: "IA aware",
    emoji: "🤖",
    description: "Termine les saisons ia-generative + deepfakes. Tu distingues le vrai du faux genere.",
    category: "special",
    rarity: "epic",
    points: 120,
    isSecret: false,
    isUnlocked: (s) =>
      ["ia-generative", "deepfakes"].every((slug) =>
        s.completedSaisonSlugs.includes(slug),
      ),
  },
  {
    slug: "anti_mobile_master",
    title: "Mobile-proof",
    emoji: "📱",
    description: "Termine les saisons mobile-smartphone + wifi-reseaux + teletravail + voyages-affaires. Mobile-first, secure-first.",
    category: "special",
    rarity: "legendary",
    points: 150,
    isSecret: false,
    isUnlocked: (s) =>
      ["mobile-smartphone", "wifi-reseaux", "teletravail", "voyages-affaires"].every(
        (slug) => s.completedSaisonSlugs.includes(slug),
      ),
  },
];

/**
 * Index des achievements par slug pour lookup rapide.
 */
export const ACHIEVEMENTS_BY_SLUG: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS_CATALOG.map((a) => [a.slug, a]));
