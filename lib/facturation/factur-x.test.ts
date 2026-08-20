// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests unitaires du generateur Factur-X.
//
// Ils ne remplacent PAS scripts/verifier-factur-x.ts, qui passe le XSD et le
// Schematron officiels : eux seuls disent si une plateforme agreee acceptera
// le document. Ces tests-ci verrouillent les regles que la validation
// officielle a deja fait tomber une fois, pour qu'elles ne reviennent pas.

import { describe, it, expect } from "vitest";
import {
  genererFacturX,
  categorieTva,
  date102,
  URN_EN16931,
  TYPE_FACTURE,
  TYPE_AVOIR,
} from "./factur-x";
import { VENDEUR } from "./vendeur";

const SOCLE = {
  numero: "FA-2026-0001",
  emiseLe: new Date("2026-08-20T10:00:00Z"),
  presteeLe: new Date("2026-08-17T22:54:02Z"),
  vendeur: VENDEUR,
  totalHtCentimes: 4000,
  tvaCentimes: 800,
  totalTtcCentimes: 4800,
  tauxTvaBp: 2000,
  mentionTva: "TVA française 20 %",
  lignes: [
    {
      designation: "Abonnement Pro",
      quantite: 1,
      prixUnitaireTtcCentimes: 4800,
      totalTtcCentimes: 4800,
      totalHtCentimes: 4000,
    },
  ],
  acheteur: {
    raisonSociale: "Client Test SARL",
    adresse: "1 rue de la Paix",
    codePostal: "75002",
    ville: "Paris",
    pays: "FR",
    siren: "123456789",
    tvaIntra: null,
  },
};

function fx(surcharge: Record<string, unknown> = {}) {
  return genererFacturX({ ...SOCLE, ...surcharge } as never);
}

describe("date102", () => {
  it("format AAAAMMJJ en heure de Paris", () => {
    // Meme regle que le PDF : 22 h 54 UTC le 17 = 18 aout a Paris. Le XML et
    // le PDF DOIVENT porter la meme date, sinon la plateforme rejette.
    expect(date102(new Date("2026-08-17T22:54:02Z"))).toBe("20260818");
    expect(date102(new Date("2026-12-31T23:30:00Z"))).toBe("20270101");
  });
});

describe("categorieTva", () => {
  it("taux positif -> S (taux normal)", () => {
    expect(categorieTva(SOCLE as never)).toBe("S");
  });
  it("0 % dans l'UE -> AE (autoliquidation)", () => {
    expect(
      categorieTva({
        ...SOCLE,
        tauxTvaBp: 0,
        acheteur: { ...SOCLE.acheteur, pays: "BE" },
      } as never),
    ).toBe("AE");
  });
  it("0 % hors UE -> O (hors champ)", () => {
    expect(
      categorieTva({
        ...SOCLE,
        tauxTvaBp: 0,
        acheteur: { ...SOCLE.acheteur, pays: "US" },
      } as never),
    ).toBe("O");
  });
});

describe("genererFacturX", () => {
  it("declare le profil EN 16931 (les profils BASIC sont refuses en France)", () => {
    expect(fx()).toContain(`<ram:ID>${URN_EN16931}</ram:ID>`);
  });

  it("TypeCode 380 pour une facture, 381 pour un avoir", () => {
    expect(fx()).toContain(`<ram:TypeCode>${TYPE_FACTURE}</ram:TypeCode>`);
    expect(fx({ estAvoir: true })).toContain(
      `<ram:TypeCode>${TYPE_AVOIR}</ram:TypeCode>`,
    );
  });

  // BR-27, tombee au premier passage du Schematron officiel.
  it("un avoir ne porte AUCUN montant negatif", () => {
    const xml = fx({
      estAvoir: true,
      totalHtCentimes: -4000,
      tvaCentimes: -800,
      totalTtcCentimes: -4800,
      lignes: [
        { ...SOCLE.lignes[0], totalHtCentimes: -4000, totalTtcCentimes: -4800 },
      ],
    });
    expect(xml).not.toMatch(/>-\d/);
  });

  // BR-O-05, tombee au premier passage.
  it("hors champ : AUCUN taux de TVA nulle part", () => {
    const xml = fx({
      tauxTvaBp: 0,
      tvaCentimes: 0,
      totalHtCentimes: 4800,
      acheteur: { ...SOCLE.acheteur, pays: "US", tvaIntra: null },
      lignes: [{ ...SOCLE.lignes[0], totalHtCentimes: 4800 }],
    });
    expect(xml).toContain("<ram:CategoryCode>O</ram:CategoryCode>");
    expect(xml).not.toContain("RateApplicablePercent");
  });

  // BR-O-02, tombee au premier passage.
  it("hors champ : AUCUN identifiant de TVA, meme celui du vendeur", () => {
    const xml = fx({
      tauxTvaBp: 0,
      tvaCentimes: 0,
      totalHtCentimes: 4800,
      acheteur: { ...SOCLE.acheteur, pays: "US", tvaIntra: "US123" },
      lignes: [{ ...SOCLE.lignes[0], totalHtCentimes: 4800 }],
    });
    expect(xml).not.toContain("SpecifiedTaxRegistration");
    expect(xml).not.toContain(VENDEUR.tvaIntra.replace(/\s/g, ""));
  });

  it("autoliquidation : categorie AE et motif d'exoneration obligatoire", () => {
    const xml = fx({
      tauxTvaBp: 0,
      tvaCentimes: 0,
      totalHtCentimes: 4800,
      mentionTva: "Autoliquidation - article 283-2 du CGI.",
      acheteur: { ...SOCLE.acheteur, pays: "BE", tvaIntra: "BE0123456789" },
      lignes: [{ ...SOCLE.lignes[0], totalHtCentimes: 4800 }],
    });
    expect(xml).toContain("<ram:CategoryCode>AE</ram:CategoryCode>");
    expect(xml).toContain("<ram:ExemptionReason>");
    expect(xml).toContain('schemeID="VA">BE0123456789');
  });

  it("les montants sont en points decimaux, jamais en virgules", () => {
    const xml = fx();
    expect(xml).toContain("<ram:GrandTotalAmount>48.00</ram:GrandTotalAmount>");
    expect(xml).toContain(
      '<ram:TaxTotalAmount currencyID="EUR">8.00</ram:TaxTotalAmount>',
    );
    expect(xml).not.toMatch(/<ram:\w*Amount[^>]*>\d+,\d/);
  });

  it("la facture est marquee payee : rien ne reste du", () => {
    const xml = fx();
    expect(xml).toContain(
      "<ram:TotalPrepaidAmount>48.00</ram:TotalPrepaidAmount>",
    );
    expect(xml).toContain("<ram:DuePayableAmount>0.00</ram:DuePayableAmount>");
  });

  // Sans echappement, une raison sociale avec « & » casse le document -- et le
  // XSD ne le rattrape pas, il ne parse meme plus.
  it("echappe &, <, > et les guillemets", () => {
    const xml = fx({
      acheteur: {
        ...SOCLE.acheteur,
        raisonSociale: 'Dupont & Fils <SARL> "Test"',
      },
    });
    expect(xml).toContain("Dupont &amp; Fils &lt;SARL&gt; &quot;Test&quot;");
    expect(xml).not.toContain("Dupont & Fils");
  });

  it("le SIREN part sans espaces, avec le schemeID francais 0002", () => {
    const xml = fx({
      acheteur: { ...SOCLE.acheteur, siren: "123 456 789" },
    });
    expect(xml).toContain('<ram:ID schemeID="0002">123456789</ram:ID>');
  });
});
