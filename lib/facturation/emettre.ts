// SPDX-License-Identifier: AGPL-3.0-or-later
// Emission d'une facture.
//
// UNE FACTURE EMISE NE SE MODIFIE PLUS. Tout ce qui la compose -- identite du
// vendeur, identite de l'acheteur, lignes, montants, taux, mentions -- est
// FIGE ici dans des colonnes Json. On ne relit jamais Tenant ni VENDEUR pour
// afficher une facture : sinon changer une raison sociale reecrirait le passe.
//
// Corriger une facture = emettre un AVOIR, jamais toucher a l'originale.

import { db } from "@/lib/db";
import { VENDEUR } from "./vendeur";
import { calculerTotaux, type LigneFacture } from "./montants";
import { determinerRegime } from "./regime-tva";
import { allouerNumero } from "./numerotation";

/** Motifs de refus d'emission. Explicites : ils s'affichent a l'admin. */
export type RefusEmission =
  "identite_facturation_absente" | "deja_emise" | "aucune_ligne";

export class EmissionImpossible extends Error {
  constructor(readonly motif: RefusEmission) {
    super(motif);
    this.name = "EmissionImpossible";
  }
}

export type DemandeEmission = {
  tenantId: string;
  /** Reference du paiement d'origine (ex. Mollie `tr_xxx`). Garantit l'unicite. */
  paiementRef?: string | null;
  /** Date de la prestation facturee. */
  presteeLe: Date;
  lignes: LigneFacture[];
  /** Date d'emission. Injectable pour les tests ; sinon maintenant. */
  emiseLe?: Date;
};

/**
 * Emet une facture pour un tenant.
 *
 * Refuse si l'identite de facturation du client est absente : une facture sans
 * adresse ni denomination de l'acheteur n'est pas conforme (article 242 nonies
 * A de l'annexe II au CGI), et on ne devine pas une adresse.
 *
 * Idempotent sur `paiementRef` : rejouer le webhook d'un paiement deja facture
 * renvoie la facture existante au lieu d'en creer une seconde.
 */
export async function emettreFacture(demande: DemandeEmission) {
  if (demande.lignes.length === 0) {
    throw new EmissionImpossible("aucune_ligne");
  }

  // Idempotence AVANT la transaction : le cas nominal du rejeu n'a pas besoin
  // d'ouvrir de transaction ni de toucher au compteur.
  if (demande.paiementRef) {
    const existante = await db.facture.findUnique({
      where: { paiementRef: demande.paiementRef },
    });
    if (existante) return existante;
  }

  const identite = await db.identiteFacturation.findUnique({
    where: { tenantId: demande.tenantId },
  });
  if (!identite) {
    throw new EmissionImpossible("identite_facturation_absente");
  }

  const regime = determinerRegime({
    pays: identite.pays,
    tvaIntra: identite.tvaIntra,
  });
  const totaux = calculerTotaux(demande.lignes, regime.tauxBp);
  const emiseLe = demande.emiseLe ?? new Date();

  return db.$transaction(async (tx) => {
    // Le numero est alloue DANS la transaction : si l'insert echoue, il est
    // rendu et la numerotation reste sans trou.
    const numero = await allouerNumero(tx, emiseLe.getUTCFullYear());

    return tx.facture.create({
      data: {
        numero,
        tenantId: demande.tenantId,
        emiseLe,
        presteeLe: demande.presteeLe,
        paiementRef: demande.paiementRef ?? null,
        // --- snapshot immuable ---
        vendeur: { ...VENDEUR },
        acheteur: {
          raisonSociale: identite.raisonSociale,
          adresse: identite.adresse,
          codePostal: identite.codePostal,
          ville: identite.ville,
          pays: identite.pays,
          siren: identite.siren,
          tvaIntra: identite.tvaIntra,
        },
        lignes: totaux.lignes,
        totalHtCentimes: totaux.totalHtCentimes,
        tvaCentimes: totaux.tvaCentimes,
        totalTtcCentimes: totaux.totalTtcCentimes,
        tauxTvaBp: totaux.tauxTvaBp,
        mentionTva: regime.mention,
      },
    });
  });
}
