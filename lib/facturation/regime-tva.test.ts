// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du regime de TVA.
//
// Ce qui est protege ici : le DEFAUT. Toute entree douteuse doit retomber sur
// « TVA francaise 20 % », jamais sur une exoneration. Une exoneration accordee
// a tort se paie en redressement ; une TVA facturee a tort se corrige par un
// avoir.

import { describe, it, expect } from "vitest";
import {
  determinerRegime,
  formeTvaIntraPlausible,
  normaliserTvaIntra,
} from "./regime-tva";
import { TVA_FR_STANDARD_BP, TVA_ZERO_BP } from "./montants";

describe("determinerRegime", () => {
  it("France : TVA 20 %, meme avec un numero de TVA fourni", () => {
    expect(determinerRegime({ pays: "FR" }).tauxBp).toBe(TVA_FR_STANDARD_BP);
    expect(
      determinerRegime({ pays: "FR", tvaIntra: "FR80103901799" }).tauxBp,
    ).toBe(TVA_FR_STANDARD_BP);
  });

  it("UE avec numero VERIFIE : autoliquidation a 0 %, avec la mention", () => {
    const r = determinerRegime({
      pays: "BE",
      tvaIntra: "BE0123456789",
      tvaIntraVerifie: true,
    });
    expect(r.tauxBp).toBe(TVA_ZERO_BP);
    expect(r.mention).toMatch(/Autoliquidation/);
    expect(r.mention).toMatch(/283-2/);
    expect(r.exigeVerificationVies).toBe(false);
  });

  // LE TROU QUE CE TEST FERME : « BE0000000000 » passe le controle de forme
  // et n'existe pas. Sans verification VIES, il donnait 0 % de TVA.
  it("UE avec numero bien forme mais NON verifie : TVA francaise", () => {
    const r = determinerRegime({ pays: "BE", tvaIntra: "BE0000000000" });
    expect(r.tauxBp).toBe(TVA_FR_STANDARD_BP);
    expect(r.mention).toMatch(/non vérifié/);
    expect(r.exigeVerificationVies).toBe(true);
  });

  it("UE avec verification NEGATIVE : TVA francaise", () => {
    const r = determinerRegime({
      pays: "BE",
      tvaIntra: "BE0123456789",
      tvaIntraVerifie: false,
    });
    expect(r.tauxBp).toBe(TVA_FR_STANDARD_BP);
  });

  // Garde-fou general : dans l'UE, aucune combinaison ne doit produire 0 %
  // sans verification positive.
  it("JAMAIS 0 % dans l'UE sans verification positive", () => {
    for (const pays of ["BE", "DE", "IT", "ES", "NL", "PT"]) {
      for (const tva of [undefined, null, "", "BE0123456789", "X"]) {
        for (const verifie of [undefined, false]) {
          const r = determinerRegime({
            pays,
            tvaIntra: tva,
            tvaIntraVerifie: verifie,
          });
          expect(r.tauxBp).toBe(TVA_FR_STANDARD_BP);
        }
      }
    }
  });

  it("UE SANS numero : TVA francaise -- on ne presume pas l'exoneration", () => {
    const r = determinerRegime({ pays: "DE" });
    expect(r.tauxBp).toBe(TVA_FR_STANDARD_BP);
    expect(r.mention).toMatch(/non fourni/);
  });

  it("UE avec un numero mal forme : TVA francaise", () => {
    expect(determinerRegime({ pays: "IT", tvaIntra: "?" }).tauxBp).toBe(
      TVA_FR_STANDARD_BP,
    );
    expect(determinerRegime({ pays: "IT", tvaIntra: "   " }).tauxBp).toBe(
      TVA_FR_STANDARD_BP,
    );
  });

  it("hors UE : hors champ, avec la mention de l'article 259-1", () => {
    const r = determinerRegime({ pays: "US" });
    expect(r.tauxBp).toBe(TVA_ZERO_BP);
    expect(r.mention).toMatch(/259-1/);
  });

  it("le Royaume-Uni n'est plus dans l'UE : traite comme hors UE", () => {
    expect(
      determinerRegime({ pays: "GB", tvaIntra: "GB123456789" }).tauxBp,
    ).toBe(TVA_ZERO_BP);
  });

  it("pays absent ou vide : on retombe sur la France, jamais sur 0 %", () => {
    expect(determinerRegime({ pays: "" }).tauxBp).toBe(TVA_FR_STANDARD_BP);
  });

  it("le code pays est insensible a la casse", () => {
    expect(
      determinerRegime({
        pays: "be",
        tvaIntra: "BE0123456789",
        tvaIntraVerifie: true,
      }).tauxBp,
    ).toBe(TVA_ZERO_BP);
  });

  it("aucun regime ne sort sans mention imprimable", () => {
    for (const pays of ["FR", "BE", "DE", "US", "GB", "", "ZZ"]) {
      const r = determinerRegime({ pays, tvaIntra: "BE0123456789" });
      expect(r.mention.trim().length).toBeGreaterThan(10);
    }
  });
});

describe("numero de TVA intracommunautaire", () => {
  it("normalise espaces, points et tirets", () => {
    expect(normaliserTvaIntra("FR 80 103 901 799")).toBe("FR80103901799");
    expect(normaliserTvaIntra("be-0123.456789")).toBe("BE0123456789");
  });

  it("accepte les formes plausibles", () => {
    expect(formeTvaIntraPlausible("FR 80 103 901 799")).toBe(true);
    expect(formeTvaIntraPlausible("BE0123456789")).toBe(true);
    expect(formeTvaIntraPlausible("NL123456789B01")).toBe(true);
  });

  it("refuse ce qui n'y ressemble pas", () => {
    expect(formeTvaIntraPlausible("")).toBe(false);
    expect(formeTvaIntraPlausible("80103901799")).toBe(false); // sans pays
    expect(formeTvaIntraPlausible("FR")).toBe(false); // pays seul
    expect(formeTvaIntraPlausible("FR@80103901799")).toBe(false);
  });
});
