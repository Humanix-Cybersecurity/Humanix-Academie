// SPDX-License-Identifier: AGPL-3.0-or-later
// Construction d'une facture a partir d'un paiement encaisse.
//
// PRINCIPE : LA FACTURE DIT CE QUI A ETE PRELEVE, PAS CE QUI AURAIT DU L'ETRE.
//
// On ne recalcule PAS le montant depuis le plan et le nombre de sieges : si la
// grille tarifaire change, ou si un prorata a ete applique, le total recalcule
// ne collerait plus a ce que le client a paye. Le montant du paiement fait foi,
// et il devient une ligne unique dont le libelle decrit l'abonnement.

import type { LigneFacture } from "./montants";

/**
 * Convertit un montant Mollie (« 48.00 ») en centimes.
 *
 * Par decoupage de la chaine, PAS par parseFloat * 100 : en IEEE 754,
 * `parseFloat("1.15") * 100` vaut 114.99999999999999, et Math.round le
 * rattrape ici mais pas partout. Sur de l'argent on ne joue pas avec ca.
 */
export function centimesDepuisMontantMollie(valeur: string): number {
  const v = valeur.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(v)) {
    throw new Error(`montant Mollie illisible : « ${valeur} »`);
  }
  const negatif = v.startsWith("-");
  const [entier, decimales = ""] = v.replace("-", "").split(".");
  const cents = Number(entier) * 100 + Number(decimales.padEnd(2, "0"));
  return negatif ? -cents : cents;
}

/** Libelle francais d'un plan. */
function libellePlan(plan: string): string {
  const connus: Record<string, string> = {
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
  };
  return connus[plan] ?? plan;
}

export function ligneAbonnement(params: {
  plan: string;
  seatCount?: number | null;
  montantTtcCentimes: number;
  /** Date de la prestation, pour situer la periode dans le libelle. */
  presteeLe: Date;
}): LigneFacture[] {
  const mois = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(params.presteeLe);

  const sieges =
    params.seatCount && params.seatCount > 0
      ? `, ${params.seatCount} siège${params.seatCount > 1 ? "s" : ""}`
      : "";

  return [
    {
      designation: `Humanix Académie - abonnement ${libellePlan(params.plan)}${sieges} - ${mois}`,
      quantite: 1,
      prixUnitaireTtcCentimes: params.montantTtcCentimes,
    },
  ];
}
