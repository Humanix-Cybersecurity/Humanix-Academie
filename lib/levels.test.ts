// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du système de niveaux + computeCoinsEarned + bonus XP.
// Pas critique pour la facturation mais critique pour la gamification = engagement.
//
// Refonte mai 2026 : 5 niveaux -> 10 niveaux, calibres sur catalog commercial
// (11 420 XP base). Cf. lib/levels.ts pour la rationale.

import { describe, it, expect } from "vitest";
import {
  LEVELS,
  getLevel,
  getNextLevel,
  getXPProgress,
  computeCoinsEarned,
  computeStreakXPBonus,
  computeTotalXP,
  computeLevelUpCoins,
  shouldAwardStreakBonus,
  STREAK_BONUS_START_DAY,
  PERFECT_QUIZ_XP_BONUS,
  STREAK_XP_BONUS_PER_DAY,
  BADGE_UNLOCK_XP_BONUS,
} from "./levels";

describe("LEVELS catalog", () => {
  it("contient 10 niveaux contigus en XP", () => {
    expect(LEVELS).toHaveLength(10);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].minXP).toBe(LEVELS[i - 1].maxXP);
    }
  });

  it("le niveau 1 démarre à 0 XP", () => {
    expect(LEVELS[0].minXP).toBe(0);
  });

  it("le dernier niveau (Maître) a maxXP = Infinity", () => {
    expect(LEVELS[LEVELS.length - 1].maxXP).toBe(Number.POSITIVE_INFINITY);
    expect(LEVELS[LEVELS.length - 1].name).toBe("Maître");
  });

  it("seuil L10 Maître = 10 000 XP (endgame strict ~88% catalog)", () => {
    const master = LEVELS.find((l) => l.id === 10);
    expect(master?.minXP).toBe(10000);
  });

  it("courbe exponentielle croissante (chaque palier > precedent)", () => {
    // Le delta XP entre L(n+1) et L(n) doit etre croissant : pas de palier
    // facile en fin de jeu.
    const deltas = LEVELS.slice(0, -1).map(
      (l, i) => LEVELS[i + 1].minXP - l.minXP,
    );
    for (let i = 1; i < deltas.length; i++) {
      expect(deltas[i]).toBeGreaterThanOrEqual(deltas[i - 1]);
    }
  });
});

describe("getLevel", () => {
  it("retourne niveau 1 (Novice) pour 0 XP", () => {
    expect(getLevel(0).id).toBe(1);
    expect(getLevel(0).name).toBe("Novice");
  });

  it("retourne niveau 1 jusqu'à 149 XP", () => {
    expect(getLevel(149).id).toBe(1);
  });

  it("retourne niveau 2 (Apprenti) à 150 XP exactement", () => {
    expect(getLevel(150).id).toBe(2);
    expect(getLevel(150).name).toBe("Apprenti");
  });

  it("retourne niveau 5 (Gardien) à 1400 XP", () => {
    expect(getLevel(1400).id).toBe(5);
    expect(getLevel(1400).name).toBe("Gardien");
  });

  it("retourne niveau 10 (Maître) à 10000+ XP", () => {
    expect(getLevel(10000).id).toBe(10);
    expect(getLevel(99999).id).toBe(10);
    expect(getLevel(10000).name).toBe("Maître");
  });

  it("gère XP négatif (fallback niveau 1)", () => {
    expect(getLevel(-10).id).toBe(1);
  });
});

describe("getNextLevel", () => {
  it("retourne niveau 2 quand on est niveau 1", () => {
    expect(getNextLevel(50)?.id).toBe(2);
  });

  it("retourne niveau 10 (Maître) quand on est niveau 9", () => {
    // 9000 XP = niveau 9 (Champion), prochain = 10 (Maître)
    expect(getNextLevel(9000)?.id).toBe(10);
    expect(getNextLevel(9000)?.name).toBe("Maître");
  });

  it("retourne null au niveau max (Maître)", () => {
    expect(getNextLevel(10000)).toBe(null);
    expect(getNextLevel(50000)).toBe(null);
  });
});

