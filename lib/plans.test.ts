// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du plan-gating.
// Critique : un bug ici = feature payante exposée gratuitement OU
// utilisateur bloqué qui devrait avoir accès. Les deux cas = perte client.
//
// On NE teste PAS getTenantPlan car il dépend de Prisma - testé en e2e
// post-launch via Playwright.

import { describe, it, expect } from "vitest";
import {
  isPlanId,
  normalizePlan,
  planHasFeature,
  featureMinPlanLabel,
  PLAN_RANK,
  PLAN_LABEL,
  FEATURE_MIN_PLAN,
  type PlanId,
  type Feature,
} from "./plans";

describe("isPlanId", () => {
  it("accepte les 6 plans valides", () => {
    expect(isPlanId("trial")).toBe(true);
    expect(isPlanId("decouverte")).toBe(true);
    expect(isPlanId("solo")).toBe(true);
    expect(isPlanId("essentielle")).toBe(true);
    expect(isPlanId("pro")).toBe(true);
    expect(isPlanId("premium")).toBe(true);
  });

  it("rejette les valeurs invalides", () => {
    expect(isPlanId("")).toBe(false);
    expect(isPlanId("free")).toBe(false);
    expect(isPlanId("PRO")).toBe(false); // case-sensitive
    expect(isPlanId(null)).toBe(false);
    expect(isPlanId(undefined)).toBe(false);
    expect(isPlanId(42)).toBe(false);
    expect(isPlanId({})).toBe(false);
  });
});

describe("normalizePlan", () => {
  it("retourne le plan tel quel si valide", () => {
    expect(normalizePlan("pro")).toBe("pro");
    expect(normalizePlan("premium")).toBe("premium");
  });

  it("fallback à 'trial' si invalide", () => {
    expect(normalizePlan("inconnu")).toBe("trial");
    expect(normalizePlan(null)).toBe("trial");
    expect(normalizePlan(undefined)).toBe("trial");
    expect(normalizePlan("")).toBe("trial");
  });
});

describe("PLAN_RANK", () => {
  it("est ordonné de manière strictement croissante", () => {
    expect(PLAN_RANK.trial).toBeLessThan(PLAN_RANK.decouverte);
    expect(PLAN_RANK.decouverte).toBeLessThan(PLAN_RANK.solo);
    expect(PLAN_RANK.solo).toBeLessThan(PLAN_RANK.essentielle);
    expect(PLAN_RANK.essentielle).toBeLessThan(PLAN_RANK.pro);
    expect(PLAN_RANK.pro).toBeLessThan(PLAN_RANK.premium);
  });

  it("contient exactement les 6 plans", () => {
    expect(Object.keys(PLAN_RANK)).toHaveLength(6);
  });
});

describe("planHasFeature", () => {
  it("Pro a accès au phishing simulé (requis Pro+)", () => {
    expect(planHasFeature("pro", "phishing")).toBe(true);
    expect(planHasFeature("premium", "phishing")).toBe(true);
  });

  it("Essentielle n'a PAS accès au phishing simulé", () => {
    expect(planHasFeature("essentielle", "phishing")).toBe(false);
    expect(planHasFeature("solo", "phishing")).toBe(false);
    expect(planHasFeature("decouverte", "phishing")).toBe(false);
  });

  it("Essentielle a accès à l'API REST (requis Essentielle+)", () => {
    expect(planHasFeature("essentielle", "api")).toBe(true);
    expect(planHasFeature("pro", "api")).toBe(true);
    expect(planHasFeature("premium", "api")).toBe(true);
  });

  it("Solo (Starter) n'a PAS accès à l'API", () => {
    expect(planHasFeature("solo", "api")).toBe(false);
  });

  it("seul Premium a accès au SSO enterprise / multi-site / white-label", () => {
    expect(planHasFeature("pro", "sso_enterprise")).toBe(false);
    expect(planHasFeature("pro", "multi_site")).toBe(false);
    expect(planHasFeature("pro", "white_label")).toBe(false);
    expect(planHasFeature("premium", "sso_enterprise")).toBe(true);
    expect(planHasFeature("premium", "multi_site")).toBe(true);
    expect(planHasFeature("premium", "white_label")).toBe(true);
  });

  it("trial n'a accès à AUCUNE feature gated", () => {
    for (const feature of Object.keys(FEATURE_MIN_PLAN) as Feature[]) {
      expect(planHasFeature("trial", feature)).toBe(false);
    }
  });

  it("plan invalide → traité comme trial (rien)", () => {
    expect(planHasFeature("foo", "phishing")).toBe(false);
    expect(planHasFeature(null, "phishing")).toBe(false);
    expect(planHasFeature(undefined, "phishing")).toBe(false);
  });

  it("matrice complète features × plans (régression)", () => {
    // Snapshot du contrat actuel - tout changement doit être intentionnel
    const matrix: Record<Feature, PlanId[]> = {
      api: ["essentielle", "pro", "premium"],
      phishing: ["pro", "premium"],
      challenges: ["pro", "premium"],
      incidents: ["pro", "premium"],
      phishing_ia: ["pro", "premium"],
      marketplace: ["pro", "premium"],
      sso_enterprise: ["premium"],
      multi_site: ["premium"],
      white_label: ["premium"],
    };

    for (const [feature, allowedPlans] of Object.entries(matrix) as [
      Feature,
      PlanId[],
    ][]) {
      const allPlans: PlanId[] = [
        "trial",
        "decouverte",
        "solo",
        "essentielle",
        "pro",
        "premium",
      ];
      for (const plan of allPlans) {
        const expected = allowedPlans.includes(plan);
        expect(
          planHasFeature(plan, feature),
          `${plan} → ${feature} attendu ${expected}`,
        ).toBe(expected);
      }
    }
  });
});

describe("Labels UI", () => {
  it("PLAN_LABEL couvre tous les plans", () => {
    const allPlans: PlanId[] = [
      "trial",
      "decouverte",
      "solo",
      "essentielle",
      "pro",
      "premium",
    ];
    for (const p of allPlans) {
      expect(PLAN_LABEL[p]).toBeTruthy();
    }
  });

  it("featureMinPlanLabel renvoie le libellé humain (Pro, Enterprise...)", () => {
    expect(featureMinPlanLabel("phishing")).toBe("Pro");
    expect(featureMinPlanLabel("sso_enterprise")).toBe("Enterprise");
    expect(featureMinPlanLabel("api")).toBe("Essentielle");
  });
});
