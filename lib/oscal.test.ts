// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests OSCAL v1.1.2 - Assessment Results Model.
// Critique : un OSCAL invalide est rejeté par les outils GRC tiers
// (Eramba, RegScale, OpenSCAP) → preuve perdue → audit raté chez le client.

import { describe, it, expect } from "vitest";
import {
  buildOscalAssessmentResults,
  type OscalEvidence,
  type OscalTenant,
} from "./oscal";
import { FRAMEWORKS } from "./mapping-grc";

const tenant: OscalTenant = { id: "tenant_42", name: "ACME" };
const framework = FRAMEWORKS["ISO27001:2022"];
const generatedAt = new Date("2026-05-04T12:00:00Z");
const baseUrl = "https://api.humanix.fr";

const evidence: OscalEvidence = {
  control_ref: "A.5.1",
  control_name: "Politiques",
  status: "compliant",
  score: 95,
  artifacts: [
    {
      type: "policy",
      name: "Charte cyber",
      url: "https://acme.fr/charte.pdf",
    },
  ],
};

describe("buildOscalAssessmentResults", () => {
  it("retourne la racine 'assessment-results' (modèle officiel OSCAL)", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
      baseUrl,
    });
    expect(out["assessment-results"]).toBeDefined();
  });

  it("inclut un UUID v4 valide pour le document racine", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
      baseUrl,
    });
    const ar = out["assessment-results"] as Record<string, unknown>;
    const uuid = ar.uuid as string;
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("UUID est déterministe pour les mêmes inputs (export reproductible)", () => {
    const out1 = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
      baseUrl,
    });
    const out2 = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
      baseUrl,
    });
    expect((out1["assessment-results"] as any).uuid).toBe(
      (out2["assessment-results"] as any).uuid,
    );
  });

  it("expose oscal-version 1.1.2 dans metadata", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
      baseUrl,
    });
    const ar = out["assessment-results"] as any;
    expect(ar.metadata["oscal-version"]).toBe("1.1.2");
  });

  it("inclut les coordonnées Humanix (parties[0])", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
      baseUrl,
    });
    const ar = out["assessment-results"] as any;
    const parties = ar.metadata.parties as Array<Record<string, unknown>>;
    expect(parties).toHaveLength(1);
    expect(parties[0].name).toContain("Humanix");
    expect(parties[0].type).toBe("organization");
  });

  it("mappe statut compliant → 'satisfied' (vocabulaire OSCAL)", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [{ ...evidence, status: "compliant" }],
      generatedAt,
      baseUrl,
    });
    const ar = out["assessment-results"] as any;
    const findings = ar.results[0].findings;
    expect(findings[0].target.status.state).toBe("satisfied");
  });

  it("mappe statut partial/non_compliant → 'other-than-satisfied'", () => {
    for (const status of ["partial", "non_compliant"] as const) {
      const out = buildOscalAssessmentResults({
        tenant,
        framework,
        evidences: [{ ...evidence, status }],
        generatedAt,
        baseUrl,
      });
      const ar = out["assessment-results"] as any;
      expect(ar.results[0].findings[0].target.status.state).toBe(
        "other-than-satisfied",
      );
    }
  });

  it("mappe statut not_assessed → 'not-applicable'", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [{ ...evidence, status: "not_assessed" }],
      generatedAt,
      baseUrl,
    });
    const ar = out["assessment-results"] as any;
    expect(ar.results[0].findings[0].target.status.state).toBe(
      "not-applicable",
    );
  });

  it("génère une observation par artifact qui a une URL", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [
        {
          ...evidence,
          artifacts: [
            { type: "policy", name: "Doc1", url: "https://x.fr/1.pdf" },
            { type: "policy", name: "Doc2" }, // sans url ni value → ignoré
            { type: "metric", name: "Métrique", value: 90, unit: "%" },
          ],
        },
      ],
      generatedAt,
      baseUrl,
    });
    const ar = out["assessment-results"] as any;
    const observations = ar.results[0].observations;
    // Doc1 (url) + Métrique (value) = 2 observations, Doc2 (rien) ignoré
    expect(observations).toHaveLength(2);
  });

  it("relie chaque finding à ses observations (related-observations)", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
      baseUrl,
    });
    const ar = out["assessment-results"] as any;
    const finding = ar.results[0].findings[0];
    const obs = ar.results[0].observations[0];
    expect(finding["related-observations"][0]["observation-uuid"]).toBe(
      obs.uuid,
    );
  });

  it("est sérialisable en JSON sans cycle ni undefined", () => {
    const out = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
      baseUrl,
    });
    expect(() => JSON.stringify(out)).not.toThrow();
  });
});
