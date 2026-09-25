// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { dateValidite, lireParametresDevis, referenceDevis } from "./devis";

describe("lireParametresDevis", () => {
  it("lit et borne les parametres", () => {
    expect(
      lireParametresDevis({
        prospect: " Alsace Micro ",
        espaces: "4",
        utilisateurs: "25",
      }),
    ).toEqual({
      prospect: "Alsace Micro",
      nbEspaces: 4,
      utilisateursParEspace: 25,
    });
  });
  it("refuse l'absence, le zero, le non entier et le hors bornes", () => {
    expect(lireParametresDevis({})).toBeNull();
    expect(
      lireParametresDevis({ prospect: "X", espaces: "0", utilisateurs: "5" }),
    ).toBeNull();
    expect(
      lireParametresDevis({ prospect: "X", espaces: "2.5", utilisateurs: "5" }),
    ).toBeNull();
    expect(
      lireParametresDevis({ prospect: "X", espaces: "501", utilisateurs: "5" }),
    ).toBeNull();
    expect(
      lireParametresDevis({
        prospect: "X",
        espaces: "1",
        utilisateurs: "5001",
      }),
    ).toBeNull();
  });
  it("prend la premiere valeur d'un parametre repete", () => {
    expect(
      lireParametresDevis({
        prospect: ["A", "B"],
        espaces: ["3"],
        utilisateurs: ["10"],
      }),
    ).toEqual({ prospect: "A", nbEspaces: 3, utilisateursParEspace: 10 });
  });
});

describe("referenceDevis / dateValidite", () => {
  it("construit une reference datee et lisible", () => {
    expect(
      referenceDevis("Alsace Micro Services", new Date("2026-09-25T10:00:00Z")),
    ).toBe("DEV-20260925-ALSACEMI");
    expect(referenceDevis("   ", new Date("2026-09-25T10:00:00Z"))).toBe(
      "DEV-20260925-PROSPECT",
    );
  });
  it("vaut trente jours", () => {
    const d = new Date("2026-09-25T10:00:00Z");
    expect(dateValidite(d).toISOString()).toBe("2026-10-25T10:00:00.000Z");
  });
});
