// SPDX-License-Identifier: AGPL-3.0-or-later
// Coordonnees de facturation saisies au checkout, en attente du tenant.
//
// LE PROBLEME QUE CA RESOUT
//
//   Au moment ou le client remplit ses coordonnees, le tenant n'existe pas
//   encore : il sera cree par le webhook, apres l'encaissement. Il faut donc
//   garder ces donnees entre les deux, sans quoi la premiere facture serait
//   emise sans adresse -- donc pas emise du tout.
//
//   La cle est l'identifiant du client chez Mollie : c'est la seule chose que
//   le webhook connaisse avant l'existence du tenant.

import { db } from "@/lib/db";
import type { Coordonnees } from "./coordonnees";
import { verifierTvaIntra } from "./vies";

/**
 * Budget VIES au checkout : court.
 *
 * On est dans le tunnel de paiement. Mieux vaut un statut « inconnu » -- qui
 * fait appliquer la TVA francaise, le choix prudent -- qu'un client qui attend
 * huit secondes devant un ecran de paiement. L'admin pourra relancer la
 * verification depuis la console.
 */
const DELAI_VIES_CHECKOUT_MS = 2500;

export async function memoriserCoordonnees(params: {
  paymentCustomerId: string;
  coordonnees: Coordonnees;
}): Promise<void> {
  const c = params.coordonnees;

  let tvaIntraStatut: string | null = null;
  let tvaIntraNom: string | null = null;
  if (c.tvaIntra) {
    const r = await verifierTvaIntra(c.tvaIntra, {
      delaiMs: DELAI_VIES_CHECKOUT_MS,
    });
    tvaIntraStatut = r.statut;
    if (r.statut === "valide") tvaIntraNom = r.nom;
  }

  const donnees = { ...c, tvaIntraStatut, tvaIntraNom };
  // Upsert : un client qui recommence son checkout ecrase sa saisie
  // precedente au lieu de faire echouer le paiement sur une cle dupliquee.
  await db.identiteFacturationEnAttente.upsert({
    where: { paymentCustomerId: params.paymentCustomerId },
    create: { paymentCustomerId: params.paymentCustomerId, ...donnees },
    update: donnees,
  });
}

/**
 * Transfere les coordonnees en attente vers le tenant qui vient d'etre cree.
 *
 * Ne leve JAMAIS : appelee depuis le webhook. Un probleme ici ne doit pas
 * faire rejouer le provisionnement -- l'admin peut toujours saisir ses
 * coordonnees depuis la console.
 *
 * @returns true si des coordonnees ont ete reprises.
 */
export async function reprendreCoordonnees(params: {
  tenantId: string;
  paymentCustomerId: string | null;
}): Promise<boolean> {
  if (!params.paymentCustomerId) return false;
  try {
    const attente = await db.identiteFacturationEnAttente.findUnique({
      where: { paymentCustomerId: params.paymentCustomerId },
    });
    if (!attente) return false;

    const donnees = {
      raisonSociale: attente.raisonSociale,
      adresse: attente.adresse,
      codePostal: attente.codePostal,
      ville: attente.ville,
      pays: attente.pays,
      siren: attente.siren,
      tvaIntra: attente.tvaIntra,
      tvaIntraStatut: attente.tvaIntraStatut,
      tvaIntraNom: attente.tvaIntraNom,
      tvaIntraVerifieLe: attente.tvaIntraStatut ? attente.createdAt : null,
    };
    await db.identiteFacturation.upsert({
      where: { tenantId: params.tenantId },
      create: { tenantId: params.tenantId, ...donnees },
      update: donnees,
    });
    // La ligne d'attente a fait son office : elle ne doit pas survivre, elle
    // contient l'adresse d'un client.
    await db.identiteFacturationEnAttente.delete({
      where: { paymentCustomerId: params.paymentCustomerId },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Supprime les saisies de paniers abandonnes.
 *
 * Un checkout commence puis abandonne laisse une adresse d'entreprise en base,
 * rattachee a aucun client. On ne les garde pas.
 */
export async function purgerCoordonneesAbandonnees(
  avantJours = 30,
): Promise<number> {
  const limite = new Date(Date.now() - avantJours * 24 * 3600 * 1000);
  const r = await db.identiteFacturationEnAttente.deleteMany({
    where: { createdAt: { lt: limite } },
  });
  return r.count;
}
