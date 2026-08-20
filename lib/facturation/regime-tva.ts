// SPDX-License-Identifier: AGPL-3.0-or-later
// Determination du regime de TVA applicable a une facture.
//
// PRINCIPE : ON NE PRESUME JAMAIS L'EXONERATION.
//
// Le defaut est la TVA francaise a 20 %. On ne descend a 0 % que sur une
// justification POSITIVE et verifiable, qui sera imprimee sur la facture :
// numero de TVA intracommunautaire pour l'autoliquidation UE, ou etablissement
// hors UE. En cas de doute, on facture la TVA -- se tromper dans ce sens coute
// une regularisation, se tromper dans l'autre coute un redressement.
//
// AVERTISSEMENT : ce module encode une regle simple pour de la prestation de
// services B2B. Il ne couvre ni le B2C, ni les cas particuliers (DOM, Monaco,
// operations mixtes). Ces cas doivent passer par une facturation manuelle.

import { TVA_FR_STANDARD_BP, TVA_ZERO_BP } from "./montants";

/** Etats membres de l'UE (codes ISO 3166-1 alpha-2), hors France. */
const UE_HORS_FRANCE = new Set([
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

export type RegimeTva = {
  tauxBp: number;
  /** Mention imprimee sur la facture. Jamais vide. */
  mention: string;
};

export type AcheteurPourRegime = {
  pays: string;
  tvaIntra?: string | null;
};

/**
 * Nettoie un numero de TVA intracommunautaire pour comparaison :
 * « FR 80 103 901 799 » -> « FR80103901799 ».
 */
export function normaliserTvaIntra(v: string): string {
  return v.replace(/[\s.\-]/g, "").toUpperCase();
}

/**
 * Verifie la FORME d'un numero de TVA intracommunautaire.
 *
 * Ce n'est PAS une validation VIES : seul VIES dit si un numero est actif, et
 * l'autoliquidation exige un numero valide AU MOMENT de l'operation. Tant que
 * l'appel VIES n'est pas branche, un numero bien forme reste une declaration
 * du client -- d'ou l'avertissement porte par `exigeVerificationVies`.
 */
export function formeTvaIntraPlausible(v: string): boolean {
  const n = normaliserTvaIntra(v);
  // 2 lettres de pays + 2 a 13 caracteres alphanumeriques.
  return /^[A-Z]{2}[0-9A-Z]{2,13}$/.test(n);
}

export function determinerRegime(acheteur: AcheteurPourRegime): RegimeTva & {
  exigeVerificationVies: boolean;
} {
  const pays = (acheteur.pays || "FR").toUpperCase();
  const tva = acheteur.tvaIntra?.trim();

  // 1. France : TVA francaise, sans exception ici.
  if (pays === "FR") {
    return {
      tauxBp: TVA_FR_STANDARD_BP,
      mention: "TVA française 20 %",
      exigeVerificationVies: false,
    };
  }

  // 2. Autre Etat membre AVEC numero de TVA plausible : autoliquidation.
  if (UE_HORS_FRANCE.has(pays) && tva && formeTvaIntraPlausible(tva)) {
    return {
      tauxBp: TVA_ZERO_BP,
      mention:
        "Autoliquidation - article 283-2 du CGI. TVA due par le preneur.",
      exigeVerificationVies: true,
    };
  }

  // 3. Autre Etat membre SANS numero exploitable : on ne devine pas.
  //    Sans numero valide, l'autoliquidation n'est pas justifiable : TVA due.
  if (UE_HORS_FRANCE.has(pays)) {
    return {
      tauxBp: TVA_FR_STANDARD_BP,
      mention:
        "TVA française 20 % - numéro de TVA intracommunautaire non fourni",
      exigeVerificationVies: false,
    };
  }

  // 4. Hors UE : prestation de services B2B hors champ de la TVA francaise.
  return {
    tauxBp: TVA_ZERO_BP,
    mention: "TVA non applicable - prestation hors champ, article 259-1 du CGI",
    exigeVerificationVies: false,
  };
}