describe("getXPProgress", () => {
  it("calcule le %, xpInLevel et xpNeededForNext (niveau 1, 75 XP)", () => {
    const p = getXPProgress(75);
    expect(p.current.id).toBe(1);
    expect(p.next?.id).toBe(2);
    expect(p.pct).toBe(50); // 75/150 = 50%
    expect(p.xpInLevel).toBe(75);
    expect(p.xpNeededForNext).toBe(75); // 150 - 75 = 75
  });

  it("retourne pct=100 et next=null au niveau max", () => {
    const p = getXPProgress(15000);
    expect(p.next).toBe(null);
    expect(p.pct).toBe(100);
    expect(p.xpNeededForNext).toBe(0);
  });

  it("clamp pct à 100 si XP juste sous le seuil suivant", () => {
    // Edge case : on est juste au seuil, donc pct doit être ≤ 100
    const p = getXPProgress(149);
    expect(p.pct).toBeLessThanOrEqual(100);
  });
});

describe("computeCoinsEarned", () => {
  it("base 10 coins minimum (score 0, quiz raté)", () => {
    expect(computeCoinsEarned(0, false)).toBe(10);
  });

  it("+1 coin par 10 points de score", () => {
    expect(computeCoinsEarned(50, false)).toBe(15); // 10 + 5
    expect(computeCoinsEarned(100, false)).toBe(20); // 10 + 10
  });

  it("+15 coins bonus si quiz parfait", () => {
    expect(computeCoinsEarned(0, true)).toBe(25); // 10 + 0 + 15
    expect(computeCoinsEarned(100, true)).toBe(35); // 10 + 10 + 15
  });

  it("ne donne PAS de coins négatifs même avec score < 0", () => {
    expect(computeCoinsEarned(-50, false)).toBeGreaterThanOrEqual(10);
  });

  it("formule cohérente : score 75 + perfect = 10 + 7 + 15 = 32", () => {
    expect(computeCoinsEarned(75, true)).toBe(32);
  });
});

describe("computeStreakXPBonus", () => {
  it("pas de bonus avant le jour 3 (j1, j2 = 0)", () => {
    expect(computeStreakXPBonus(0)).toBe(0);
    expect(computeStreakXPBonus(1)).toBe(0);
    expect(computeStreakXPBonus(2)).toBe(0);
  });

  it("+5 XP au jour 3 (premier jour avec bonus)", () => {
    expect(computeStreakXPBonus(3)).toBe(STREAK_XP_BONUS_PER_DAY);
  });

  it("+5 XP / jour additionnel apres le jour 3", () => {
    expect(computeStreakXPBonus(7)).toBe(5 * STREAK_XP_BONUS_PER_DAY); // jours 3-7 = 5 jours
    expect(computeStreakXPBonus(30)).toBe(28 * STREAK_XP_BONUS_PER_DAY); // jours 3-30 = 28 jours
  });

  it("streak 365 jours = bonus consequent mais legitime", () => {
    // jours 3 a 365 = 363 jours * 5 XP = 1815 XP. Recompense un an d'assiduite.
    expect(computeStreakXPBonus(365)).toBe(363 * STREAK_XP_BONUS_PER_DAY);
  });

  it("streak negative ou nulle = 0", () => {
    expect(computeStreakXPBonus(-1)).toBe(0);
  });
});

