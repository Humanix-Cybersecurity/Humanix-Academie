// SPDX-License-Identifier: AGPL-3.0-or-later
// Generation du XML Factur-X (Cross Industry Invoice, profil EN 16931).
//
// POURQUOI CE PROFIL ET PAS UN AUTRE
//
//   Les profils MINIMUM et BASIC ne passent PAS les controles francais : le
//   Schematron de la FNFE-MPE et le bloc CTC France (regle BR-FR-Flux2) les
//   rejettent. Pour du B2B francais via plateforme agreee, EN 16931 est le
//   plancher.
//
// POURQUOI DU XML A LA MAIN
//
//   Aucune dependance : le document est petit, sa structure est figee par la
//   norme, et l'echappement XML tient en quatre remplacements. Une
//   bibliotheque apporterait ici plus de surface que de service.
//
// CE QUE CE MODULE NE FAIT PAS
//
//   Il ne produit PAS un PDF/A-3 hybride. Ca demanderait d'embarquer une
//   police (PDF/A interdit les polices standard, or tous nos PDF sont en
//   Helvetica) et d'atteindre l'instance pdfkit, que @react-pdf/renderer
//   n'expose pas. Le XML CII seul reste un format valide pour la reforme.
//
// La structure suit l'exemple de reference EN 16931 de la FNFE-MPE, et la
// sortie est validee contre le XSD officiel par
// scripts/verifier-factur-x.ts.

import { VENDEUR, type IdentiteVendeur } from "./vendeur";
import type { AcheteurRendu, LigneRendue } from "./pdf";

/** Profil EN 16931 : BT-24. */
export const URN_EN16931 = "urn:cen.eu:en16931:2017";

/** BT-3 : 380 = facture, 381 = avoir. */
export const TYPE_FACTURE = "380";
export const TYPE_AVOIR = "381";

export type FactureAExporter = {
  numero: string;
  emiseLe: Date;
  presteeLe: Date;
  vendeur: IdentiteVendeur;
  acheteur: AcheteurRendu;
  lignes: LigneRendue[];
  totalHtCentimes: number;
  tvaCentimes: number;
  totalTtcCentimes: number;
  tauxTvaBp: number;
  mentionTva: string;
  /** Un avoir porte des montants negatifs et le TypeCode 381. */
  estAvoir?: boolean;
};

/** Echappement XML. Sans lui, une raison sociale avec « & » casse le document. */
function x(v: string | null | undefined): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Montant : centimes -> « 40.00 ». Point decimal, jamais de virgule.
 *
 * TOUJOURS POSITIF. Un avoir ne se represente PAS par des montants negatifs :
 * c'est le TypeCode 381 qui porte le sens. La regle BR-27 rejette un prix
 * unitaire negatif -- constate en passant le Schematron officiel sur un avoir
 * genere avec des montants signes.
 */
function montant(centimes: number): string {
  const abs = Math.abs(centimes);
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Taux : 2000 points de base -> « 20.00 ». */
function taux(bp: number): string {
  return (bp / 100).toFixed(2);
}

/**
 * Date au format 102 (AAAAMMJJ), EN HEURE DE PARIS.
 *
 * Meme raison que pour le PDF : un paiement horodate 22 h 54 UTC a eu lieu le
 * lendemain a Paris. Le XML et le PDF doivent porter LA MEME date, sinon la
 * plateforme agreee rejette l'incoherence.
 */
export function date102(d: Date): string {
  const p = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Paris",
  }).format(d);
  return p.replaceAll("-", "");
}

/**
 * Code de categorie de TVA (BT-118) deduit du taux et du pays.
 *
 *   S  = taux normal
 *   AE = autoliquidation (le preneur acquitte la taxe)
 *   O  = hors champ de la TVA
 */
