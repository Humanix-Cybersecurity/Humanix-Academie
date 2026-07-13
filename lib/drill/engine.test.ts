// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { DRILL_SCENARIOS, getScenario, maxScore } from "./scenarios";
import {
  advanceDrill,
  hostActionLabel,
  tallyVotes,
  scoreForAnswers,
  leaderboard,
  averageScore,
  INITIAL_STATE,
  type DrillState,
} from "./engine";

const rz = getScenario("rancongiciel")!;

describe("integrite de tous les scenarios", () => {
  it("chaque scenario : >= 6 manches, un unique meilleur reflexe, ids uniques", () => {
    expect(DRILL_SCENARIOS.length).toBeGreaterThanOrEqual(3);
    for (const sc of DRILL_SCENARIOS) {
      expect(sc.id.length).toBeGreaterThan(0);
      expect(sc.rounds.length).toBeGreaterThanOrEqual(6);
      for (const r of sc.rounds) {
        expect(r.choices.length).toBeGreaterThanOrEqual(3);
        expect(r.choices.filter((c) => c.isBest)).toHaveLength(1);
        const best = r.choices.find((c) => c.isBest)!;
        expect(best.points).toBe(Math.max(...r.choices.map((c) => c.points)));
        expect(new Set(r.choices.map((c) => c.id)).size).toBe(r.choices.length);
      }
    }
  });

  it("ids de scenarios uniques", () => {
    const ids = DRILL_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("scenario rancongiciel", () => {
  it("a 6 manches, chacune avec un unique meilleur reflexe", () => {
    expect(rz.rounds).toHaveLength(6);
    for (const r of rz.rounds) {
      expect(r.choices.length).toBeGreaterThanOrEqual(3);
      expect(r.choices.filter((c) => c.isBest)).toHaveLength(1);
      // le meilleur choix a le plus de points
      const best = r.choices.find((c) => c.isBest)!;
      expect(best.points).toBe(Math.max(...r.choices.map((c) => c.points)));
    }
  });

  it("ids de choix uniques dans chaque manche", () => {
    for (const r of rz.rounds) {
      expect(new Set(r.choices.map((c) => c.id)).size).toBe(r.choices.length);
    }
  });

  it("maxScore = 600 (6 x 100)", () => {
    expect(maxScore(rz)).toBe(600);
  });

  it("aucun tiret long dans le contenu", () => {
    const blob = JSON.stringify(DRILL_SCENARIOS);
    const hasLongDash = [...blob].some((ch) => {
      const c = ch.charCodeAt(0);
      return c === 0x2014 || c === 0x2013;
    });
    expect(hasLongDash).toBe(false);
  });
});

describe("advanceDrill (machine a etats)", () => {
  it("deroule salle -> manches -> revelations -> fin", () => {
    let s: DrillState = INITIAL_STATE;
    expect(s).toEqual({ status: "LOBBY", currentRound: 0, phase: "VOTING" });

    s = advanceDrill(s, 6); // lancer
    expect(s).toEqual({ status: "RUNNING", currentRound: 1, phase: "VOTING" });

    s = advanceDrill(s, 6); // reveler manche 1
    expect(s).toEqual({ status: "RUNNING", currentRound: 1, phase: "REVEAL" });

    s = advanceDrill(s, 6); // manche 2
    expect(s).toEqual({ status: "RUNNING", currentRound: 2, phase: "VOTING" });

    // avance jusqu'a la fin
    for (let i = 0; i < 20 && s.status !== "ENDED"; i++) s = advanceDrill(s, 6);
    expect(s.status).toBe("ENDED");
    expect(s.currentRound).toBe(6);
  });

  it("ENDED est un point fixe", () => {
    const ended: DrillState = {
      status: "ENDED",
      currentRound: 6,
      phase: "REVEAL",
    };
    expect(advanceDrill(ended, 6)).toEqual(ended);
  });

  it("hostActionLabel suit l'etat", () => {
    expect(hostActionLabel(INITIAL_STATE, 6)).toBe("Lancer l'exercice");
    expect(
      hostActionLabel(
        { status: "RUNNING", currentRound: 1, phase: "VOTING" },
        6,
      ),
    ).toBe("Révéler les votes");
    expect(
      hostActionLabel(
        { status: "RUNNING", currentRound: 1, phase: "REVEAL" },
        6,
      ),
    ).toBe("Manche suivante");
    expect(
      hostActionLabel(
        { status: "RUNNING", currentRound: 6, phase: "REVEAL" },
        6,
      ),
    ).toBe("Terminer");
    expect(
      hostActionLabel({ status: "ENDED", currentRound: 6, phase: "REVEAL" }, 6),
    ).toBeNull();
  });
});

describe("tallyVotes", () => {
  it("compte et calcule les pourcentages", () => {
    const round = rz.rounds[0];
    const ids = round.choices.map((c) => c.id);
    // 2 votes 'isoler', 1 'alerter', 1 'payer'
    const votes = [ids[0], ids[0], ids[1], ids[3]];
    const tally = tallyVotes(round, votes);
    const isoler = tally.find((t) => t.choiceId === ids[0])!;
    expect(isoler.count).toBe(2);
    expect(isoler.pct).toBe(50);
    expect(tally.reduce((s, t) => s + t.count, 0)).toBe(4);
  });

  it("salle vide : 0 partout, pas de division par zero", () => {
    const tally = tallyVotes(rz.rounds[0], []);
    expect(tally.every((t) => t.count === 0 && t.pct === 0)).toBe(true);
  });
});

describe("scores et classement", () => {
  it("scoreForAnswers additionne les points des choix retenus", () => {
    // meilleur choix a chaque manche = 600
    const perfect: Record<number, string> = {};
    for (const r of rz.rounds)
      perfect[r.num] = r.choices.find((c) => c.isBest)!.id;
    expect(scoreForAnswers(rz, perfect)).toBe(600);

    // reponses partielles / inconnues ignorees
    expect(scoreForAnswers(rz, { 1: "payer" })).toBe(0);
    expect(scoreForAnswers(rz, { 1: "isoler", 99: "inexistant" })).toBe(100);
  });

  it("leaderboard trie par score puis nom", () => {
    const rows = [
      { name: "Bob", score: 300 },
      { name: "Alice", score: 500 },
      { name: "Zoe", score: 500 },
    ];
    const lb = leaderboard(rows);
    expect(lb.map((r) => r.name)).toEqual(["Alice", "Zoe", "Bob"]);
  });

  it("averageScore = moyenne arrondie, 0 si vide", () => {
    expect(
      averageScore([
        { name: "a", score: 100 },
        { name: "b", score: 200 },
      ]),
    ).toBe(150);
    expect(averageScore([])).toBe(0);
  });
});
