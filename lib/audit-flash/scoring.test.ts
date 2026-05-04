// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du moteur de scoring audit-flash.
// Couvre : computeScore, buildVerdict (via verdict.label/color), computeTopRisks,
// recommendPlan, isNis2Concerned, buildAuditResult.
//
// Stratégie : on construit des AuditAnswers déterministes pour chaque
// scénario (excellent/solide/fragile/à risque) et on vérifie le contrat
// public de la fonction.

import { describe, it, expect } from "vitest";
import {
  computeScore,
  computeTopRisks,
  recommendPlan,
  isNis2Concerned,
  buildAuditResult,
  type AuditAnswers,
  type Answer,
} from "./scoring";
import { AUDIT_QUESTIONS } from "./questions";

/** Construit un set de réponses où toutes les questions ont la même réponse. */
function answersAll(answer: Answer): AuditAnswers {
  const out: AuditAnswers = {};
  for (const q of AUDIT_QUESTIONS) out[q.id] = answer;
  return out;
}

describe("computeScore", () => {
  it("retourne 100 si toutes les réponses sont 'yes' (questions non inversées)", () => {
    const answers = answersAll("yes");
    // Pour les questions inversées (invertScoring=true), 'yes' = mauvaise réponse
    // donc le score peut ne pas être exactement 100. On gère ça : pour ce test
    // on construit un set "tout bon" (yes pour normales, no pour inversées).
    const goodAnswers: AuditAnswers = {};
    for (const q of AUDIT_QUESTIONS) {
      goodAnswers[q.id] = q.invertScoring ? "no" : "yes";
    }
    expect(computeScore(goodAnswers)).toBe(100);
    // Sanity check : si on répond bêtement yes partout, le score est <= 100
    expect(computeScore(answers)).toBeLessThanOrEqual(100);
  });

  it("retourne 0 si toutes les réponses sont 'no' (questions non inversées)", () => {
    const badAnswers: AuditAnswers = {};
    for (const q of AUDIT_QUESTIONS) {
      // 'no' pour normales = mauvais ; 'yes' pour inversées = mauvais
      badAnswers[q.id] = q.invertScoring ? "yes" : "no";
    }
    expect(computeScore(badAnswers)).toBe(0);
  });

  it("traite 'unsure' comme une mauvaise réponse (cf. doc dans le code)", () => {
    // Si tout est unsure, le score doit être 0 (cf. commentaire dans scoring.ts)
    expect(computeScore(answersAll("unsure"))).toBe(0);
  });

  it("retourne un score arrondi entre 0 et 100", () => {
    const answers: AuditAnswers = {};
    // Mix : moitié bon, moitié mauvais
    AUDIT_QUESTIONS.forEach((q, i) => {
      const isGood = i % 2 === 0;
      answers[q.id] = q.invertScoring
        ? isGood
          ? "no"
          : "yes"
        : isGood
          ? "yes"
          : "no";
    });
    const score = computeScore(answers);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("ignore les réponses pour des IDs inconnus", () => {
    const answers: AuditAnswers = {
      ...answersAll("yes"),
      unknown_id_42: "yes",
    };
    expect(() => computeScore(answers)).not.toThrow();
  });
});

describe("buildAuditResult — verdict via score", () => {
  it("score >= 80 → verdict 'Excellent' / vert", () => {
    const goodAnswers: AuditAnswers = {};
    for (const q of AUDIT_QUESTIONS)
      goodAnswers[q.id] = q.invertScoring ? "no" : "yes";
    const result = buildAuditResult(goodAnswers, "10-49", "services");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.verdict.label).toBe("Excellent");
    expect(result.verdict.color).toBe("green");
  });

  it("score < 40 → verdict 'À risque' / rouge", () => {
    const badAnswers = answersAll("no");
    // Adapter pour les inverses : 'no' pour invertée = bon, donc mettre 'yes'
    for (const q of AUDIT_QUESTIONS)
      badAnswers[q.id] = q.invertScoring ? "yes" : "no";
    const result = buildAuditResult(badAnswers, "10-49", "services");
    expect(result.score).toBeLessThan(40);
    expect(result.verdict.label).toBe("À risque");
    expect(result.verdict.color).toBe("red");
  });

  it("verdict reflète la frontière 60-79 → 'Solide' / amber", () => {
    // On construit progressivement une réponse qui donne un score entre 60 et 79
    const answers = answersAll("no");
    let i = 0;
    while (computeScore(answers) < 60 && i < AUDIT_QUESTIONS.length) {
      const q = AUDIT_QUESTIONS[i];
      answers[q.id] = q.invertScoring ? "no" : "yes";
      i++;
    }
    const score = computeScore(answers);
    if (score >= 60 && score < 80) {
      const result = buildAuditResult(answers, "10-49", "services");
      expect(result.verdict.label).toBe("Solide");
      expect(result.verdict.color).toBe("amber");
    }
  });
});

describe("computeTopRisks", () => {
  it("retourne au plus 3 risques", () => {
    const risks = computeTopRisks(answersAll("no"));
    expect(risks.length).toBeLessThanOrEqual(3);
  });

  it("trie les risques par lostPoints décroissant", () => {
    const risks = computeTopRisks(answersAll("no"));
    for (let i = 1; i < risks.length; i++) {
      expect(risks[i - 1].lostPoints).toBeGreaterThanOrEqual(
        risks[i].lostPoints,
      );
    }
  });

  it("retourne 0 risque si toutes les réponses sont bonnes", () => {
    const goodAnswers: AuditAnswers = {};
    for (const q of AUDIT_QUESTIONS)
      goodAnswers[q.id] = q.invertScoring ? "no" : "yes";
    expect(computeTopRisks(goodAnswers)).toEqual([]);
  });

  it("attribue 'critique' aux catégories qui perdent ≥ 5 points", () => {
    // On force toutes les questions de la catégorie 'identite' à no
    const answers = answersAll("yes");
    for (const q of AUDIT_QUESTIONS) {
      if (q.category === "identite") answers[q.id] = "no";
    }
    const risks = computeTopRisks(answers);
    const identite = risks.find((r) => r.category === "identite");
    expect(identite).toBeDefined();
    if (identite && identite.lostPoints >= 5) {
      expect(identite.severity).toBe("critique");
    }
  });

  it("inclut un texte de recommandation non vide pour chaque risque", () => {
    const risks = computeTopRisks(answersAll("no"));
    for (const r of risks) {
      expect(r.recommendation).toBeTruthy();
      expect(r.recommendation.length).toBeGreaterThan(20);
    }
  });
});

describe("recommendPlan", () => {
  it("TPE 1-9 → toujours plan Starter", () => {
    expect(recommendPlan("1-9", 100).slug).toBe("solo");
    expect(recommendPlan("1-9", 0).slug).toBe("solo");
    expect(recommendPlan("1-9", 50).slug).toBe("solo");
  });

  it("PME 10-49 → Essentielle si score correct, Pro si score < 50 (boost)", () => {
    expect(recommendPlan("10-49", 80).slug).toBe("essentielle");
    expect(recommendPlan("10-49", 60).slug).toBe("essentielle");
    expect(recommendPlan("10-49", 50).slug).toBe("essentielle"); // limite
    expect(recommendPlan("10-49", 49).slug).toBe("pro"); // bascule needsBoost
    expect(recommendPlan("10-49", 0).slug).toBe("pro");
  });

  it("PME 50-249 → toujours plan Pro", () => {
    expect(recommendPlan("50-249", 100).slug).toBe("pro");
    expect(recommendPlan("50-249", 0).slug).toBe("pro");
  });

  it("ETI 250+ → plan Enterprise/premium", () => {
    expect(recommendPlan("250+", 100).slug).toBe("premium");
    expect(recommendPlan("250+", 0).slug).toBe("premium");
  });

  it("plan retourné contient toujours nom, prix et CTA", () => {
    const plan = recommendPlan("10-49", 70);
    expect(plan.name).toBeTruthy();
    expect(plan.monthlyPrice).toBeTruthy();
    expect(plan.annualEstimate).toBeTruthy();
    expect(plan.ctaUrl).toMatch(/^\//);
    expect(plan.rationale.length).toBeGreaterThan(20);
  });
});

describe("isNis2Concerned", () => {
  it("détecte automatiquement les secteurs régulés (santé, finance, industrie, public)", () => {
    const ans = answersAll("yes");
    expect(isNis2Concerned(ans, "1-9", "sante")).toBe(true);
    expect(isNis2Concerned(ans, "1-9", "finance")).toBe(true);
    expect(isNis2Concerned(ans, "1-9", "industrie")).toBe(true);
    expect(isNis2Concerned(ans, "1-9", "public")).toBe(true);
  });

  it("ne flag pas un secteur non régulé si l'entreprise est petite et déjà sensibilisée", () => {
    const ans = answersAll("yes");
    expect(isNis2Concerned(ans, "1-9", "services")).toBe(false);
    expect(isNis2Concerned(ans, "10-49", "associatif")).toBe(false);
  });

  it("flag les PME 50+ qui ignorent NIS2 même hors secteur régulé", () => {
    const ans: AuditAnswers = answersAll("yes");
    ans.nis2_aware = "no";
    expect(isNis2Concerned(ans, "50-249", "services")).toBe(true);
    expect(isNis2Concerned(ans, "250+", "commerce")).toBe(true);
  });

  it("ne flag pas une PME 50+ déjà NIS2-aware en secteur non régulé", () => {
    const ans = answersAll("yes");
    ans.nis2_aware = "yes";
    expect(isNis2Concerned(ans, "50-249", "services")).toBe(false);
  });

  it("traite 'unsure' comme une non-conscience pour nis2_aware", () => {
    const ans = answersAll("yes");
    ans.nis2_aware = "unsure";
    expect(isNis2Concerned(ans, "50-249", "services")).toBe(true);
  });
});

describe("buildAuditResult — intégration", () => {
  it("retourne tous les champs attendus", () => {
    const result = buildAuditResult(answersAll("yes"), "10-49", "services");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("verdict");
    expect(result).toHaveProperty("topRisks");
    expect(result).toHaveProperty("recommendedPlan");
    expect(result).toHaveProperty("nis2Concerned");
  });

  it("est déterministe (mêmes entrées → mêmes sorties)", () => {
    const r1 = buildAuditResult(answersAll("yes"), "10-49", "services");
    const r2 = buildAuditResult(answersAll("yes"), "10-49", "services");
    expect(r1).toEqual(r2);
  });

  it("topRisks limité à 3 au maximum", () => {
    const result = buildAuditResult(answersAll("no"), "50-249", "services");
    expect(result.topRisks.length).toBeLessThanOrEqual(3);
  });
});
