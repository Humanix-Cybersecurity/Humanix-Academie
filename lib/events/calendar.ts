// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Calendrier des evenements cyber annuels (mai 2026).
//
// CAS D'USAGE :
//   - Cybermois (octobre) : challenge auto-cree, bandeau sur /apprendre,
//     items boutique exclusifs (citrouille, fantome).
//   - World Password Day (1er jeudi de mai) : badge "Jour du mot de
//     passe", focus sur la saison "mots-de-passe".
//   - Data Protection Day (28 janvier) : focus RGPD.
//   - Anti-Phishing Day (juin) : focus phishing.
//   - World Backup Day (31 mars) : focus sauvegardes.
//
// Ces dates sont calculees DYNAMIQUEMENT (pas hardcoded en BDD), parce
// que certaines varient (1er jeudi de mai). Le cron /api/cron/cyber-
// event-tick passe chaque jour : pour chaque tenant, pour chaque event
// dont la date du jour est dans la fenetre [startDate, endDate], il
// cree un CyberEventInstance idempotent (@@unique(tenantId, eventSlug)).

export type CyberEventType =
  | "world_password_day"
  | "cybermois"
  | "data_protection_day"
  | "anti_phishing_day"
  | "world_backup_day";

export type CyberEventDef = {
  type: CyberEventType;
  /** Slug stable pour identifier l'event a travers les annees */
  slugBase: string;
  title: string;
  emoji: string;
  description: string;
  /** Saison cyber liee (slug du catalog) - bandeau renvoie vers elle */
  highlightSaisonSlug: string;
  /** Fenetre de l'event : nb de jours autour du peak */
  durationDays: number;
  /** Si true, le cron auto-cree un TeamChallenge pendant l'event */
  autoChallenge: boolean;
  /** Coins distribues en bonus aux participants (si autoChallenge) */
  rewardCoins: number;
  /**
   * Fonction qui, pour une annee donnee, retourne la date de debut
   * de l'event (UTC midnight). Implementations differentes selon le
   * type :
   *   - dates fixes (28 janvier, 31 mars)
   *   - dates relatives (1er jeudi de mai pour WPD)
   *   - mois entier (octobre pour Cybermois)
   */
  computeStartDate: (year: number) => Date;
};

/**
 * Helper : 1er jeudi du mois donné (utilise pour World Password Day).
 */
function firstThursdayOf(year: number, month0: number): Date {
  // month0 = 0-11 (Date.UTC convention)
  const firstDay = new Date(Date.UTC(year, month0, 1));
  // Day of week : 0=dim, 1=lun, ..., 4=jeudi
  const dow = firstDay.getUTCDay();
  // Nb de jours a ajouter pour atteindre le premier jeudi
  const daysToThu = (4 - dow + 7) % 7;
  return new Date(Date.UTC(year, month0, 1 + daysToThu));
}

export const CYBER_EVENTS: CyberEventDef[] = [
  {
    type: "data_protection_day",
    slugBase: "data_protection_day",
    title: "Journée de la Protection des Données",
    emoji: "🛡️",
    description:
      "Le 28 janvier, on revisite ensemble les fondamentaux du RGPD au quotidien.",
    highlightSaisonSlug: "donnees-sensibles",
    durationDays: 3,
    autoChallenge: false,
    rewardCoins: 0,
    computeStartDate: (year) => new Date(Date.UTC(year, 0, 28)),
  },
  {
    type: "world_backup_day",
    slugBase: "world_backup_day",
    title: "World Backup Day",
    emoji: "💾",
    description:
      "Le 31 mars, on vérifie que nos sauvegardes existent vraiment et marchent.",
    highlightSaisonSlug: "sauvegardes",
    durationDays: 3,
    autoChallenge: false,
    rewardCoins: 0,
    computeStartDate: (year) => new Date(Date.UTC(year, 2, 31)),
  },
  {
    type: "world_password_day",
    slugBase: "world_password_day",
    title: "World Password Day",
    emoji: "🔐",
    description:
      "Le 1er jeudi de mai, on chouchoute nos mots de passe et la double authentification.",
    highlightSaisonSlug: "mots-de-passe",
    durationDays: 3,
    autoChallenge: false,
    rewardCoins: 0,
    computeStartDate: (year) => firstThursdayOf(year, 4), // mai = month 4
  },
  {
    type: "anti_phishing_day",
    slugBase: "anti_phishing_day",
    title: "Anti-Phishing Day",
    emoji: "🎣",
    description:
      "Le 17 juin, focus mondial sur la détection des mails piégés.",
    highlightSaisonSlug: "phishing",
    durationDays: 3,
    autoChallenge: false,
    rewardCoins: 0,
    computeStartDate: (year) => new Date(Date.UTC(year, 5, 17)),
  },
  {
    type: "cybermois",
    slugBase: "cybermois",
    title: "Cybermois (Mois Européen de la Cybersécurité)",
    emoji: "🎃",
    description:
      "Tout octobre est dédié à la cyber. Un grand challenge entre équipes, des items exclusifs et un focus sur les bons réflexes.",
    highlightSaisonSlug: "phishing",
    durationDays: 31,
    autoChallenge: true,
    rewardCoins: 200, // bonus pour le tenant si challenge cree
    computeStartDate: (year) => new Date(Date.UTC(year, 9, 1)), // 1er octobre
  },
];

/**
 * Renvoie l'instance active a une date donnee (defaut now), ou null.
 * Utilise cote dashboard pour afficher le bandeau "evenement en cours".
 */
export function getActiveEventDef(at: Date = new Date()): {
  def: CyberEventDef;
  startDate: Date;
  endDate: Date;
} | null {
  const year = at.getUTCFullYear();
  for (const def of CYBER_EVENTS) {
    const startDate = def.computeStartDate(year);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + def.durationDays);
    if (at >= startDate && at < endDate) {
      return { def, startDate, endDate };
    }
  }
  // Si on est en debut d'annee (avant le 28 janvier), aussi tester
  // l'annee precedente pour les events qui chevauchent (ex. World
  // Backup Day fin mars, ne chevauche pas mais pour la robustesse).
  return null;
}

/**
 * Construit le slug normalise d'un event pour une annee donnee.
 * Ex : "world_password_day_2026", "cybermois_2026"
 */
export function eventSlugForYear(def: CyberEventDef, year: number): string {
  return `${def.slugBase}_${year}`;
}

/**
 * Retourne tous les events qui sont actuellement actifs (start <= now < end).
 */
export function getActiveEventsAll(at: Date = new Date()): {
  def: CyberEventDef;
  startDate: Date;
  endDate: Date;
}[] {
  const year = at.getUTCFullYear();
  const out: { def: CyberEventDef; startDate: Date; endDate: Date }[] = [];
  for (const def of CYBER_EVENTS) {
    const startDate = def.computeStartDate(year);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + def.durationDays);
    if (at >= startDate && at < endDate) {
      out.push({ def, startDate, endDate });
    }
  }
  return out;
}
