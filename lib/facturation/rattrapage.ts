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

/**
 * Ce que la console doit montrer AVANT qu'on clique, et apres.
 *
 * POURQUOI CETTE FONCTION EXISTE
 *
 *   Le bouton de relance ne rendait qu'un bandeau transitoire. Une fois
 *   celui-ci disparu, plus rien ne disait si une relance etait deja partie,
 *   ni quand, ni combien. On ne pouvait donc pas distinguer « je viens de
 *   l'envoyer » de « elle est partie hier », et rien n'empechait d'en
 *   expedier une troisieme au meme client.
 */
export type EtatFacturationTenant = {
  paiementsEnAttente: number;
  totalTtcCentimes: number;
  /** Sans elles, aucune facture ne peut etre emise. */
  coordonneesPresentes: boolean;
  /** Nombre de factures deja emises pour ce tenant. */
  facturesEmises: number;
  /** Relances effectivement PARTIES (les echecs ne comptent pas). */
  nombreRelances: number;
  derniereRelance: { le: Date; destinataires: number | null } | null;
};

export async function etatFacturationTenant(
  tenantId: string,
): Promise<EtatFacturationTenant> {
  const [candidats, identite, facturesEmises, relances] = await Promise.all([
    paiementsAFacturer(tenantId),
    db.identiteFacturation.findUnique({
      where: { tenantId },
      select: { tenantId: true },
    }),
    db.facture.count({ where: { tenantId } }),
    db.auditLog.findMany({
      where: { tenantId, targetType: "relance-facturation" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, outcome: true, metadata: true },
      take: 50,
    }),
  ]);

  // Un envoi refuse (messagerie absente, aucun ADMIN) laisse une trace, mais
  // ce n'est pas une relance : l'afficher comme telle ferait croire que le
  // client a ete prevenu.
  const parties = relances.filter((r) => r.outcome === "SUCCESS");
  const derniere = parties[0] ?? null;
  const meta = (derniere?.metadata ?? null) as {
    destinataires?: unknown;
  } | null;

  return {
    paiementsEnAttente: candidats.length,
    totalTtcCentimes: candidats.reduce((s, p) => s + p.montantTtcCentimes, 0),
    coordonneesPresentes: Boolean(identite),
    facturesEmises,
    nombreRelances: parties.length,
    derniereRelance: derniere
      ? {
          le: derniere.createdAt,
          destinataires:
            typeof meta?.destinataires === "number" ? meta.destinataires : null,
        }
      : null,
  };
}
