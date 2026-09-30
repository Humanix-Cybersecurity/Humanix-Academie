// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  engagementsPour,
  estTypeOrganisation,
  NOMBRE_REGLES,
  reglesPour,
  TYPES_ORGANISATION,
  VERSION_REGLES,
  VOCABULAIRE,
} from "./regles";

describe("les règles de l'organisation", () => {
  it("sont cinq, versionnées, avec un identifiant unique", () => {
    expect(NOMBRE_REGLES).toBe(5);
    expect(VERSION_REGLES).toBe(1);
    const ids = reglesPour("commune").map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("remplacent tous les jetons selon le type d'organisation", () => {
    for (const type of TYPES_ORGANISATION) {
      for (const r of reglesPour(type)) {
        expect(r.titre + r.resume + r.texte).not.toMatch(/\{[a-z_]+\}/);
      }
      for (const e of engagementsPour(type))
        expect(e).not.toMatch(/\{[a-z_]+\}/);
    }
  });

  it("parlent du maire à une commune et de la direction à une entreprise", () => {
    const commune = reglesPour("commune");
    const entreprise = reglesPour("entreprise");
    expect(commune[0].resume).toContain("le maire");
    expect(entreprise[0].resume).toContain("la direction");
    expect(commune[3].texte).toContain("le conseil municipal");
    expect(commune[4].texte).toContain("signalé sans délai au maire");
    expect(entreprise[4].texte).toContain("signalé sans délai à la direction");
    expect(entreprise[3].texte).not.toContain("conseil municipal");
  });

  it("mettent la majuscule en début de phrase quand la collectivité ouvre la phrase", () => {
    const compte = reglesPour("commune").find((r) => r.id === "compte");
    expect(compte?.texte).toContain("La commune tient la liste");
    const declaration = reglesPour("intercommunalite").find(
      (r) => r.id === "declaration",
    );
    expect(declaration?.texte).toContain("La communauté déclare");
  });

  it("reconnaît les types et rien d'autre", () => {
    expect(estTypeOrganisation("commune")).toBe(true);
    expect(estTypeOrganisation("mairie")).toBe(false);
    expect(Object.keys(VOCABULAIRE).sort()).toEqual(
      [...TYPES_ORGANISATION].sort(),
    );
  });
});
