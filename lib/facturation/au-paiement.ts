// SPDX-License-Identifier: AGPL-3.0-or-later
// Emission de la facture declenchee par un paiement encaisse.
//
// REGLE ABSOLUE : CETTE FONCTION NE LEVE JAMAIS.
//
//   Elle est appelee depuis le webhook Mollie. Si elle levait, le webhook
//   repondrait en erreur, Mollie rejouerait -- et le rejeu repasserait par le
//   provisionnement du tenant. Un probleme de facturation ne doit pas mettre
//   en danger l'encaissement ni l'acces du client.
//
//   Une facture non emise se rattrape depuis la console. Un webhook en boucle
//   de rejeu, beaucoup moins.

import { emettreFacture, EmissionImpossible } from "./emettre";
import {
  centimesDepuisMontantMollie,
  ligneAbonnement,
} from "./depuis-paiement";
import { db } from "@/lib/db";

export type ResultatFacturation =
  | { etat: "emise"; numero: string }
  | { etat: "differee"; motif: string }
  | { etat: "erreur"; motif: string };

export async function facturerPaiement(params: {
  tenantId: string;
  paiementRef: string;
  montantValeur: string;
  presteeLe: Date;
}): Promise<ResultatFacturation> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: params.tenantId },
      select: { plan: true, seatCount: true },
    });
    if (!tenant) return { etat: "erreur", motif: "tenant introuvable" };

    const facture = await emettreFacture({
      tenantId: params.tenantId,
      paiementRef: params.paiementRef,
      presteeLe: params.presteeLe,
      lignes: ligneAbonnement({
        plan: tenant.plan,
        seatCount: tenant.seatCount,
        montantTtcCentimes: centimesDepuisMontantMollie(params.montantValeur),
        presteeLe: params.presteeLe,
      }),
    });
    return { etat: "emise", numero: facture.numero };
  } catch (e) {
    // Absence d'identite de facturation : ce n'est pas une panne, c'est un
    // formulaire que le client n'a pas encore rempli. On le dit tel quel, et
    // la console proposera d'emettre une fois l'adresse connue.
    if (e instanceof EmissionImpossible) {
      return { etat: "differee", motif: e.motif };
    }
    return {
      etat: "erreur",
      motif: e instanceof Error ? e.message : String(e),
    };
  }
}
