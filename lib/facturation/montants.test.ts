// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de l'arithmetique des factures.
//
// Ce que ces tests protegent : l'invariant HT + TVA == TTC, exactement, pour
// tout montant. C'est l'erreur classique -- arrondir HT et TVA separement --
// et elle ne se voit qu'a la ligne pres, souvent apres l'envoi au client.

import { describe, it, expect } from "vitest";
import {
  htDepuisTtc,
  calculerTotaux,
  formaterEuros,
  formaterTaux,
  TVA_FR_STANDARD_BP,
  TVA_ZERO_BP,
} from "./montants";
import { jour } from "./pdf";

describe("htDepuisTtc", () => {
  it("le cas reel : 48,00 € TTC a 20 % font 40,00 € HT", () => {
    expect(htDepuisTtc(4800, TVA_FR_STANDARD_BP)).toBe(4000);
  });

  it("le plan starter : 19,00 € TTC font 15,83 € HT (et 3,17 € de TVA)", () => {
    const ht = htDepuisTtc(1900, TVA_FR_STANDARD_BP);
    expect(ht).toBe(1583);
    expect(1900 - ht).toBe(317);
  });

  it("taux zero : le HT est le TTC (autoliquidation, export, franchise)", () => {
    expect(htDepuisTtc(4800, TVA_ZERO_BP)).toBe(4800);
  });

  it("refuse un montant non entier -- les centimes ne sont pas des flottants", () => {
    expect(() => htDepuisTtc(48.5, TVA_FR_STANDARD_BP)).toThrow();
  });

  it("gere les montants negatifs (avoirs)", () => {
    expect(htDepuisTtc(-4800, TVA_FR_STANDARD_BP)).toBe(-4000);
  });

  // Le test qui compte vraiment : sur DIX MILLE montants, l'invariant tient.
  it("HT + TVA == TTC pour tout montant de 1 a 10 000 centimes", () => {
    const casses: number[] = [];
    for (let ttc = 1; ttc <= 10_000; ttc++) {
      const ht = htDepuisTtc(ttc, TVA_FR_STANDARD_BP);
      if (ht + (ttc - ht) !== ttc) casses.push(ttc);
      // Et le HT reste plausible : jamais superieur au TTC, jamais negatif.
      if (ht > ttc || ht < 0) casses.push(ttc);
    }
    expect(casses).toEqual([]);
  });

  it("l'arrondi est bien le plus proche, pas une troncature", () => {
    // 100 centimes TTC / 1,2 = 83,333... -> 83
    expect(htDepuisTtc(100, TVA_FR_STANDARD_BP)).toBe(83);
    // 110 / 1,2 = 91,666... -> 92 (une troncature donnerait 91)
    expect(htDepuisTtc(110, TVA_FR_STANDARD_BP)).toBe(92);
  });
});

describe("calculerTotaux", () => {
  it("le cas reel du 17 aout : 16 sieges a 3,00 € TTC", () => {
    const t = calculerTotaux(
      [
        {
          designation: "Humanix Académie - plan Pro (16 sièges)",
          quantite: 16,
          prixUnitaireTtcCentimes: 300,
        },
      ],
      TVA_FR_STANDARD_BP,
    );
    expect(t.totalTtcCentimes).toBe(4800);
    expect(t.totalHtCentimes).toBe(4000);
    expect(t.tvaCentimes).toBe(800);
  });

  it("la facture tombe juste meme avec plusieurs lignes qui arrondissent mal", () => {
    // 3 lignes a 19,00 € TTC : chacune donne 15,83 € HT, jamais rond.
    const t = calculerTotaux(
      [
        { designation: "A", quantite: 1, prixUnitaireTtcCentimes: 1900 },
        { designation: "B", quantite: 1, prixUnitaireTtcCentimes: 1900 },
        { designation: "C", quantite: 1, prixUnitaireTtcCentimes: 1900 },
      ],
      TVA_FR_STANDARD_BP,
    );
    expect(t.totalTtcCentimes).toBe(5700);
    expect(t.totalHtCentimes).toBe(4749); // 3 x 1583
    expect(t.tvaCentimes).toBe(951);
    // L'invariant, encore : c'est lui qu'on protege.
    expect(t.totalHtCentimes + t.tvaCentimes).toBe(t.totalTtcCentimes);
  });

  it("chaque ligne affichee tombe juste elle aussi", () => {
    const t = calculerTotaux(
      [{ designation: "A", quantite: 7, prixUnitaireTtcCentimes: 1900 }],
      TVA_FR_STANDARD_BP,
    );
    // Le HT est calcule sur le TOTAL de la ligne (7 x 19,00 = 133,00 €),
    // pas 7 fois un HT unitaire arrondi -- sinon on perdrait des centimes.
    expect(t.lignes[0].totalTtcCentimes).toBe(13_300);
    expect(t.lignes[0].totalHtCentimes).toBe(11_083);
    expect(t.totalHtCentimes + t.tvaCentimes).toBe(13_300);
  });

  it("refuse une facture sans ligne", () => {
    expect(() => calculerTotaux([], TVA_FR_STANDARD_BP)).toThrow();
  });

  it("refuse une quantite nulle ou non entiere", () => {
    expect(() =>
      calculerTotaux(
        [{ designation: "A", quantite: 0, prixUnitaireTtcCentimes: 1900 }],
        TVA_FR_STANDARD_BP,
      ),
    ).toThrow();
    expect(() =>
      calculerTotaux(
        [{ designation: "A", quantite: 1.5, prixUnitaireTtcCentimes: 1900 }],
        TVA_FR_STANDARD_BP,
      ),
    ).toThrow();
  });

  it("refuse un taux negatif ou fractionnaire en points de base", () => {
    const l = [{ designation: "A", quantite: 1, prixUnitaireTtcCentimes: 100 }];
    expect(() => calculerTotaux(l, -1)).toThrow();
    expect(() => calculerTotaux(l, 20.5)).toThrow();
  });
});

