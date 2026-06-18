// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  evaluateNis2Eligibility,
  NIS2_SECTEURS,
  NIS2_TAILLES,
  type Nis2EligibilityInput,
} from "./eligibility";

const base = (
  o: Partial<Nis2EligibilityInput> = {},
): Nis2EligibilityInput => ({
  secteur: "autre",
  taille: "petite",
  fournisseurEntiteRegulee: false,
  ...o,
});

describe("evaluateNis2Eligibility", () => {
  it("annexe I + grande = entite essentielle", () => {
    expect(
      evaluateNis2Eligibility(base({ secteur: "annexe1", taille: "grande" }))
        .statut,
    ).toBe("essentielle");
  });

  it("annexe I + moyenne = entite importante", () => {
    expect(
      evaluateNis2Eligibility(base({ secteur: "annexe1", taille: "moyenne" }))
        .statut,
    ).toBe("importante");
  });

  it("annexe I + petite (sans lien fournisseur) = hors perimetre probable", () => {
    expect(
      evaluateNis2Eligibility(base({ secteur: "annexe1", taille: "petite" }))
        .statut,
    ).toBe("hors_probable");
  });

  it("annexe II + moyenne = entite importante (pas essentielle)", () => {
    expect(
      evaluateNis2Eligibility(base({ secteur: "annexe2", taille: "moyenne" }))
        .statut,
    ).toBe("importante");
  });

  it("annexe II + grande = entite importante (jamais essentielle en annexe II)", () => {
    expect(
      evaluateNis2Eligibility(base({ secteur: "annexe2", taille: "grande" }))
        .statut,
    ).toBe("importante");
  });

  it("secteur autre + petite = hors perimetre probable", () => {
    expect(evaluateNis2Eligibility(base()).statut).toBe("hors_probable");
  });

  it("petite entreprise fournisseur d'une entite reglementee = concernee indirectement", () => {
    expect(
      evaluateNis2Eligibility(
        base({ taille: "petite", fournisseurEntiteRegulee: true }),
      ).statut,
    ).toBe("indirecte");
  });

  it("le lien fournisseur ne degrade pas un statut deja direct (annexe I grande reste essentielle)", () => {
    expect(
      evaluateNis2Eligibility(
        base({
          secteur: "annexe1",
          taille: "grande",
          fournisseurEntiteRegulee: true,
        }),
      ).statut,
    ).toBe("essentielle");
  });

  it("chaque statut fournit un titre, un resume et une prochaine etape non vides", () => {
    for (const secteur of ["annexe1", "annexe2", "autre"] as const) {
      for (const taille of ["micro", "petite", "moyenne", "grande"] as const) {
        const r = evaluateNis2Eligibility({
          secteur,
          taille,
          fournisseurEntiteRegulee: false,
        });
        expect(r.titre.length).toBeGreaterThan(0);
        expect(r.resume.length).toBeGreaterThan(0);
        expect(r.prochaineEtape.length).toBeGreaterThan(0);
      }
    }
  });

  it("les listes d'options UI sont completes (3 secteurs, 4 tailles)", () => {
    expect(NIS2_SECTEURS).toHaveLength(3);
    expect(NIS2_TAILLES).toHaveLength(4);
  });
});
