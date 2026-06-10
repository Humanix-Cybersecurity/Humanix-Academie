// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { computeExposureScore, verdictLabel } from "./exposure-score";

describe("computeExposureScore", () => {
  it("score 0 / faible quand aucune exposition", () => {
    const r = computeExposureScore({
      passwordPwned: false,
      passwordCount: 0,
      domainBreaches: 0,
      sensitiveDataInBreaches: false,
      phoneFlagged: false,
    });
    expect(r.score).toBe(0);
    expect(r.verdict).toBe("faible");
    expect(r.factors).toHaveLength(0);
  });

  it("mot de passe massivement compromis = critique", () => {
    const r = computeExposureScore({
      passwordPwned: true,
      passwordCount: 500000,
      domainBreaches: 0,
      sensitiveDataInBreaches: false,
      phoneFlagged: false,
    });
    // 45 + 15 amplifier = 60 -> eleve
    expect(r.score).toBe(60);
    expect(r.verdict).toBe("eleve");
  });

  it("cumul mdp + domaine + sensibles plafonne a 100", () => {
    const r = computeExposureScore({
      passwordPwned: true,
      passwordCount: 999999,
      domainBreaches: 10,
      sensitiveDataInBreaches: true,
      phoneFlagged: true,
    });
    // 60 + 30 (cap domaine) + 15 + 10 = 115 -> clamp 100
    expect(r.score).toBe(100);
    expect(r.verdict).toBe("critique");
  });

  it("verdict modere autour de 25-49", () => {
    const r = computeExposureScore({
      passwordPwned: false,
      passwordCount: 0,
      domainBreaches: 3,
      sensitiveDataInBreaches: true,
      phoneFlagged: false,
    });
    // 24 (cap a 24 car 3*8) + 15 = 39 -> modere
    expect(r.verdict).toBe("modere");
  });

  it("expose le barème versionné", () => {
    const r = computeExposureScore({
      passwordPwned: false,
      passwordCount: 0,
      domainBreaches: 0,
      sensitiveDataInBreaches: false,
      phoneFlagged: false,
    });
    expect(r.version).toBe("v1");
  });
});

describe("verdictLabel", () => {
  it("fournit label + tone pour chaque verdict (RGAA: label jamais vide)", () => {
    for (const v of ["faible", "modere", "eleve", "critique"] as const) {
      const l = verdictLabel(v);
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.tone.length).toBeGreaterThan(0);
    }
  });
});