describe("Constants bonus XP", () => {
  it("PERFECT_QUIZ_XP_BONUS = 10", () => {
    expect(PERFECT_QUIZ_XP_BONUS).toBe(10);
  });

  it("STREAK_XP_BONUS_PER_DAY = 5", () => {
    expect(STREAK_XP_BONUS_PER_DAY).toBe(5);
  });

  it("BADGE_UNLOCK_XP_BONUS = 50", () => {
    expect(BADGE_UNLOCK_XP_BONUS).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Câblage des bonus hors épisode (#743)
// ---------------------------------------------------------------------------

describe("computeTotalXP", () => {
  it("additionne l'XP des épisodes et le bonus", () => {
    expect(computeTotalXP([{ score: 100 }, { score: 50 }], 25)).toBe(175);
  });

  it("tolère un bonus absent (user créé avant le champ)", () => {
    expect(computeTotalXP([{ score: 40 }], null)).toBe(40);
    expect(computeTotalXP([{ score: 40 }], undefined)).toBe(40);
  });

  it("tolère des scores nuls", () => {
    expect(computeTotalXP([{ score: null }, { score: 10 }], 0)).toBe(10);
  });

  it("retourne le seul bonus quand aucun épisode n'est fait", () => {
    // Cas réel : un badge débloqué par une action hors épisode.
    expect(computeTotalXP([], 50)).toBe(50);
  });
});

describe("computeLevelUpCoins", () => {
  it("n'accorde rien au niveau 1 (création du compte)", () => {
    expect(computeLevelUpCoins(1)).toBe(0);
    expect(computeLevelUpCoins(0)).toBe(0);
  });

  it("respecte les 3 paliers annoncés en boutique (10/25/50)", () => {
    // La boutique affiche « Coins exclusifs au passage de niveau
    // (10/25/50) » : ces valeurs sont une promesse faite à l'apprenant.
    expect([2, 3, 4].map(computeLevelUpCoins)).toEqual([10, 10, 10]);
    expect([5, 6, 7].map(computeLevelUpCoins)).toEqual([25, 25, 25]);
    expect([8, 9, 10].map(computeLevelUpCoins)).toEqual([50, 50, 50]);
  });

  it("couvre tous les niveaux du catalogue", () => {
    for (const l of LEVELS.filter((l) => l.id > 1)) {
      expect(computeLevelUpCoins(l.id), `niveau ${l.id}`).toBeGreaterThan(0);
    }
  });
});

describe("shouldAwardStreakBonus", () => {
  const now = new Date("2026-08-09T10:00:00");

  it("n'accorde rien avant le 3e jour consécutif", () => {
    expect(shouldAwardStreakBonus(0, null, now)).toBe(false);
    expect(shouldAwardStreakBonus(2, null, now)).toBe(false);
  });

  it("accorde à partir du 3e jour si jamais accordé", () => {
    expect(shouldAwardStreakBonus(3, null, now)).toBe(true);
  });

  it("n'accorde qu'UNE fois par jour, quel que soit le nombre d'épisodes", () => {
    // Le piège de ce bonus : sans cette garde, terminer 5 épisodes dans la
    // journée rapporterait 5× le bonus — inflation silencieuse de l'XP.
    const dejaCeMatin = new Date("2026-08-09T02:00:00");
    expect(shouldAwardStreakBonus(10, dejaCeMatin, now)).toBe(false);
  });

  it("réaccorde le lendemain", () => {
    const hierSoir = new Date("2026-08-08T23:30:00");
    expect(shouldAwardStreakBonus(10, hierSoir, now)).toBe(true);
  });

  it("compare des jours civils, pas des fenêtres de 24 h", () => {
    // 23h30 hier -> 10h ce matin = moins de 24 h, mais jour différent :
    // le bonus doit tomber, sinon un apprenant régulier du soir serait
    // pénalisé un jour sur deux.
    const hier = new Date("2026-08-08T23:59:00");
    expect(
      shouldAwardStreakBonus(5, hier, new Date("2026-08-09T00:30:00")),
    ).toBe(true);
  });

  it("ne se laisse pas berner par un même quantième d'un autre mois", () => {
    const memeJourMoisPrecedent = new Date("2026-07-09T10:00:00");
    expect(shouldAwardStreakBonus(5, memeJourMoisPrecedent, now)).toBe(true);
  });

  it("cumulé sur la durée, retombe sur computeStreakXPBonus", () => {
    // Attribution quotidienne (5 XP × jours éligibles) et formule
    // cumulative doivent donner le même total — sinon les deux notions
    // de « bonus de streak » divergeraient.
    const streak = 7;
    const joursEligibles = streak - STREAK_BONUS_START_DAY + 1;
    expect(joursEligibles * STREAK_XP_BONUS_PER_DAY).toBe(
      computeStreakXPBonus(streak),
    );
  });
});
