// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { lireDateSeance, lireFormulaireRegles } from "./formulaire";

function form(champs: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(champs)) fd.set(k, v);
  return fd;
}

describe("lireFormulaireRegles", () => {
  it("lit un formulaire complet", () => {
    const lu = lireFormulaireRegles(
      form({
        type: "commune",
        nom: "  Commune de Saint-Exemple ",
        signataire: "Camille Durand",
        fonction: "Maire",
        reference: "2026-042",
        dateSeance: "2026-10-12",
        adoptee: "on",
      }),
    );
    expect(lu.ok).toBe(true);
    if (!lu.ok) return;
    expect(lu.input.nomOrganisation).toBe("Commune de Saint-Exemple");
    expect(lu.input.dateSeance?.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(lu.input.adoptee).toBe(true);
  });

  it("vide les champs optionnels et ne coche pas l'adoption par défaut", () => {
    const lu = lireFormulaireRegles(
      form({ type: "entreprise", nom: "Braver" }),
    );
    expect(lu.ok).toBe(true);
    if (!lu.ok) return;
    expect(lu.input).toMatchObject({
      nomSignataire: null,
      fonctionSignataire: null,
      referenceActe: null,
      dateSeance: null,
      adoptee: false,
    });
  });

  it("refuse un type inconnu, un nom trop court et une date fausse", () => {
    expect(
      lireFormulaireRegles(form({ type: "mairie", nom: "Commune" })),
    ).toEqual({ ok: false, erreur: "type_invalide" });
    expect(lireFormulaireRegles(form({ type: "commune", nom: "C" }))).toEqual({
      ok: false,
      erreur: "nom_invalide",
    });
    expect(
      lireFormulaireRegles(
        form({ type: "commune", nom: "Commune", dateSeance: "2026-02-30" }),
      ),
    ).toEqual({ ok: false, erreur: "date_invalide" });
    expect(
      lireFormulaireRegles(
        form({ type: "commune", nom: "Commune", dateSeance: "12/10/2026" }),
      ),
    ).toEqual({ ok: false, erreur: "date_invalide" });
  });

  it("borne les longueurs", () => {
    expect(
      lireFormulaireRegles(
        form({ type: "commune", nom: "Commune", signataire: "x".repeat(121) }),
      ),
    ).toEqual({ ok: false, erreur: "signataire_trop_long" });
    expect(
      lireFormulaireRegles(
        form({ type: "commune", nom: "Commune", reference: "x".repeat(41) }),
      ),
    ).toEqual({ ok: false, erreur: "reference_trop_longue" });
  });
});

describe("lireDateSeance", () => {
  it("accepte une date ISO, rejette le reste", () => {
    expect(lireDateSeance("")).toBeNull();
    expect(lireDateSeance("2026-10-12")?.toString()).toContain("2026");
    expect(lireDateSeance("1999-01-01")).toBe("invalide");
    expect(lireDateSeance("demain")).toBe("invalide");
  });
});
