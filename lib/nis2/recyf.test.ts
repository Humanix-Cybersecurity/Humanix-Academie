// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  RECYF_OBJECTIFS,
  RECYF_META,
  objectifsForProfil,
} from "./recyf";

describe("RECYF_OBJECTIFS (socle)", () => {
  it("contient exactement 20 objectifs, numerotes 1 a 20 sans trou", () => {
    expect(RECYF_OBJECTIFS).toHaveLength(20);
    const nums = RECYF_OBJECTIFS.map((o) => o.num).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("les objectifs 1 a 15 sont EI+EE, les 16 a 20 sont EE uniquement", () => {
    for (const o of RECYF_OBJECTIFS) {
      expect(o.scope).toBe(o.num <= 15 ? "EI_EE" : "EE");
    }
  });

  it("chaque objectif a un contenu complet (rappel, question, plan)", () => {
    for (const o of RECYF_OBJECTIFS) {
      expect(o.titre.length).toBeGreaterThan(5);
      expect(o.rappel.length).toBeGreaterThan(15);
      expect(o.question.length).toBeGreaterThan(15);
      expect(o.attend.length).toBeGreaterThan(15);
      expect(o.pourquoi.length).toBeGreaterThan(15);
      expect(o.levierRapide.length).toBeGreaterThan(15);
      expect(o.chantier.length).toBeGreaterThan(15);
      expect([1, 2, 3]).toContain(o.poids);
    }
  });

  it("chaque objectif propose un angle Humanix OU prestataire (jamais les deux nuls)", () => {
    for (const o of RECYF_OBJECTIFS) {
      expect(o.humanixAngle !== null || o.partnerAngle !== null).toBe(true);
    }
  });

  it("la formation (objectif 4) est 100 % notre perimetre : pas d'angle prestataire", () => {
    const o4 = RECYF_OBJECTIFS.find((o) => o.num === 4)!;
    expect(o4.humanixAngle).not.toBeNull();
    expect(o4.partnerAngle).toBeNull();
  });

  it("ids uniques", () => {
    const ids = new Set(RECYF_OBJECTIFS.map((o) => o.id));
    expect(ids.size).toBe(20);
  });

  it("aucun tiret long (em/en-dash) dans le contenu", () => {
    for (const o of RECYF_OBJECTIFS) {
      const blob = [
        o.titre,
        o.rappel,
        o.question,
        o.attend,
        o.pourquoi,
        o.levierRapide,
        o.chantier,
        o.humanixAngle ?? "",
        o.partnerAngle ?? "",
      ].join(" ");
      const hasLongDash = [...blob].some((ch) => {
        const c = ch.charCodeAt(0);
        return c === 0x2014 || c === 0x2013;
      });
      expect(hasLongDash).toBe(false);
    }
  });

  it("meta : document de travail v2.5 ANSSI", () => {
    expect(RECYF_META.sigle).toBe("ReCyF");
    expect(RECYF_META.statut).toBe("Document de travail");
    expect(RECYF_META.editeur).toBe("ANSSI");
  });
});

describe("objectifsForProfil (proportionnalite)", () => {
  it("entite importante : 15 objectifs", () => {
    expect(objectifsForProfil("EI")).toHaveLength(15);
  });
  it("entite essentielle : 20 objectifs", () => {
    expect(objectifsForProfil("EE")).toHaveLength(20);
  });
  it("une EI ne voit aucun objectif reserve aux EE", () => {
    expect(objectifsForProfil("EI").every((o) => o.scope === "EI_EE")).toBe(true);
  });
});
