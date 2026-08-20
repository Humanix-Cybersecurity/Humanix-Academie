// SPDX-License-Identifier: AGPL-3.0-or-later
// Arithmetique des montants d'une facture.
//
// DEUX REGLES, ET ELLES NE SE NEGOCIENT PAS
//
//   1. TOUT EN CENTIMES, JAMAIS DE FLOTTANT. 0.1 + 0.2 !== 0.3 en IEEE 754 ;
//      sur une facture ca donne un total qui ne tombe pas juste.
//
//   2. ON ARRONDIT UNE SEULE FOIS, PUIS ON DEDUIT. Le prix affiche et encaisse
//      est le TTC (decision du 2026-08-20 : « le prix affiche est le prix
//      paye »). On calcule donc HT = arrondi(TTC / (1 + taux)), puis
//      TVA = TTC - HT. Arrondir HT et TVA separement produirait des factures
//      ou HT + TVA != TTC d'un centime -- le genre de detail qui fait
//      recaler une facture.

/** Taux de TVA en points de base : 2000 = 20,00 %. Entier, donc exact. */
export const TVA_FR_STANDARD_BP = 2000;

/** Aucune TVA : autoliquidation UE, exportation, franchise en base. */
export const TVA_ZERO_BP = 0;

export type LigneFacture = {
  designation: string;
  quantite: number;
  /** Prix unitaire TTC en centimes. */
  prixUnitaireTtcCentimes: number;
};

export type LigneCalculee = LigneFacture & {
  totalTtcCentimes: number;
  totalHtCentimes: number;
};

export type TotauxFacture = {
  lignes: LigneCalculee[];
  totalHtCentimes: number;
  tvaCentimes: number;
  totalTtcCentimes: number;
  tauxTvaBp: number;
};

/**
 * Convertit un montant TTC en HT pour un taux donne.
 * Arrondi au centime le plus proche, moities vers le haut.
 */
export function htDepuisTtc(ttcCentimes: number, tauxBp: number): number {
  if (!Number.isInteger(ttcCentimes)) {
    throw new Error("montant TTC non entier : les centimes sont des entiers");
  }
  if (tauxBp === 0) return ttcCentimes;
  // ht = ttc / (1 + taux) = ttc * 10000 / (10000 + tauxBp)
  const numerateur = ttcCentimes * 10_000;
  const denominateur = 10_000 + tauxBp;
  // Arrondi commercial sans passer par un flottant sur la division.
  const signe = numerateur < 0 ? -1 : 1;
  return (
    signe *
    Math.floor(
      (Math.abs(numerateur) + Math.floor(denominateur / 2)) / denominateur,
    )
  );
}

/**
 * Calcule les totaux d'une facture a partir de lignes exprimees en TTC.
 *
 * Le HT est arrondi LIGNE PAR LIGNE (c'est ce qui s'affiche), le total HT est
 * leur somme, et la TVA est la difference avec le TTC. Cette construction
 * garantit que la facture tombe juste, ligne par ligne comme au total.
 */
export function calculerTotaux(
  lignes: LigneFacture[],
  tauxBp: number,
): TotauxFacture {
  if (lignes.length === 0) {
    throw new Error("une facture sans ligne n'existe pas");
  }
  if (tauxBp < 0 || !Number.isInteger(tauxBp)) {
    throw new Error(`taux de TVA invalide : ${tauxBp}`);
  }

  const calculees: LigneCalculee[] = lignes.map((l) => {
    if (!Number.isInteger(l.quantite) || l.quantite === 0) {
      throw new Error(`quantite invalide pour « ${l.designation} »`);
    }
    const totalTtc = l.prixUnitaireTtcCentimes * l.quantite;
    return {
      ...l,
      totalTtcCentimes: totalTtc,
      totalHtCentimes: htDepuisTtc(totalTtc, tauxBp),
    };
  });

  const totalTtc = calculees.reduce((n, l) => n + l.totalTtcCentimes, 0);
  const totalHt = calculees.reduce((n, l) => n + l.totalHtCentimes, 0);

  return {
    lignes: calculees,
    totalHtCentimes: totalHt,
    tvaCentimes: totalTtc - totalHt,
    totalTtcCentimes: totalTtc,
    tauxTvaBp: tauxBp,
  };
}

/**
 * Formate des centimes en euros a la francaise : 4800 -> « 48,00 € ».
 *
 * Les separateurs sont des ESPACES INSECABLES U+00A0, pas des U+202F (espace
 * fine insecable). La typographie francaise prefere U+202F, mais Helvetica --
 * la police par defaut des PDF @react-pdf/renderer -- ne l'a pas dans son
 * encodage WinAnsi : le caractere disparaitrait ou sortirait en carre sur la
 * facture. U+00A0 y est, et empeche la coupure de ligne dans un nombre.
 */
export function formaterEuros(centimes: number): string {
  const signe = centimes < 0 ? "-" : "";
  const abs = Math.abs(centimes);
  const euros = Math.floor(abs / 100);
  const cents = abs % 100;
  const eurosSepares = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  // Insecable avant le symbole aussi : « 48,00 » et « € » ne doivent
  // jamais se retrouver sur deux lignes.
  return `${signe}${eurosSepares},${String(cents).padStart(2, "0")}\u00a0€`;
}

/** Formate un taux en points de base : 2000 -> « 20 % », 550 -> « 5,5 % ». */
export function formaterTaux(tauxBp: number): string {
  const pct = tauxBp / 100;
  return `${String(pct).replace(".", ",")}\u00a0%`;
}
