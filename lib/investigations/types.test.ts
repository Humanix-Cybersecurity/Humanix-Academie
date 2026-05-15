// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  computeScore,
  computeDetectiveRank,
  InvestigationFrontmatterSchema,
} from "./types";

const sampleScenario = {
  redFlags: [
    { id: "rf1", label: "Red flag 1", points: 10, explanation: "ok 12345" },
    { id: "rf2", label: "Red flag 2", points: 20, explanation: "ok 12345" },
    { id: "rf3", label: "Red flag 3", points: 30, explanation: "ok 12345" },
  ],
  distractors: [
    { id: "d1", label: "Distractor 1", penalty: 5, explanation: "ok 12345" },
    { id: "d2", label: "Distractor 2", penalty: 10, explanation: "ok 12345" },
  ],
};

describe("computeScore", () => {
  it("score 0 si rien n'est coché", () => {
    const r = computeScore(sampleScenario, { foundIds: [], distractorIds: [] });
    expect(r.score).toBe(0);
    expect(r.maxScore).toBe(60);
    expect(r.passed).toBe(false);
    expect(r.passRatio).toBe(0);
  });

  it("score max si tous les red flags trouvés, aucun distractor", () => {
    const r = computeScore(sampleScenario, {
      foundIds: ["rf1", "rf2", "rf3"],
      distractorIds: [],
    });
    expect(r.score).toBe(60);
    expect(r.maxScore).toBe(60);
    expect(r.passed).toBe(true);
    expect(r.passRatio).toBe(1);
  });

  it("score partiel si certains red flags trouvés", () => {
    const r = computeScore(sampleScenario, {
      foundIds: ["rf1", "rf3"],
      distractorIds: [],
    });
    expect(r.score).toBe(40);
    expect(r.passRatio).toBeCloseTo(40 / 60, 5);
    expect(r.passed).toBe(true); // 66% >= 60%
  });

  it("pénalité appliquée pour chaque distractor coché", () => {
    const r = computeScore(sampleScenario, {
      foundIds: ["rf1", "rf2", "rf3"],
      distractorIds: ["d1", "d2"],
    });
    expect(r.score).toBe(60 - 5 - 10); // 45
    expect(r.passRatio).toBeCloseTo(45 / 60, 5);
    expect(r.passed).toBe(true); // 75%
  });

  it("score ne descend pas en-dessous de 0 (clamp)", () => {
    const r = computeScore(sampleScenario, {
      foundIds: [],
      distractorIds: ["d1", "d2"],
    });
    expect(r.score).toBe(0); // pas -15
  });

  it("passed=false si ratio < 60%", () => {
    const r = computeScore(sampleScenario, {
      foundIds: ["rf1"],
      distractorIds: [],
    });
    expect(r.score).toBe(10);
    expect(r.passRatio).toBeCloseTo(10 / 60, 5);
    expect(r.passed).toBe(false);
  });

  it("ignore les IDs invalides (defensive)", () => {
    const r = computeScore(sampleScenario, {
      foundIds: ["rf1", "rf-fantome"],
      distractorIds: ["d-fantome"],
    });
    expect(r.score).toBe(10); // seul rf1 compte
  });

  it("maxScore=0 si aucun red flag (cas degenere)", () => {
    const r = computeScore(
      { redFlags: [], distractors: [] },
      { foundIds: [], distractorIds: [] },
    );
    expect(r.maxScore).toBe(0);
    expect(r.passRatio).toBe(0);
    expect(r.passed).toBe(false);
  });
});

