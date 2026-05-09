// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du plan-gating.
// Critique : un bug ici = feature payante exposée gratuitement OU
// utilisateur bloqué qui devrait avoir accès. Les deux cas = perte client.
//
// Aligne sur la grille mai 2026 (3 paliers cloud : starter / pro / enterprise).

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
  it("accepte les 3 plans valides", () => {
    expect(isPlanId("starter")).toBe(true);
    expect(isPlanId("pro")).toBe(true);
    expect(isPlanId("enterprise")).toBe(true);
  });

  it("rejette les anciens identifiants (decouverte, solo, essentielle, premium, trial)", () => {
    // Ces values etaient valides avant le pivot mai 2026.
    // Maintenant elles sont retro-compat via normalizePlan() mais isPlanId() les rejette.
    expect(isPlanId("decouverte")).toBe(false);
    expect(isPlanId("solo")).toBe(false);
    expect(isPlanId("essentielle")).toBe(false);
    expect(isPlanId("premium")).toBe(false);
    expect(isPlanId("trial")).toBe(false);
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
    expect(normalizePlan("starter")).toBe("starter");
    expect(normalizePlan("pro")).toBe("pro");
    expect(normalizePlan("enterprise")).toBe("enterprise");
  });

  it("mappe les anciens identifiants vers les nouveaux (migration mai 2026)", () => {
    expect(normalizePlan("decouverte")).toBe("starter");
    expect(normalizePlan("solo")).toBe("starter");
    expect(normalizePlan("essentielle")).toBe("pro");
    expect(normalizePlan("premium")).toBe("enterprise");
    expect(normalizePlan("trial")).toBe("starter");
  });

  it("fallback à 'starter' si invalide", () => {
    expect(normalizePlan("inconnu")).toBe("starter");
    expect(normalizePlan(null)).toBe("starter");
    expect(normalizePlan(undefined)).toBe("starter");
    expect(normalizePlan("")).toBe("starter");
  });
});

describe("PLAN_RANK", () => {
  it("est ordonné de manière strictement croissante", () => {
    expect(PLAN_RANK.starter).toBeLessThan(PLAN_RANK.pro);
    expect(PLAN_RANK.pro).toBeLessThan(PLAN_RANK.enterprise);
  });

  it("contient exactement les 3 plans", () => {
    expect(Object.keys(PLAN_RANK)).toHaveLength(3);
  });
});

describe("planHasFeature", () => {
  it("Pro a accès au phishing simulé (requis Pro+)", () => {
    expect(planHasFeature("pro", "phishing")).toBe(true);
    expect(planHasFeature("enterprise", "phishing")).toBe(true);
  });

  it("Starter n'a PAS accès au phishing simulé", () => {
    expect(planHasFeature("starter", "phishing")).toBe(false);
  });

  it("Pro a accès à l'API REST (requis Pro+)", () => {
    expect(planHasFeature("pro", "api")).toBe(true);
    expect(planHasFeature("enterprise", "api")).toBe(true);
  });

  it("Starter n'a PAS accès à l'API", () => {
    expect(planHasFeature("starter", "api")).toBe(false);
  });

  it("seul Enterprise a accès au SSO enterprise / multi-site / white-label", () => {
    expect(planHasFeature("pro", "sso_enterprise")).toBe(false);
    expect(planHasFeature("pro", "multi_site")).toBe(false);
    expect(planHasFeature("pro", "white_label")).toBe(false);
    expect(planHasFeature("enterprise", "sso_enterprise")).toBe(true);
    expect(planHasFeature("enterprise", "multi_site")).toBe(true);
    expect(planHasFeature("enterprise", "white_label")).toBe(true);
  });

  it("Starter n'a accès à AUCUNE feature gated", () => {
    for (const feature of Object.keys(FEATURE_MIN_PLAN) as Feature[]) {
      expect(planHasFeature("starter", feature)).toBe(false);
    }
  });

  it("plan invalide → traité comme starter (rien de gated)", () => {
    expect(planHasFeature("foo", "phishing")).toBe(false);
    expect(planHasFeature(null, "phishing")).toBe(false);
    expect(planHasFeature(undefined, "phishing")).toBe(false);
  });

  it("anciens plans normalises -> features correctes apres mapping", () => {
    // decouverte/solo -> starter (rien de gated)
    expect(planHasFeature("decouverte", "phishing")).toBe(false);
    expect(planHasFeature("solo", "phishing")).toBe(false);
    // essentielle -> pro (phishing OK, sso enterprise non)
    expect(planHasFeature("essentielle", "phishing")).toBe(true);
    expect(planHasFeature("essentielle", "sso_enterprise")).toBe(false);
    // premium -> enterprise (tout)
    expect(planHasFeature("premium", "sso_enterprise")).toBe(true);
  });

  it("matrice complète features × plans (régression)", () => {
    // Snapshot du contrat actuel - tout changement doit être intentionnel
    const matrix: Record<Feature, PlanId[]> = {
      api: ["pro", "enterprise"],
      phishing: ["pro", "enterprise"],
      challenges: ["pro", "enterprise"],
      incidents: ["pro", "enterprise"],
      phishing_ia: ["pro", "enterprise"],
      vishing: ["pro", "enterprise"],
      smishing: ["pro", "enterprise"],
      marketplace: ["pro", "enterprise"],
      sso_enterprise: ["enterprise"],
      multi_site: ["enterprise"],
      white_label: ["enterprise"],
    };

    for (const [feature, allowedPlans] of Object.entries(matrix) as [
      Feature,
      PlanId[],
    ][]) {
      const allPlans: PlanId[] = ["starter", "pro", "enterprise"];
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
    const allPlans: PlanId[] = ["starter", "pro", "enterprise"];
    for (const p of allPlans) {
      expect(PLAN_LABEL[p]).toBeTruthy();
    }
  });

  it("featureMinPlanLabel renvoie le libellé humain", () => {
    expect(featureMinPlanLabel("phishing")).toBe("Pro");
    expect(featureMinPlanLabel("sso_enterprise")).toBe("Enterprise");
    expect(featureMinPlanLabel("api")).toBe("Pro");
  });
});
