// SPDX-License-Identifier: AGPL-3.0-or-later
// Le PDF de facture est-il RENDU, pas seulement compile.
//
// POURQUOI CE TEST EXISTE
//
//   `@react-pdf/renderer` sert dans une quinzaine de routes, dont la facture,
//   et AUCUN test ne le faisait tourner. La CI ne prouvait que la compilation.
//   Le 2026-08-31, la montee 4.6.1 -> 4.9.0 est passee verte sur onze
//   controles alors que personne n'avait vu sortir un seul PDF.
//
//   Une facture est une piece legale : elle doit sortir, et porter ses
//   mentions. Un rendu qui echoue en production se decouvrirait au moment ou
//   un client telecharge sa facture, c'est-a-dire trop tard.
//
//   Ce test rend un document COMPLET et verifie l'entete PDF. Il ne compare
//   pas les octets : un PDF porte un horodatage, deux rendus successifs ne
//   sont jamais identiques.

import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { DocumentFacture, type FacturePdf } from "./pdf";
import { VENDEUR } from "./vendeur";

function facture(surcharge: Partial<FacturePdf> = {}): FacturePdf {
  return {
    numero: "FA-2026-0001",
    emiseLe: new Date("2026-08-31T10:00:00Z"),
    presteeLe: new Date("2026-08-17T22:54:02Z"),
    vendeur: VENDEUR,
    acheteur: {
      raisonSociale: "Braver inc.",
      adresse: "12 rue des Lilas",
      codePostal: "75011",
      ville: "Paris",
      pays: "FR",
      siren: "123456789",
      tvaIntra: null,
    },
    lignes: [
      {
        designation: "Humanix Académie - abonnement Pro, 16 sièges - août 2026",
        quantite: 1,
        prixUnitaireTtcCentimes: 4800,
        totalTtcCentimes: 4800,
        totalHtCentimes: 4000,
      },
    ],
    totalHtCentimes: 4000,
    tvaCentimes: 800,
    totalTtcCentimes: 4800,
    tauxTvaBp: 2000,
    mentionTva: "TVA 20 %",
    ...surcharge,
  };
}

describe("rendu du PDF de facture", () => {
  it("produit un PDF valide", async () => {
    const buf = await renderToBuffer(<DocumentFacture f={facture()} />);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // Une facture complete pese plusieurs dizaines de kilo-octets (polices
    // embarquees comprises). Un document vide ou tronque serait bien plus
    // petit, et passerait le seul controle de l'entete.
    expect(buf.length).toBeGreaterThan(10_000);
  }, 30_000);

  // L'autoliquidation retire la TVA et ajoute une mention obligatoire : c'est
  // un chemin de rendu distinct, pas une variante cosmetique.
  it("rend aussi une facture en autoliquidation", async () => {
    const buf = await renderToBuffer(
      <DocumentFacture
        f={facture({
          tauxTvaBp: 0,
          tvaCentimes: 0,
          totalHtCentimes: 4800,
          mentionTva: "Autoliquidation - article 283-2 du CGI",
          acheteur: {
            raisonSociale: "Voorbeeld BV",
            adresse: "Damrak 1",
            codePostal: "1012",
            ville: "Amsterdam",
            pays: "NL",
            siren: null,
            tvaIntra: "NL123456789B01",
          },
        })}
      />,
    );
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(10_000);
  }, 30_000);
});
