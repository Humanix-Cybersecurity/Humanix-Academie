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
  /**
   * Le numero a-t-il ete VERIFIE aupres de VIES (statut « valide ») ?
   *
   * La forme ne suffit pas : « BE0000000000 » est bien forme et n'existe pas.
   * Sans verification positive, l'autoliquidation n'est pas justifiable et la
   * TVA francaise s'applique.
   */
  tvaIntraVerifie?: boolean;
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
 * Ce n'est PAS une validation VIES, et la forme ne suffit JAMAIS a accorder
 * l'autoliquidation : « BE0000000000 » est bien forme et n'existe pas. Ce
 * controle sert uniquement a rejeter une saisie manifestement erronee avant
 * d'appeler VIES (cf. lib/facturation/vies.ts).
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

  // 2. Autre Etat membre, numero bien forme ET VERIFIE aupres de VIES :
  //    autoliquidation.
  if (
    UE_HORS_FRANCE.has(pays) &&
    tva &&
    formeTvaIntraPlausible(tva) &&
    acheteur.tvaIntraVerifie === true
  ) {
    return {
      tauxBp: TVA_ZERO_BP,
      mention:
        "Autoliquidation - article 283-2 du CGI. TVA due par le preneur.",
      exigeVerificationVies: false,
    };
  }

  // 3. Numero bien forme mais PAS verifie : TVA francaise.
  //    « BE0000000000 » passe le controle de forme et n'existe pas. Accorder
  //    l'exoneration sur la seule forme, ce serait offrir 0 % de TVA a qui
  //    sait inventer un numero plausible.
  if (UE_HORS_FRANCE.has(pays) && tva && formeTvaIntraPlausible(tva)) {
    return {
      tauxBp: TVA_FR_STANDARD_BP,
      mention:
        "TVA française 20 % - numéro de TVA intracommunautaire non vérifié",
      exigeVerificationVies: true,
    };
  }

  // 4. Autre Etat membre SANS numero exploitable : on ne devine pas.
  //    Sans numero valide, l'autoliquidation n'est pas justifiable : TVA due.
  if (UE_HORS_FRANCE.has(pays)) {
    return {
      tauxBp: TVA_FR_STANDARD_BP,
      mention:
        "TVA française 20 % - numéro de TVA intracommunautaire non fourni",
      exigeVerificationVies: false,
    };
  }

  // 5. Hors UE : prestation de services B2B hors champ de la TVA francaise.
  return {
    tauxBp: TVA_ZERO_BP,
    mention: "TVA non applicable - prestation hors champ, article 259-1 du CGI",
    exigeVerificationVies: false,
  };
}
