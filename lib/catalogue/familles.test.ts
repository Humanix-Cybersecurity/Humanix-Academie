// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { SAISON_TAGS } from "@/prisma/catalog-tags";
import {
  CATEGORIES,
  FAMILLES,
  LIBELLES_ADMIN,
  LIBELLES_APPRENANT,
  SANS_FAMILLE,
  categorieDepuisTags,
  familleDepuisTags,
} from "./familles";

describe("famille d'une saison d'après ses tags", () => {
  it("lit le tag famille:* quelle que soit sa position", () => {
    expect(familleDepuisTags(["secteur:sante", "famille:sectoriel"])).toBe(
      "sectoriel",
    );
    expect(familleDepuisTags(["famille:public", "phishing"])).toBe("public");
  });

  it("vaut null sans tag famille ou avec une famille inconnue", () => {
    expect(familleDepuisTags([])).toBeNull();
    expect(familleDepuisTags(["phishing", "metier:rh"])).toBeNull();
    expect(familleDepuisTags(["famille:inconnue"])).toBeNull();
  });

  it("replie sur « autres » pour l'affichage, des deux côtés", () => {
    expect(categorieDepuisTags([])).toBe(SANS_FAMILLE);
    expect(categorieDepuisTags(["famille:inconnue"])).toBe(SANS_FAMILLE);
    expect(categorieDepuisTags(["famille:avance"])).toBe("avance");
    expect(LIBELLES_ADMIN[SANS_FAMILLE].label).toBe(
      LIBELLES_APPRENANT[SANS_FAMILLE].label,
    );
  });
});

describe("catalogue et libellés", () => {
  it("toute saison du catalogue a une famille connue (jamais « autres »)", () => {
    const sansFamille = Object.entries(SAISON_TAGS)
      .filter(([, tags]) => familleDepuisTags(tags) === null)
      .map(([slug]) => slug);
    expect(sansFamille).toEqual([]);
  });

  it("le catalogue utilise exactement les familles de la liste", () => {
    const utilisees = new Set(
      Object.values(SAISON_TAGS).map(familleDepuisTags),
    );
    expect([...utilisees].sort()).toEqual([...FAMILLES].sort());
  });

  it("les saisons sectorielles ont leur catégorie, côté admin et apprenant", () => {
    const sectorielles = Object.entries(SAISON_TAGS).filter(([, tags]) =>
      tags.includes("famille:sectoriel"),
    );
    expect(sectorielles.length).toBeGreaterThan(0);
    for (const [, tags] of sectorielles) {
      expect(categorieDepuisTags(tags)).toBe("sectoriel");
    }
    expect(LIBELLES_ADMIN.sectoriel.label).toBe("Sectoriel");
    expect(LIBELLES_APPRENANT.sectoriel.label).toBe("Par secteur d'activité");
  });

  it("les deux interfaces ont un libellé pour chaque catégorie, et rien de plus", () => {
    const attendues = [...CATEGORIES].sort();
    expect(Object.keys(LIBELLES_ADMIN).sort()).toEqual(attendues);
    expect(Object.keys(LIBELLES_APPRENANT).sort()).toEqual(attendues);
    for (const c of CATEGORIES) {
      expect(LIBELLES_ADMIN[c].label).not.toBe("");
      expect(LIBELLES_ADMIN[c].description).not.toBe("");
      expect(LIBELLES_APPRENANT[c].label).not.toBe("");
    }
  });
});
