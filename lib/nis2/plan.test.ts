// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { NIS2_QUESTIONS } from "./questions";
import { NIS2_ARTICLES_ORDER } from "./articles";
import { computeNis2Diagnostic, type Nis2Answers } from "./scoring";
import { buildNis2Plan, NIS2_PLAN_CONTENT } from "./plan";

function answerAll(value: "oui" | "non"): Nis2Answers {
  const a: Nis2Answers = {};
  for (const q of NIS2_QUESTIONS) a[q.id] = value;
  return a;
}

describe("NIS2_PLAN_CONTENT", () => {
  it("couvre les 11 articles, sans trou", () => {
    for (const article of NIS2_ARTICLES_ORDER) {
      expect(NIS2_PLAN_CONTENT[article]).toBeDefined();
    }
    expect(Object.keys(NIS2_PLAN_CONTENT)).toHaveLength(11);
  });

  it("chaque article a un contenu narratif complet (attend / pourquoi / leviers)", () => {
    for (const article of NIS2_ARTICLES_ORDER) {
      const c = NIS2_PLAN_CONTENT[article];
      expect(c.attend.length).toBeGreaterThan(20);
      expect(c.pourquoi.length).toBeGreaterThan(20);
      expect(c.levierRapide.length).toBeGreaterThan(20);
      expect(c.chantier.length).toBeGreaterThan(20);
    }
  });

  it("propose toujours un angle Humanix OU un angle prestataire (jamais les deux nuls)", () => {
    for (const article of NIS2_ARTICLES_ORDER) {
      const c = NIS2_PLAN_CONTENT[article];
      expect(c.humanixAngle !== null || c.partnerAngle !== null).toBe(true);
    }
  });

  it("la formation (art. 21.2.g) est 100 % de notre perimetre : pas d'angle prestataire", () => {
    expect(NIS2_PLAN_CONTENT["21.2.g"].humanixAngle).not.toBeNull();
    expect(NIS2_PLAN_CONTENT["21.2.g"].partnerAngle).toBeNull();
  });

  it("aucun em-dash dans le contenu (regle de style projet)", () => {
    for (const article of NIS2_ARTICLES_ORDER) {
      const c = NIS2_PLAN_CONTENT[article];
      const blob = [
        c.attend,
        c.pourquoi,
        c.levierRapide,
        c.chantier,
        c.humanixAngle ?? "",
        c.partnerAngle ?? "",
      ].join(" ");
      // Detecte tout tiret cadratin (0x2014) ou demi-cadratin (0x2013)
      // sans en ecrire un seul litteral dans la source.
      const hasLongDash = [...blob].some((ch) => {
        const code = ch.charCodeAt(0);
        return code === 0x2014 || code === 0x2013;
      });
      expect(hasLongDash).toBe(false);
    }
  });
});

describe("buildNis2Plan", () => {
  it("tout en place -> tous les articles solides, aucune priorite", () => {
    const plan = buildNis2Plan(computeNis2Diagnostic(answerAll("oui")));
    expect(plan.items).toHaveLength(11);
    expect(plan.globalScore).toBe(100);
    expect(plan.solidCount).toBe(11);
    expect(plan.priorityCount).toBe(0);
    expect(plan.items.every((i) => i.status === "solide")).toBe(true);
  });

  it("rien en place -> des chantiers prioritaires et un score bas", () => {
    const plan = buildNis2Plan(computeNis2Diagnostic(answerAll("non")));
    expect(plan.items).toHaveLength(11);
    expect(plan.globalScore).toBe(0);
    expect(plan.priorityCount).toBeGreaterThan(0);
    expect(plan.items.some((i) => i.isPriority)).toBe(true);
  });

  it("les priorites sont remontees en tete du plan", () => {
    const plan = buildNis2Plan(computeNis2Diagnostic(answerAll("non")));
    const firstNonPriority = plan.items.findIndex((i) => !i.isPriority);
    const lastPriority = plan.items.map((i) => i.isPriority).lastIndexOf(true);
    // toutes les priorites apparaissent avant le premier non-prioritaire
    if (firstNonPriority !== -1) {
      expect(lastPriority).toBeLessThan(firstNonPriority);
    }
  });

  it("chaque item porte ses saisons Humanix et son meta", () => {
    const plan = buildNis2Plan(computeNis2Diagnostic(answerAll("non")));
    for (const item of plan.items) {
      expect(item.meta.title.length).toBeGreaterThan(0);
      expect(Array.isArray(item.saisons)).toBe(true);
      expect(item.content.article).toBe(item.article);
    }
  });
});
