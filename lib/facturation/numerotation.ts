// SPDX-License-Identifier: AGPL-3.0-or-later
// Allocation du numero de facture.
//
// POURQUOI PAS UNE SEQUENCE POSTGRES
//
//   Une SEQUENCE n'est pas transactionnelle : nextval() consomme le numero
//   MEME si la transaction echoue ensuite. Sur des factures, ca laisse un trou
//   definitif dans une numerotation que la loi veut continue.
//
//   Une ligne de table, elle, est transactionnelle. INSERT ... ON CONFLICT DO
//   UPDATE ... RETURNING est atomique : le verrou de ligne serialise deux
//   emissions concurrentes, et un rollback REND le numero.
//
// A APPELER DANS LA MEME TRANSACTION QUE L'INSERT DE LA FACTURE. Hors
// transaction, le numero serait consomme sans facture en face.

import type { Prisma } from "@prisma/client";

type Transaction = Prisma.TransactionClient;

/** Formate un numero : annee 2026, rang 7 -> « FA-2026-0007 ». */
export function formaterNumero(annee: number, rang: number): string {
  return `FA-${annee}-${String(rang).padStart(4, "0")}`;
}

/**
 * Alloue le prochain numero de l'annee, DANS la transaction fournie.
 *
 * @param tx    client de transaction Prisma (obligatoire, cf. en-tete)
 * @param annee annee civile d'emission
 */
export async function allouerNumero(
  tx: Transaction,
  annee: number,
): Promise<string> {
  if (!Number.isInteger(annee) || annee < 2000 || annee > 3000) {
    throw new Error(`annee de facturation invalide : ${annee}`);
  }
  const lignes = await tx.$queryRaw<{ dernier: number }[]>`
    INSERT INTO "CompteurFacture" ("annee", "dernier")
    VALUES (${annee}, 1)
    ON CONFLICT ("annee")
      DO UPDATE SET "dernier" = "CompteurFacture"."dernier" + 1
    RETURNING "dernier"
  `;
  const rang = lignes[0]?.dernier;
  if (!rang) {
    throw new Error("allocation du numero de facture impossible");
  }
  return formaterNumero(annee, rang);
}
