// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests des badges du Mode Enquêteur (#732).
//
// Deux risques propres à ces badges :
//   1. Le FARMING : rejouer la même enquête ne doit jamais faire avancer
//      un compteur, sinon le rang Détective ne prouve rien.
//   2. La MONOTONIE des rangs : un Cyber Sherlock doit posséder les
//      badges des rangs inférieurs, sinon un apprenant qui progresse voit
//      un badge se « dé-débloquer ».

import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS_BY_SLUG, type UserStats } from "./catalog";
import {
  computeDetectiveRank,
  type DetectiveRank,
} from "@/lib/investigations/types";

/** UserStats neutre : tout à zéro, on ne fait varier que l'enquête. */
function stats(over: Partial<UserStats> = {}): UserStats {
  return {
    totalXP: 0,
    level: 1,
    coins: 0,
    shareCount: 0,
    completedEpisodes: 0,
    totalEpisodes: 100,
    perfectQuizCount: 0,
    remediationFlashCount: 0,
    maxStreak: 0,
    phishingReportedCount: 0,
    hasCompletedAtLeastOneSaison: false,
    completedSaisonsCount: 0,
    ownedItemsCount: 0,
    avgQuizScorePct: 0,
    completedSaisonSlugs: [],
    investigationsPassed: 0,
    detectiveRank: "aspirant",
    ...over,
  };
}

const DETECTIVE_BADGES = [
  "first_investigation",
  "detective_junior",
  "detective_confirme",
  "cyber_sherlock",
  "maitre_detective",
] as const;

describe("badges enquêteur — existence", () => {
  it("les 5 badges sont au catalogue", () => {
    for (const slug of DETECTIVE_BADGES) {
      expect(ACHIEVEMENTS_BY_SLUG[slug], slug).toBeDefined();
    }
  });

  it("fournit le badge cyber_sherlock attendu par la boutique", () => {
    // #748 voulait un item réservé à « cyber-sherlock » mais le badge
    // n'existait pas encore. Il existe maintenant.
    expect(ACHIEVEMENTS_BY_SLUG["cyber_sherlock"].rarity).toBe("legendary");
  });
});

describe("first_investigation", () => {
  const badge = () => ACHIEVEMENTS_BY_SLUG["first_investigation"];

  it("reste verrouillé sans aucune enquête réussie", () => {
    expect(badge().isUnlocked(stats({ investigationsPassed: 0 }))).toBe(false);
  });

  it("se débloque à la première enquête réussie", () => {
    expect(badge().isUnlocked(stats({ investigationsPassed: 1 }))).toBe(true);
  });
});

describe("badges de rang — monotonie", () => {
  const rangs: DetectiveRank[] = [
    "aspirant",
    "detective-junior",
    "detective-confirme",
    "cyber-sherlock",
    "maitre-detective",
  ];

  /** Nb de badges de rang débloqués pour un rang donné. */
  const unlockedCount = (rank: DetectiveRank) =>
    DETECTIVE_BADGES.filter((slug) =>
      ACHIEVEMENTS_BY_SLUG[slug].isUnlocked(stats({ detectiveRank: rank })),
    ).length;

  it("ne débloque aucun badge de rang pour un aspirant", () => {
    // (first_investigation dépend du compteur, pas du rang.)
    expect(unlockedCount("aspirant")).toBe(0);
  });

  it("ne perd jamais un badge en montant en rang", () => {
    // Le piège : écrire `rank === "detective-junior"` sur chaque badge.
    // Un apprenant qui passe Confirmé perdrait alors son badge Junior.
    let precedent = -1;
    for (const rank of rangs) {
      const n = unlockedCount(rank);
      expect(n, `rang ${rank}`).toBeGreaterThanOrEqual(precedent);
      precedent = n;
    }
  });

  it("donne les 4 badges de rang au Maître Détective", () => {
    expect(unlockedCount("maitre-detective")).toBe(4);
  });

  it("donne exactement Junior au rang Junior", () => {
    expect(
      ACHIEVEMENTS_BY_SLUG["detective_junior"].isUnlocked(
        stats({ detectiveRank: "detective-junior" }),
      ),
    ).toBe(true);
    expect(
      ACHIEVEMENTS_BY_SLUG["detective_confirme"].isUnlocked(
        stats({ detectiveRank: "detective-junior" }),
      ),
    ).toBe(false);
  });
});

describe("anti-farming du rang", () => {
  it("ne monte pas en rang en rejouant la même enquête", () => {
    // computeDetectiveRank reçoit des enquêtes DÉJÀ dédupliquées par
    // scenarioSlug (cf. buildUserStats). On vérifie ici la conséquence :
    // 1 enquête, même parfaite, ne suffit jamais pour Junior (3 requises).
    const uneSeule = [{ score: 10, maxScore: 10, passed: true }];
    expect(computeDetectiveRank(uneSeule)).toBe("aspirant");
  });

  it("exige 3 enquêtes distinctes pour Junior", () => {
    const trois = Array.from({ length: 3 }, () => ({
      score: 8,
      maxScore: 10,
      passed: true,
    }));
    expect(computeDetectiveRank(trois)).toBe("detective-junior");
  });

  it("ignore les enquêtes échouées dans le décompte", () => {
    const mixte = [
      { score: 10, maxScore: 10, passed: true },
      { score: 2, maxScore: 10, passed: false },
      { score: 1, maxScore: 10, passed: false },
    ];
    expect(computeDetectiveRank(mixte)).toBe("aspirant");
  });
});