describe("computeDetectiveRank", () => {
  const r = (score: number, max: number, passed = true) => ({
    score,
    maxScore: max,
    passed,
  });

  it("aspirant si aucune enquête validée", () => {
    expect(computeDetectiveRank([])).toBe("aspirant");
    expect(computeDetectiveRank([r(50, 100, false)])).toBe("aspirant");
  });

  it("aspirant si moins de 3 enquêtes validées", () => {
    expect(computeDetectiveRank([r(60, 100), r(70, 100)])).toBe("aspirant");
  });

  it("détective junior à partir de 3 enquêtes ≥60%", () => {
    const rank = computeDetectiveRank([
      r(60, 100),
      r(70, 100),
      r(65, 100),
    ]);
    expect(rank).toBe("detective-junior");
  });

  it("détective confirmé à partir de 10 enquêtes ≥75%", () => {
    const results = Array.from({ length: 10 }, () => r(75, 100));
    expect(computeDetectiveRank(results)).toBe("detective-confirme");
  });

  it("cyber sherlock à partir de 25 enquêtes ≥90%", () => {
    const results = Array.from({ length: 25 }, () => r(90, 100));
    expect(computeDetectiveRank(results)).toBe("cyber-sherlock");
  });

  it("maitre détective : 50 enquêtes parfaites", () => {
    const results = Array.from({ length: 50 }, () => r(100, 100));
    expect(computeDetectiveRank(results)).toBe("maitre-detective");
  });

  it("garde le rank le plus haut atteint, pas le plus récent", () => {
    // 25 a 90% + 25 a 60% : doit donner cyber-sherlock (les 25 a 90%)
    const high = Array.from({ length: 25 }, () => r(90, 100));
    const low = Array.from({ length: 25 }, () => r(60, 100));
    expect(computeDetectiveRank([...high, ...low])).toBe("cyber-sherlock");
  });

  it("ignore les enquêtes non-passées (passed=false)", () => {
    const failed = Array.from({ length: 10 }, () => r(40, 100, false));
    expect(computeDetectiveRank(failed)).toBe("aspirant");
  });
});

describe("InvestigationFrontmatterSchema", () => {
  const baseValid = {
    title: "Titre valide",
    kind: "investigation",
    investigationType: "EMAIL",
    difficulty: 2,
    durationSeconds: 60,
    xpReward: 50,
    isFree: true,
    media: {
      type: "email-mockup",
      data: {
        from: "Test",
        fromEmail: "test@example.com",
        subject: "Sujet",
        body: "Corps",
      },
    },
    brief: "Brief avec assez de caractères pour passer la validation min 20.",
    redFlags: [
      {
        id: "rf1",
        label: "Label assez long",
        points: 10,
        explanation: "Explication avec plus de 20 caractères pour valider.",
      },
    ],
    distractors: [],
    debrief: "Debrief avec assez de caractères pour passer la validation min.",
  };

  it("accepte un frontmatter valide", () => {
    const r = InvestigationFrontmatterSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
  });

  it("rejette un kind qui n'est pas 'investigation'", () => {
    const r = InvestigationFrontmatterSchema.safeParse({
      ...baseValid,
      kind: "scenario",
    });
    expect(r.success).toBe(false);
  });

  it("rejette un investigationType inconnu", () => {
    const r = InvestigationFrontmatterSchema.safeParse({
      ...baseValid,
      investigationType: "EMAIL_BIS",
    });
    expect(r.success).toBe(false);
  });

  it("rejette une difficulty hors plage 1-5", () => {
    const r = InvestigationFrontmatterSchema.safeParse({
      ...baseValid,
      difficulty: 6,
    });
    expect(r.success).toBe(false);
  });

  it("rejette un id de red flag avec espaces/caractères spéciaux", () => {
    const r = InvestigationFrontmatterSchema.safeParse({
      ...baseValid,
      redFlags: [
        {
          id: "id avec espaces",
          label: "Label assez long",
          points: 10,
          explanation: "Explication avec plus de 20 caractères pour valider.",
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejette si redFlags est vide", () => {
    const r = InvestigationFrontmatterSchema.safeParse({
      ...baseValid,
      redFlags: [],
    });
    expect(r.success).toBe(false);
  });

  it("isFree default false si non specifie", () => {
    const { isFree: _isFree, ...rest } = baseValid;
    const r = InvestigationFrontmatterSchema.safeParse(rest);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isFree).toBe(false);
  });
});
