// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  centimesDepuisMontantMollie,
  ligneAbonnement,
} from "./depuis-paiement";

describe("centimesDepuisMontantMollie", () => {
  it("lit le cas reel : « 48.00 » -> 4800 centimes", () => {
    expect(centimesDepuisMontantMollie("48.00")).toBe(4800);
  });

  it("gere les entiers, une decimale, deux decimales", () => {
    expect(centimesDepuisMontantMollie("19")).toBe(1900);
    expect(centimesDepuisMontantMollie("19.9")).toBe(1990);
    expect(centimesDepuisMontantMollie("19.99")).toBe(1999);
    expect(centimesDepuisMontantMollie("0.01")).toBe(1);
    expect(centimesDepuisMontantMollie("228.00")).toBe(22_800);
  });

  // Le cas qui motive le decoupage de chaine plutot que parseFloat.
  it("ne perd pas de centime sur les montants qui cassent le flottant", () => {
    // parseFloat("1.15") * 100 === 114.99999999999999
    expect(centimesDepuisMontantMollie("1.15")).toBe(115);
    expect(centimesDepuisMontantMollie("8.20")).toBe(820);
    // Trois decimales : refus net. Mollie n'en emet pas, et arrondir en
    // silence un montant recu ferait diverger la facture du preleve.
    expect(() => centimesDepuisMontantMollie("1.005")).toThrow();
  });

  it("refuse ce qui n'est pas un montant", () => {
    for (const mauvais of [
      "",
      "48,00",
      "48.000",
      "abc",
      "48.0.0",
      " ",
      "1e2",
    ]) {
      expect(() => centimesDepuisMontantMollie(mauvais)).toThrow();
    }
  });

  it("gere un montant negatif (remboursement)", () => {
    expect(centimesDepuisMontantMollie("-48.00")).toBe(-4800);
  });
});

describe("ligneAbonnement", () => {
  it("decrit l'abonnement et reprend EXACTEMENT le montant preleve", () => {
    const [l] = ligneAbonnement({
      plan: "pro",
      seatCount: 16,
      montantTtcCentimes: 4800,
      presteeLe: new Date("2026-08-17T22:54:02Z"),
    });
    expect(l.quantite).toBe(1);
    expect(l.prixUnitaireTtcCentimes).toBe(4800);
    expect(l.designation).toContain("Pro");
    expect(l.designation).toContain("16 sièges");
    // Heure de Paris : le paiement du 17 a 22:54 UTC tombe le 18 aout.
    expect(l.designation).toContain("août 2026");
  });

  it("omet les sieges quand ils sont inconnus (cas reel : seatCount null)", () => {
    const [l] = ligneAbonnement({
      plan: "pro",
      seatCount: null,
      montantTtcCentimes: 4800,
      presteeLe: new Date("2026-08-17T22:54:02Z"),
    });
    expect(l.designation).not.toContain("siège");
    expect(l.prixUnitaireTtcCentimes).toBe(4800);
  });

  it("accorde le singulier", () => {
    const [l] = ligneAbonnement({
      plan: "starter",
      seatCount: 1,
      montantTtcCentimes: 1900,
      presteeLe: new Date("2026-08-17T22:54:02Z"),
    });
    expect(l.designation).toContain("1 siège");
    expect(l.designation).not.toContain("sièges");
  });
});

describe("typographie de la designation", () => {
  it("n'emet aucun tiret cadratin (convention du depot, cf. 17b2cdf)", () => {
    const [l] = ligneAbonnement({
      plan: "pro",
      seatCount: 16,
      montantTtcCentimes: 4800,
      presteeLe: new Date("2026-08-17T22:54:02Z"),
    });
    // U+2014 est banni des phrases du produit. Il est aussi absent de
    // l'encodage WinAnsi d'Helvetica : sur le PDF il sortirait de travers.
    expect(l.designation).not.toMatch(/—/);
    expect(l.designation).not.toMatch(/–/); // demi-cadratin non plus
  });
});
