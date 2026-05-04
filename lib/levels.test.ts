// Tests du système de niveaux + computeCoinsEarned.
// Pas critique pour la facturation mais critique pour la gamification = engagement.

import { describe, it, expect } from "vitest";
import {
  LEVELS,
  getLevel,
  getNextLevel,
  getXPProgress,
  computeCoinsEarned,
} from "./levels";

describe("LEVELS catalog", () => {
  it("contient 5 niveaux contigus en XP", () => {
    expect(LEVELS).toHaveLength(5);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].minXP).toBe(LEVELS[i - 1].maxXP);
    }
  });

  it("le niveau 1 démarre à 0 XP", () => {
    expect(LEVELS[0].minXP).toBe(0);
  });

  it("le dernier niveau a maxXP = Infinity", () => {
    expect(LEVELS[LEVELS.length - 1].maxXP).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("getLevel", () => {
  it("retourne niveau 1 pour 0 XP", () => {
    expect(getLevel(0).id).toBe(1);
  });

  it("retourne niveau 1 jusqu'à 99 XP", () => {
    expect(getLevel(99).id).toBe(1);
  });

  it("retourne niveau 2 à 100 XP exactement", () => {
    expect(getLevel(100).id).toBe(2);
  });

  it("retourne niveau 3 à 300 XP", () => {
    expect(getLevel(300).id).toBe(3);
  });

  it("retourne niveau 5 (Maître) à 1500+ XP", () => {
    expect(getLevel(1500).id).toBe(5);
    expect(getLevel(99999).id).toBe(5);
  });

  it("gère XP négatif (fallback niveau 1)", () => {
    expect(getLevel(-10).id).toBe(1);
  });
});

describe("getNextLevel", () => {
  it("retourne niveau 2 quand on est niveau 1", () => {
    expect(getNextLevel(50)?.id).toBe(2);
  });

  it("retourne niveau 5 quand on est niveau 4", () => {
    expect(getNextLevel(800)?.id).toBe(5);
  });

  it("retourne null au niveau max", () => {
    expect(getNextLevel(2000)).toBe(null);
  });
});

describe("getXPProgress", () => {
  it("calcule le %, xpInLevel et xpNeededForNext (niveau 1, 50 XP)", () => {
    const p = getXPProgress(50);
    expect(p.current.id).toBe(1);
    expect(p.next?.id).toBe(2);
    expect(p.pct).toBe(50); // 50/100 = 50%
    expect(p.xpInLevel).toBe(50);
    expect(p.xpNeededForNext).toBe(50); // 100 - 50 = 50
  });

  it("retourne pct=100 et next=null au niveau max", () => {
    const p = getXPProgress(2000);
    expect(p.next).toBe(null);
    expect(p.pct).toBe(100);
    expect(p.xpNeededForNext).toBe(0);
  });

  it("clamp pct à 100 si XP dépasse exceptionnellement", () => {
    // Edge case : on est juste au seuil, donc pct doit être ≤ 100
    const p = getXPProgress(99);
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
