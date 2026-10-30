// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  decouperGroupes,
  normaliserLibelle,
  rapprocherGroupes,
} from "./rapprochement";

const groupes = [
  { id: "g1", slug: "compta", name: "Comptabilité" },
  { id: "g2", slug: "rh", name: "Ressources humaines" },
  { id: "g3", slug: "it", name: "IT / SI" },
];

describe("normaliserLibelle", () => {
  it("ignore accents, casse, tirets et espaces superflus", () => {
    expect(normaliserLibelle("  Comptabilité ")).toBe("comptabilite");
    expect(normaliserLibelle("Ressources_Humaines")).toBe(
      "ressources humaines",
    );
    expect(normaliserLibelle("ressources   humaines")).toBe(
      "ressources humaines",
    );
  });
});

describe("decouperGroupes", () => {
  it("accepte point-virgule, barre verticale et virgule", () => {
    expect(decouperGroupes("compta; rh | direction, it")).toEqual([
      "compta",
      "rh",
      "direction",
      "it",
    ]);
  });

  it("rend une liste vide pour une cellule absente ou vide", () => {
    expect(decouperGroupes(undefined)).toEqual([]);
    expect(decouperGroupes("")).toEqual([]);
    expect(decouperGroupes(" ; ")).toEqual([]);
  });
});

describe("rapprocherGroupes", () => {
  it("retrouve un groupe par son slug ou par son nom, sans accents ni casse", () => {
    const r = rapprocherGroupes(["COMPTA", "ressources humaines"], groupes);
    expect(r.trouves.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(r.inconnus).toEqual([]);
  });

  it("signale les libelles inconnus sans rien inventer", () => {
    const r = rapprocherGroupes(["rh", "Logistique", "logistique"], groupes);
    expect(r.trouves.map((g) => g.id)).toEqual(["g2"]);
    expect(r.inconnus).toEqual(["Logistique"]);
  });

  it("fusionne les doublons et ignore les vides", () => {
    const r = rapprocherGroupes(["compta", "Comptabilité", "", "  "], groupes);
    expect(r.trouves.map((g) => g.id)).toEqual(["g1"]);
    expect(r.inconnus).toEqual([]);
  });

  it("un nom avec ponctuation se retrouve tel quel", () => {
    expect(rapprocherGroupes(["IT / SI"], groupes).trouves[0]?.id).toBe("g3");
  });
});
