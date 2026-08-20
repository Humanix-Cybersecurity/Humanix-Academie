// SPDX-License-Identifier: AGPL-3.0-or-later
// Rattrapage : facturer les paiements encaisses AVANT la mise en place de la
// facturation, ou dont l'emission a ete differee faute de coordonnees.
//
// POURQUOI CE MODULE EXISTE
//
//   La plateforme a encaisse sans emettre de facture. Ces ventes doivent etre
//   facturees : c'est une obligation, pas un rattrapage de confort.
//
// POURQUOI L'EMISSION N'EST PAS AUTOMATIQUE
//
//   Un paiement peut avoir ete REMBOURSE depuis. Le double prelevement du
//   2026-08-17 en est l'exemple : deux fois 48,00 EUR, une moitie rendue.
//   Facturer aveuglement produirait une facture pour de l'argent qui n'a pas
//   ete conserve -- il faudrait ensuite un avoir. On expose donc l'etat reel,
//   remboursement compris, et c'est un humain qui declenche.

import { db } from "@/lib/db";
import { getPayment, isMollieConfigured } from "@/lib/mollie";
import { centimesDepuisMontantMollie } from "./depuis-paiement";

export type PaiementAFacturer = {
  /** Reference Mollie du paiement (tr_xxx). */
  ref: string;
  montantTtcCentimes: number;
  /** Date d'encaissement, ou de reception du webhook a defaut. */
  encaisseLe: Date;
  /**
   * Montant deja rembourse, releve chez Mollie a l'instant. `null` quand
   * Mollie n'est pas joignable : dans ce cas on ne SAIT pas, et l'interface
   * doit le dire plutot que d'afficher « 0 ».
   */
  rembourseCentimes: number | null;
};

/**
 * Liste les paiements encaisses du tenant qui n'ont pas encore de facture.
 *
 * @param verifierRemboursements relit chaque paiement chez Mollie. Coute un
 *   appel reseau par paiement -- a n'activer que pour l'affichage, pas dans
 *   une boucle chaude.
 */
export async function paiementsAFacturer(
  tenantId: string,
  options: { verifierRemboursements?: boolean } = {},
): Promise<PaiementAFacturer[]> {
  const evenements = await db.billingEvent.findMany({
    where: { tenantId, type: "payment.paid", status: { not: "error" } },
    orderBy: { providerCreatedAt: "asc" },
    take: 200,
  });

  // Un meme paiement peut avoir plusieurs evenements (rejeux) : on deduplique
  // sur la reference du paiement, pas sur l'identifiant d'evenement.
  const parRef = new Map<string, (typeof evenements)[number]>();
  for (const e of evenements) {
    const charge = e.payload as { id?: unknown; amount?: { value?: unknown } };
    const ref = typeof charge.id === "string" ? charge.id : null;
    if (!ref) continue;
    if (!parRef.has(ref)) parRef.set(ref, e);
  }
  if (parRef.size === 0) return [];

  const dejaFactures = await db.facture.findMany({
    where: { paiementRef: { in: [...parRef.keys()] } },
    select: { paiementRef: true },
  });
  const factures = new Set(dejaFactures.map((f) => f.paiementRef));

  const resultat: PaiementAFacturer[] = [];
  for (const [ref, e] of parRef) {
    if (factures.has(ref)) continue;
    const charge = e.payload as {
      amount?: { value?: unknown };
      paidAt?: unknown;
    };
    const valeur = charge.amount?.value;
    if (typeof valeur !== "string") continue;

    let rembourse: number | null = null;
    if (options.verifierRemboursements && isMollieConfigured()) {
      try {
        const frais = await getPayment(ref);
        rembourse = frais?.amountRefunded
          ? centimesDepuisMontantMollie(frais.amountRefunded.value)
          : 0;
      } catch {
        // Mollie injoignable : on laisse null. « Inconnu » est une reponse
        // honnete, « 0 » serait un mensonge qui pousse a facturer a tort.
        rembourse = null;
      }
    }

    resultat.push({
      ref,
      montantTtcCentimes: centimesDepuisMontantMollie(valeur),
      encaisseLe:
        typeof charge.paidAt === "string"
          ? new Date(charge.paidAt)
          : e.providerCreatedAt,
      rembourseCentimes: rembourse,
    });
  }
  return resultat;
}