export function categorieTva(f: FactureAExporter): "S" | "AE" | "O" {
  if (f.tauxTvaBp > 0) return "S";
  const pays = (f.acheteur.pays || "FR").toUpperCase();
  const UE = new Set([
    "AT",
    "BE",
    "BG",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GR",
    "HR",
    "HU",
    "IE",
    "IT",
    "LT",
    "LU",
    "LV",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SE",
    "SI",
    "SK",
  ]);
  return UE.has(pays) ? "AE" : "O";
}

function partie(
  balise: string,
  p: {
    nom: string;
    siren?: string | null;
    adresse: string;
    codePostal: string;
    ville: string;
    pays: string;
    tvaIntra?: string | null;
    /** Province, Etat ou region : BT-54. Facultatif, vide en France. */
    province?: string | null;
    email?: string | null;
    /** Hors champ de la TVA : aucun identifiant de TVA n'est admis (BR-O-02). */
    masquerTva?: boolean;
  },
): string {
  const morceaux: string[] = [`      <ram:${balise}>`];
  morceaux.push(`        <ram:Name>${x(p.nom)}</ram:Name>`);
  if (p.siren) {
    // schemeID 0002 : SIREN (systeme d'identification francais).
    morceaux.push(
      `        <ram:SpecifiedLegalOrganization>`,
      `          <ram:ID schemeID="0002">${x(p.siren.replace(/\s/g, ""))}</ram:ID>`,
      `        </ram:SpecifiedLegalOrganization>`,
    );
  }
  morceaux.push(
    `        <ram:PostalTradeAddress>`,
    `          <ram:PostcodeCode>${x(p.codePostal)}</ram:PostcodeCode>`,
    `          <ram:LineOne>${x(p.adresse)}</ram:LineOne>`,
    `          <ram:CityName>${x(p.ville)}</ram:CityName>`,
    `          <ram:CountryID>${x(p.pays.toUpperCase())}</ram:CountryID>`,
    // BT-54. L'ORDRE COMPTE : dans ram:TradeAddress, CountrySubDivisionName
    // SUIT CountryID. Le placer avant fait echouer la validation XSD, pas
    // seulement le Schematron. Verifie avec scripts/verifier-factur-x.ts.
    ...(p.province
      ? [
          `          <ram:CountrySubDivisionName>${x(p.province)}</ram:CountrySubDivisionName>`,
        ]
      : []),
    `        </ram:PostalTradeAddress>`,
  );
  if (p.email) {
    morceaux.push(
      `        <ram:URIUniversalCommunication>`,
      `          <ram:URIID schemeID="EM">${x(p.email)}</ram:URIID>`,
      `        </ram:URIUniversalCommunication>`,
    );
  }
  // BR-O-02 : une facture « hors champ » ne doit contenir AUCUN identifiant de
  // TVA -- ni vendeur, ni acheteur. Le vendeur en a bien un, mais l'afficher
  // ici fait rejeter le document.
  if (p.tvaIntra && !p.masquerTva) {
    // schemeID VA : numero de TVA intracommunautaire.
    morceaux.push(
      `        <ram:SpecifiedTaxRegistration>`,
      `          <ram:ID schemeID="VA">${x(p.tvaIntra.replace(/\s/g, ""))}</ram:ID>`,
      `        </ram:SpecifiedTaxRegistration>`,
    );
  }
  morceaux.push(`      </ram:${balise}>`);
  return morceaux.join("\n");
}

