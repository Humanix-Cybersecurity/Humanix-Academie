// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests des fonctions PURES du reporting B2B (Phase 3) : score de posture
// agrégé + sérialisation CEF (échappement). Pas d'accès BDD ici.
import { describe, it, expect } from "vitest";
import { computeOrgExposureScore } from "./b2b-snapshot";
import { toCefLine, type SiemEvent } from "./b2b-siem-export";

describe("computeOrgExposureScore", () => {
  it("0 quand rien de pertinent (ni ouvert ni remédié)", () => {
    expect(computeOrgExposureScore({ exposedCount: 0, remediatedCount: 0 })).toBe(0);
  });

  it("0 quand tout est remédié (aucune ouverte)", () => {
    expect(computeOrgExposureScore({ exposedCount: 0, remediatedCount: 10 })).toBe(0);
  });

  it("100 quand beaucoup d'ouvertes et aucune remédiation (volume saturé)", () => {
    expect(computeOrgExposureScore({ exposedCount: 20, remediatedCount: 0 })).toBe(100);
  });

  it("50 à mi-chemin (moitié ouverte, volume mi-saturé)", () => {
    // openFraction=0.5, volume=0.5 -> 100*(0.7*0.5 + 0.3*0.5) = 50
    expect(computeOrgExposureScore({ exposedCount: 10, remediatedCount: 10 })).toBe(50);
  });

  it("décroît à mesure que la remédiation progresse (à volume égal)", () => {
    const before = computeOrgExposureScore({ exposedCount: 10, remediatedCount: 0 });
    const after = computeOrgExposureScore({ exposedCount: 10, remediatedCount: 10 });
    expect(after).toBeLessThan(before);
  });

  it("borne le score dans [0,100]", () => {
    const s = computeOrgExposureScore({ exposedCount: 9999, remediatedCount: 0 });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("toCefLine", () => {
  const base: SiemEvent = {
    id: "exp_1",
    detectedAt: "2026-06-01T10:00:00.000Z",
    status: "NEW",
    matchedDomain: "acme.fr",
    subject: "jdoe@acme.fr",
    breachTitle: "Fuite ACME",
    breachOrganization: "ACME",
    validatedAt: null,
  };

  it("produit un en-tête CEF conforme avec la sévérité du statut", () => {
    const line = toCefLine(base);
    expect(line.startsWith("CEF:0|Humanix|Academie|1.0|EMPLOYEE_EXPOSURE|")).toBe(true);
    // NEW -> severite 6
    expect(line).toContain("|6|");
  });

  it("inclut le sujet et le domaine en extension", () => {
    const line = toCefLine(base);
    expect(line).toContain("suser=jdoe@acme.fr");
    expect(line).toContain("cs1=acme.fr");
  });

  it("échappe le caractère = dans les valeurs d'extension", () => {
    const line = toCefLine({ ...base, matchedDomain: "a=b.fr" });
    expect(line).toContain("cs1=a\\=b.fr");
  });

  it("mappe une sévérité plus basse pour REMEDIATED", () => {
    const line = toCefLine({ ...base, status: "REMEDIATED" });
    expect(line).toContain("|2|");
  });
});