describe("formatage francais", () => {
  // Les espaces sont ecrites en \u00a0 EXPRES : a l'oeil, U+00A0, U+202F et
  // l'espace ordinaire sont identiques. Ce test a deja attrape un U+202F
  // (espace fine insecable) qui serait sorti en blanc dans le PDF -- Helvetica
  // ne l'a pas. On ne veut plus dependre de ce qu'on croit voir.
  const NBSP = "\u00a0";

  it("formate les euros avec virgule et espace insecable", () => {
    expect(formaterEuros(4800)).toBe(`48,00${NBSP}€`);
    expect(formaterEuros(1583)).toBe(`15,83${NBSP}€`);
    expect(formaterEuros(0)).toBe(`0,00${NBSP}€`);
    expect(formaterEuros(123_456_78)).toBe(`123${NBSP}456,78${NBSP}€`);
    expect(formaterEuros(-4800)).toBe(`-48,00${NBSP}€`);
  });

  it("n'emet AUCUN caractere absent de l'encodage WinAnsi d'Helvetica", () => {
    // U+202F est le piege : typographiquement correct, invisible dans le PDF.
    const echantillons = [1, 99, 100, 1583, 4800, 123_456_78, -4800];
    for (const c of echantillons) {
      expect(formaterEuros(c)).not.toMatch(/\u202f|\u2009|\u2007/);
    }
  });

  it("formate les taux sans decimale inutile", () => {
    expect(formaterTaux(2000)).toBe(`20${NBSP}%`);
    expect(formaterTaux(550)).toBe(`5,5${NBSP}%`);
    expect(formaterTaux(0)).toBe(`0${NBSP}%`);
  });
});

describe("dates de facture - heure de Paris, pas UTC", () => {
  it("un paiement a 22:54 UTC le 17 est date du 18 sur la facture", () => {
    // Le cas reel : le premier paiement Humanix, 2026-08-17T22:54:02Z, a eu
    // lieu le 18 aout a 00 h 54 heure de Paris. C'est cette date qui fait foi.
    expect(jour(new Date("2026-08-17T22:54:02Z"))).toBe("18/08/2026");
  });

  it("bascule de mois : 31 juillet 23 h UTC -> 1er aout a Paris", () => {
    expect(jour(new Date("2026-07-31T23:30:00Z"))).toBe("01/08/2026");
  });

  it("en hiver le decalage n'est que d'une heure", () => {
    // 31 decembre 23 h 30 UTC = 1er janvier 00 h 30 a Paris : changement
    // d'EXERCICE. C'est le cas ou une erreur de fuseau coute le plus cher.
    expect(jour(new Date("2026-12-31T23:30:00Z"))).toBe("01/01/2027");
    expect(jour(new Date("2026-12-31T22:30:00Z"))).toBe("31/12/2026");
  });
});