export function genererFacturX(f: FactureAExporter): string {
  const cat = categorieTva(f);
  const v = f.vendeur ?? VENDEUR;
  const a = f.acheteur;

  const lignes = f.lignes
    .map((l: LigneRendue, i: number) => {
      const puHt = Math.round(l.totalHtCentimes / l.quantite);
      return [
        `    <ram:IncludedSupplyChainTradeLineItem>`,
        `      <ram:AssociatedDocumentLineDocument>`,
        `        <ram:LineID>${i + 1}</ram:LineID>`,
        `      </ram:AssociatedDocumentLineDocument>`,
        `      <ram:SpecifiedTradeProduct>`,
        `        <ram:Name>${x(l.designation)}</ram:Name>`,
        `      </ram:SpecifiedTradeProduct>`,
        `      <ram:SpecifiedLineTradeAgreement>`,
        `        <ram:NetPriceProductTradePrice>`,
        `          <ram:ChargeAmount>${montant(puHt)}</ram:ChargeAmount>`,
        `        </ram:NetPriceProductTradePrice>`,
        `      </ram:SpecifiedLineTradeAgreement>`,
        `      <ram:SpecifiedLineTradeDelivery>`,
        `        <ram:BilledQuantity unitCode="C62">${l.quantite}</ram:BilledQuantity>`,
        `      </ram:SpecifiedLineTradeDelivery>`,
        `      <ram:SpecifiedLineTradeSettlement>`,
        `        <ram:ApplicableTradeTax>`,
        `          <ram:TypeCode>VAT</ram:TypeCode>`,
        `          <ram:CategoryCode>${cat}</ram:CategoryCode>`,
        // BR-O-05 : une ligne « hors champ » ne porte PAS de taux de TVA.
        ...(cat === "O"
          ? []
          : [
              `          <ram:RateApplicablePercent>${taux(f.tauxTvaBp)}</ram:RateApplicablePercent>`,
            ]),
        `        </ram:ApplicableTradeTax>`,
        `        <ram:SpecifiedTradeSettlementLineMonetarySummation>`,
        `          <ram:LineTotalAmount>${montant(l.totalHtCentimes)}</ram:LineTotalAmount>`,
        `        </ram:SpecifiedTradeSettlementLineMonetarySummation>`,
        `      </ram:SpecifiedLineTradeSettlement>`,
        `    </ram:IncludedSupplyChainTradeLineItem>`,
      ].join("\n");
    })
    .join("\n");

  // Une exoneration DOIT etre motivee : sans ExemptionReason, le Schematron
  // rejette une categorie AE ou O.
  const motifExoneration =
    cat === "S"
      ? ""
      : `\n        <ram:ExemptionReason>${x(f.mentionTva)}</ram:ExemptionReason>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${URN_EN16931}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${x(f.numero)}</ram:ID>
    <ram:TypeCode>${f.estAvoir ? TYPE_AVOIR : TYPE_FACTURE}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${date102(f.emiseLe)}</udt:DateTimeString>
    </ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>${x(`${v.raisonSociale} - ${v.formeJuridique} au capital de ${v.capitalSocial} - ${v.rcs}`)}</ram:Content>
      <ram:SubjectCode>ABL</ram:SubjectCode>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
${lignes}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${x(a.raisonSociale)}</ram:BuyerReference>
${partie("SellerTradeParty", {
  nom: v.raisonSociale,
  siren: v.siren,
  adresse: v.adresse,
  codePostal: v.codePostal,
  ville: v.ville,
  pays: v.pays,
  tvaIntra: v.tvaIntra,
  email: v.email,
  masquerTva: cat === "O",
})}
${partie("BuyerTradeParty", {
  nom: a.raisonSociale,
  siren: a.siren,
  adresse: a.adresse,
  codePostal: a.codePostal,
  ville: a.ville,
  province: a.province,
  pays: a.pays,
  tvaIntra: a.tvaIntra,
  masquerTva: cat === "O",
})}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${date102(f.presteeLe)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>68</ram:TypeCode>
        <ram:Information>Prélèvement en ligne</ram:Information>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${montant(f.tvaCentimes)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>${motifExoneration}
        <ram:BasisAmount>${montant(f.totalHtCentimes)}</ram:BasisAmount>
        <ram:CategoryCode>${cat}</ram:CategoryCode>${
          cat === "O"
            ? ""
            : `\n        <ram:RateApplicablePercent>${taux(f.tauxTvaBp)}</ram:RateApplicablePercent>`
        }
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Payé par prélèvement à la souscription.</ram:Description>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${montant(f.totalHtCentimes)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${montant(f.totalHtCentimes)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${montant(f.tvaCentimes)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${montant(f.totalTtcCentimes)}</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>${montant(f.totalTtcCentimes)}</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>0.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}
