// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests pour lib/nis2/scoring.ts - diagnostic NIS2 public (Pack NIS2 v2 - A).
//
// On valide :
//   - Score 100/100 = robuste quand tout est "oui"
//   - Score 0/100 = alerte quand tout est "non"
//   - Verdicts par seuil (>=80 / >=60 / >=40 / <40)
//   - Top 3 priorites filtre les articles >= 80
//   - Score per-article isole correctement
//   - "ne_sait_pas" compte comme un non (zero point)
//   - Question manquante = traitee comme "ne_sait_pas"

import { describe, it, expect } from "vitest";
import {
  computeNis2Diagnostic,
  countYesAnswers,
  type Nis2Answer,
  type Nis2Answers,
} from "./scoring";
import { NIS2_QUESTIONS } from "./questions";

/** Reponse "oui" pour toutes les questions (~ score 100). */
function allYes(): Nis2Answers {
  const a: Nis2Answers = {};
  for (const q of NIS2_QUESTIONS) a[q.id] = "oui";
  return a;
}

/** Reponse "non" pour toutes les questions (~ score 0). */
function allNo(): Nis2Answers {
  const a: Nis2Answers = {};
  for (const q of NIS2_QUESTIONS) a[q.id] = "non";
  return a;
}

/** Reponse "ne_sait_pas" pour toutes (= equivalent allNo cote score). */
function allUnsure(): Nis2Answers {
  const a: Nis2Answers = {};
  for (const q of NIS2_QUESTIONS) a[q.id] = "ne_sait_pas";
  return a;
}

