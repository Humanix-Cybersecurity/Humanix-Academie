// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  rankSaisonSlugsForLiveThreat,
  rankSaisonSlugsForThreat,
  tokenize,
} from "./threat-modules";

describe("threat-modules", () => {
  it("tokenize ignore la ponctuation et les mots courts", () => {
    expect(tokenize("Phishing! de=bad@x.fr, sujet=MS")).toEqual([
      "phishing",
      "bad",
      "sujet",
    ]);
  });

  it("classe les saisons par pertinence pour une question de RSSI", () => {
    const r = rankSaisonSlugsForThreat("phishing finance");
    expect(r[0]).toBe("phishing");
    expect(r).toContain("fraude-president");
    // remediation-flash est dans la liste phishing, en fin : presente mais pas en tete.
    expect(r).toContain("remediation-flash");
    expect(r.indexOf("remediation-flash")).toBeGreaterThan(0);
  });

  it("promeut remediation-flash en tete pour une menace REELLE de phishing", () => {
    const r = rankSaisonSlugsForLiveThreat("Phishing detecte par mailinblack");
    expect(r[0]).toBe("remediation-flash");
    expect(r[1]).toBe("phishing");
  });

  it("ne force pas remediation-flash quand la menace ne s'y prete pas", () => {
    const r = rankSaisonSlugsForLiveThreat("byod telephone perso");
    expect(r).not.toContain("remediation-flash");
    expect(r[0]).toBe("mobile-smartphone");
  });

  it("renvoie vide quand rien ne matche", () => {
    expect(rankSaisonSlugsForThreat("zzz qqq")).toEqual([]);
  });
});
