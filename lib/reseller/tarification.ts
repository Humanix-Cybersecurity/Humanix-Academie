// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Grille tarifaire REVENDEUR (decision du 2026-09-25) et son arithmetique.
//
// LE MODELE
//   Deux couches, facturees ensemble chaque mois au revendeur :
//   1. une licence fixe, qui couvre la part d'infrastructure et un socle de
//      support, et qui inclut les propres collaborateurs du revendeur ;
//   2. les utilisateurs actifs cumules de ses espaces clients, par tranches
//      PROGRESSIVES comme un bareme d'impot : le tarif d'une tranche ne
//      s'applique qu'aux utilisateurs qui y tombent. Le montant ne baisse
//      donc jamais quand le volume monte.
//   Chaque espace client compte au minimum un plancher d'utilisateurs, dans la
//   meme unite que le reste, pour qu'un espace de trois personnes ne coute pas
//   plus en support qu'il ne rapporte.
//
// POURQUOI DES PALIERS
//   L'hebergement est un cout fixe et tres sous-utilise ; il ne grandit que
//   par seuils (machine plus grosse, seconde machine, base geree). Le support,
//   lui, grandit avec chaque espace client. Les tranches hautes financent les
//   seuils materiels, la licence et le plancher financent le support.
//
// TOUT EN CENTIMES HT. La TVA depend de l'acheteur et se calcule a l'emission
// (cf. lib/facturation/regime-tva.ts) : ce module n'en sait rien, sauf pour
// convertir un prix HT en prix TTC de ligne quand la facture l'exige.

export type TrancheTarif = {
  /** Borne haute incluse de la tranche, Infinity pour la derniere. */
  jusqua: number;
  /** Prix HT par utilisateur actif et par mois, en centimes. */
  prixHtCentimes: number;
};

export const GRILLE_REVENDEUR = {
  /** Licence mensuelle fixe, HT. */
  licenceMensuelleHtCentimes: 4000,
  /** Plancher facture par espace client, en utilisateurs. */
  minimumUtilisateursParEspace: 8,
  tranches: [
    { jusqua: 100, prixHtCentimes: 180 },
    { jusqua: 500, prixHtCentimes: 150 },
    { jusqua: 2000, prixHtCentimes: 120 },
    { jusqua: Infinity, prixHtCentimes: 90 },
  ] as readonly TrancheTarif[],
  /** Validite d'un devis, en jours. */
  validiteDevisJours: 30,
} as const;

export type EspaceFacturable = {
  nom: string;
  utilisateursActifs: number;
};

export type EspaceCalcule = EspaceFacturable & {
  /** max(actifs, plancher) */
  utilisateursFactures: number;
};

export type LigneTarif = {
  designation: string;
  quantite: number;
  prixUnitaireHtCentimes: number;
  totalHtCentimes: number;
};

export type CalculRevendeur = {
  espaces: EspaceCalcule[];
  utilisateursFacturables: number;
  lignes: LigneTarif[];
  totalHtCentimes: number;
  /** Total divise par les utilisateurs factures, null sans utilisateur. */
  prixMoyenParUtilisateurCentimes: number | null;
};

export function libelleTranche(t: TrancheTarif, precedente: number): string {
  return t.jusqua === Infinity
    ? `au-delà de ${precedente}`
    : `${precedente + 1} à ${t.jusqua}`;
}

/** Repartit n utilisateurs sur les tranches progressives. */
export function decouperEnTranches(
  n: number,
): { tranche: TrancheTarif; depuis: number; quantite: number }[] {
  const out: { tranche: TrancheTarif; depuis: number; quantite: number }[] = [];
  let restant = Math.max(0, Math.floor(n));
  let depuis = 0;
  for (const tranche of GRILLE_REVENDEUR.tranches) {
    if (restant <= 0) break;
    const largeur = tranche.jusqua - depuis;
    const quantite = Math.min(restant, largeur);
    out.push({ tranche, depuis, quantite });
    restant -= quantite;
    depuis = tranche.jusqua;
  }
  return out;
}

export function calculerRevendeur(
  espaces: EspaceFacturable[],
  options: { periode?: string } = {},
): CalculRevendeur {
  const suffixe = options.periode ? ` (${options.periode})` : "";
  const calcules: EspaceCalcule[] = espaces.map((e) => ({
    ...e,
    utilisateursActifs: Math.max(0, Math.floor(e.utilisateursActifs)),
    utilisateursFactures: Math.max(
      Math.max(0, Math.floor(e.utilisateursActifs)),
      GRILLE_REVENDEUR.minimumUtilisateursParEspace,
    ),
  }));
  const utilisateursFacturables = calcules.reduce(
    (s, e) => s + e.utilisateursFactures,
    0,
  );
  const lignes: LigneTarif[] = [
    {
      designation: `Licence revendeur${suffixe}`,
      quantite: 1,
      prixUnitaireHtCentimes: GRILLE_REVENDEUR.licenceMensuelleHtCentimes,
      totalHtCentimes: GRILLE_REVENDEUR.licenceMensuelleHtCentimes,
    },
  ];
  for (const { tranche, depuis, quantite } of decouperEnTranches(
    utilisateursFacturables,
  )) {
    lignes.push({
      designation: `Utilisateurs actifs, tranche ${libelleTranche(tranche, depuis)}${suffixe}`,
      quantite,
      prixUnitaireHtCentimes: tranche.prixHtCentimes,
      totalHtCentimes: quantite * tranche.prixHtCentimes,
    });
  }
  const totalHtCentimes = lignes.reduce((s, l) => s + l.totalHtCentimes, 0);
  return {
    espaces: calcules,
    utilisateursFacturables,
    lignes,
    totalHtCentimes,
    prixMoyenParUtilisateurCentimes:
      utilisateursFacturables > 0
        ? Math.round(totalHtCentimes / utilisateursFacturables)
        : null,
  };
}

/** Simulation pour un devis : n espaces clients de taille identique. */
export function simulerRevendeur(hypothese: {
  nbEspaces: number;
  utilisateursParEspace: number;
}): CalculRevendeur {
  const nb = Math.max(0, Math.floor(hypothese.nbEspaces));
  const taille = Math.max(0, Math.floor(hypothese.utilisateursParEspace));
  return calculerRevendeur(
    Array.from({ length: nb }, (_, i) => ({
      nom: `Espace client n°${i + 1}`,
      utilisateursActifs: taille,
    })),
  );
}

/**
 * Prix TTC d'une ligne a partir du HT, pour un taux en points de base.
 * Le moteur de facturation travaille en TTC et en deduit le HT
 * (cf. lib/facturation/montants.ts) : pour nos prix et le taux francais,
 * l'aller-retour est exact au centime (180 -> 216 -> 180).
 */
export function ttcDepuisHt(htCentimes: number, tauxBp: number): number {
  return Math.round((htCentimes * (10000 + tauxBp)) / 10000);
}