describe("lib/nis2/scoring - computeNis2Diagnostic", () => {
  describe("scores extremes", () => {
    it("tout 'oui' => score 100, verdict robuste", () => {
      const r = computeNis2Diagnostic(allYes());
      expect(r.globalScore).toBe(100);
      expect(r.verdict).toBe("robuste");
      // Tous les articles sont a 100
      for (const a of r.articleScores) {
        expect(a.score).toBe(100);
      }
      // Top priorites vide (rien a corriger)
      expect(r.topPriorities).toHaveLength(0);
    });

    it("tout 'non' => score 0, verdict alerte", () => {
      const r = computeNis2Diagnostic(allNo());
      expect(r.globalScore).toBe(0);
      expect(r.verdict).toBe("alerte");
      for (const a of r.articleScores) {
        expect(a.score).toBe(0);
      }
      // Top 3 priorites doit etre rempli (les pires articles)
      expect(r.topPriorities).toHaveLength(3);
    });

    it("tout 'ne_sait_pas' => identique a tout 'non'", () => {
      const r = computeNis2Diagnostic(allUnsure());
      expect(r.globalScore).toBe(0);
      expect(r.verdict).toBe("alerte");
    });

    it("reponses vides (questions absentes) => traite comme ne_sait_pas", () => {
      const r = computeNis2Diagnostic({});
      expect(r.globalScore).toBe(0);
      expect(r.verdict).toBe("alerte");
    });
  });

  describe("seuils de verdict", () => {
    it("score >= 80 -> robuste", () => {
      const a = allYes();
      // On garde la majorite a 'oui', on en fait basculer quelques unes pour rester >=80
      a["risk_policy_written"] = "non";
      const r = computeNis2Diagnostic(a);
      expect(r.globalScore).toBeGreaterThanOrEqual(80);
      expect(r.verdict).toBe("robuste");
    });

    it("score >= 60 et < 80 -> en_marche", () => {
      // Strategie : on fait ~30 % de non, ce qui donne ~70 % global
      const a = allYes();
      const toFlip = NIS2_QUESTIONS.slice(0, 9).map((q) => q.id);
      for (const id of toFlip) a[id] = "non";
      const r = computeNis2Diagnostic(a);
      expect(r.globalScore).toBeGreaterThanOrEqual(60);
      expect(r.globalScore).toBeLessThan(80);
      expect(r.verdict).toBe("en_marche");
    });

    it("score >= 40 et < 60 -> fragile", () => {
      // 50% des questions a non
      const a = allYes();
      const toFlip = NIS2_QUESTIONS.slice(0, 16).map((q) => q.id);
      for (const id of toFlip) a[id] = "non";
      const r = computeNis2Diagnostic(a);
      expect(r.globalScore).toBeGreaterThanOrEqual(40);
      expect(r.globalScore).toBeLessThan(60);
      expect(r.verdict).toBe("fragile");
    });

    it("score < 40 -> alerte", () => {
      // ~80% des questions a non
      const a = allYes();
      const toFlip = NIS2_QUESTIONS.slice(0, 25).map((q) => q.id);
      for (const id of toFlip) a[id] = "non";
      const r = computeNis2Diagnostic(a);
      expect(r.globalScore).toBeLessThan(40);
      expect(r.verdict).toBe("alerte");
    });
  });

  describe("scoring per-article", () => {
    it("isole le score article 21.2.j (MFA) quand seules ses questions sont 'oui'", () => {
      const a: Nis2Answers = {};
      // Tout a 'non' sauf les questions article 21.2.j
      for (const q of NIS2_QUESTIONS) {
        a[q.id] = q.article === "21.2.j" ? "oui" : "non";
      }
      const r = computeNis2Diagnostic(a);
      const mfaScore = r.articleScores.find((s) => s.article === "21.2.j");
      expect(mfaScore?.score).toBe(100);
      // Tous les autres articles devraient etre a 0
      for (const s of r.articleScores) {
        if (s.article !== "21.2.j") {
          expect(s.score).toBe(0);
        }
      }
    });

    it("article 23 (notification) est present dans le scoring", () => {
      const r = computeNis2Diagnostic(allYes());
      const art23 = r.articleScores.find((s) => s.article === "23");
      expect(art23).toBeDefined();
      expect(art23?.score).toBe(100);
    });
  });

  describe("topPriorities", () => {
    it("renvoie les 3 articles avec le plus gros gap quand tout est 'non'", () => {
      const r = computeNis2Diagnostic(allNo());
      expect(r.topPriorities).toHaveLength(3);
      // Tous a un score < 80
      for (const p of r.topPriorities) {
        expect(p.score).toBeLessThan(80);
      }
    });

    it("exclut les articles deja >=80 du top 3", () => {
      const a = allYes(); // tous a 100
      // On casse uniquement l'article 21.2.a en mettant ses 3 questions a "non"
      for (const q of NIS2_QUESTIONS.filter((q) => q.article === "21.2.a")) {
        a[q.id] = "non";
      }
      const r = computeNis2Diagnostic(a);
      // 21.2.a doit etre LA seule priorite (score 0, les autres a 100)
      expect(r.topPriorities.length).toBeLessThanOrEqual(1);
      if (r.topPriorities.length === 1) {
        expect(r.topPriorities[0].article).toBe("21.2.a");
      }
    });
  });

  describe("computedAt", () => {
    it("contient une timestamp ISO valide", () => {
      const r = computeNis2Diagnostic(allYes());
      expect(r.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // Date dans une fenetre raisonnable (moins de 5s d'ecart)
      const diff = Math.abs(Date.now() - new Date(r.computedAt).getTime());
      expect(diff).toBeLessThan(5000);
    });
  });
});

describe("lib/nis2/scoring - countYesAnswers", () => {
  it("compte correctement les 'oui'", () => {
    const a: Nis2Answers = {
      q1: "oui",
      q2: "non",
      q3: "oui",
      q4: "ne_sait_pas",
      q5: "oui",
    };
    expect(countYesAnswers(a)).toBe(3);
  });

  it("retourne 0 quand aucune reponse 'oui'", () => {
    const a: Nis2Answers = { q1: "non", q2: "ne_sait_pas" };
    expect(countYesAnswers(a)).toBe(0);
  });

  it("retourne 0 pour un objet vide", () => {
    expect(countYesAnswers({})).toBe(0);
  });
});
