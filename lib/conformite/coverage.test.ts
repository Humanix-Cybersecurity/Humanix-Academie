// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la couverture conformité (logique pure frameworkCoverage), en
// se concentrant sur Sapin II : statut par contrôle selon les métriques,
// contrôles documentaires, hors-périmètre, et math du % de couverture.
import { describe, it, expect } from "vitest";
import { frameworkCoverage } from "./coverage";
import type { GrcMetrics } from "@/lib/grc-metrics";

function metrics(overrides: Partial<GrcMetrics> = {}): GrcMetrics {
  return {
    tenantScore: 0,
    completionRate: 0,
    phishingReportRate: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalEpisodes: 0,
    completedEpisodes: 0,
    certificatesCount: 0,
    marketplaceModulesActive: 0,
    modulesBySlug: {},
    modulesByCategory: {},
    ...overrides,
  };
}

describe("frameworkCoverage — Sapin II", () => {
  it("tout couvert quand les métriques dépassent les seuils", () => {
    const cov = frameworkCoverage(
      "SAPIN2",
      metrics({ tenantScore: 0.9, completionRate: 0.9, phishingReportRate: 0.9 }),
    );
    // 4 contrôles mappés, tous compliant -> 100 %
    expect(cov.summary.total).toBe(4);
    expect(cov.summary.compliant).toBe(4);
    expect(cov.summary.coveragePct).toBe(100);
  });

  it("insuffisant quand les métriques sont à zéro (mais le documentaire reste couvert)", () => {
    const cov = frameworkCoverage("SAPIN2", metrics());
    // art-17-II-7 est documentaire (pas de metric) -> compliant par construction
    expect(cov.summary.compliant).toBe(1);
    expect(cov.summary.nonCompliant).toBe(3);
    // (1 + 0.5*0) / 4 = 25 %
    expect(cov.summary.coveragePct).toBe(25);
  });

  it("expose les 4 contrôles hors périmètre Humanix (honnêteté)", () => {
    const cov = frameworkCoverage("SAPIN2", metrics());
    expect(cov.outOfScope).toHaveLength(4);
    const refs = cov.outOfScope.map((o) => o.ref);
    expect(refs).toContain("art-17-II-1"); // code de conduite
    expect(refs).toContain("art-17-II-2"); // alerte interne
  });

  it("le contrôle formation (mesure 6) porte un scopeNote", () => {
    const cov = frameworkCoverage("SAPIN2", metrics({ completionRate: 1 }));
    const formation = cov.controls.find((c) => c.ref === "art-17-II-6");
    expect(formation?.status).toBe("compliant");
    expect(formation?.scopeNote).toBeTruthy();
  });
});

describe("frameworkCoverage — structure générale", () => {
  it("calcule un % de couverture borné [0,100] pour chaque référentiel", () => {
    for (const ref of ["NIS2", "RGPD", "ISO27001:2022"] as const) {
      const cov = frameworkCoverage(ref, metrics({ completionRate: 0.5 }));
      expect(cov.summary.coveragePct).toBeGreaterThanOrEqual(0);
      expect(cov.summary.coveragePct).toBeLessThanOrEqual(100);
      expect(cov.controls.length).toBeGreaterThan(0);
    }
  });
});
