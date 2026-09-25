// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Facturation mensuelle d'un revendeur : releve des espaces clients, calcul
// par la grille, emission par le moteur commun (numerotation, immutabilite,
// Factur-X), notification aux admins du revendeur.
//
// UNE FACTURE PAR REVENDEUR ET PAR MOIS. L'unicite passe par `paiementRef`,
// la cle idempotente du moteur, avec une reference synthetique
// `revendeur:<tenant>:<AAAA-MM>` : rejouer l'action renvoie la facture
// existante au lieu d'en creer une seconde.
//
// UTILISATEUR ACTIF = un User isActive de l'espace client, quel que soit son
// role. Les collaborateurs du revendeur lui-meme ne sont pas comptes : ils
// sont dans la licence.

import { db } from "@/lib/db";
import { emettreFacture, EmissionImpossible } from "@/lib/facturation/emettre";
import { determinerRegime } from "@/lib/facturation/regime-tva";
import { notifierFactureEmise } from "@/lib/facturation/notification";
import {
  calculerRevendeur,
  ttcDepuisHt,
  type CalculRevendeur,
  type EspaceFacturable,
} from "./tarification";

export type Periode = { annee: number; mois: number }; // mois 1-12

export function periodeCourante(maintenant = new Date()): Periode {
  return {
    annee: maintenant.getUTCFullYear(),
    mois: maintenant.getUTCMonth() + 1,
  };
}

export function libellePeriode(p: Periode): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(p.annee, p.mois - 1, 1)));
}

/** Dernier jour du mois, en UTC : c'est la date de prestation facturee. */
export function finDePeriode(p: Periode): Date {
  return new Date(Date.UTC(p.annee, p.mois, 0));
}

export function referenceFactureRevendeur(tenantId: string, p: Periode) {
  return `revendeur:${tenantId}:${p.annee}-${String(p.mois).padStart(2, "0")}`;
}

export async function espacesDuRevendeur(
  tenantId: string,
): Promise<EspaceFacturable[]> {
  const enfants = await db.tenant.findMany({
    where: { parentTenantId: tenantId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      name: true,
      _count: { select: { users: { where: { isActive: true } } } },
    },
  });
  return enfants.map((e) => ({
    nom: e.name,
    utilisateursActifs: e._count.users,
  }));
}

export async function usageRevendeur(
  tenantId: string,
  periode: Periode = periodeCourante(),
): Promise<{ periode: Periode; calcul: CalculRevendeur }> {
  const espaces = await espacesDuRevendeur(tenantId);
  return {
    periode,
    calcul: calculerRevendeur(espaces, { periode: libellePeriode(periode) }),
  };
}

export type ResultatFacturationRevendeur =
  | {
      etat: "emise";
      factureId: string;
      numero: string;
      totalTtcCentimes: number;
      notification: string;
    }
  | { etat: "deja_emise"; numero: string }
  | { etat: "refusee"; motif: string };

export async function facturerRevendeur(params: {
  tenantId: string;
  periode?: Periode;
}): Promise<ResultatFacturationRevendeur> {
  const periode = params.periode ?? periodeCourante();
  const ref = referenceFactureRevendeur(params.tenantId, periode);

  const existante = await db.facture.findUnique({
    where: { paiementRef: ref },
    select: { numero: true },
  });
  if (existante) return { etat: "deja_emise", numero: existante.numero };

  const tenant = await db.tenant.findUnique({
    where: { id: params.tenantId },
    select: { isReseller: true },
  });
  if (!tenant?.isReseller) return { etat: "refusee", motif: "pas_revendeur" };

  const identite = await db.identiteFacturation.findUnique({
    where: { tenantId: params.tenantId },
    select: { pays: true, tvaIntra: true, tvaIntraStatut: true },
  });
  if (!identite) {
    return { etat: "refusee", motif: "identite_facturation_absente" };
  }
  const regime = determinerRegime({
    pays: identite.pays,
    tvaIntra: identite.tvaIntra,
    tvaIntraVerifie: identite.tvaIntraStatut === "valide",
  });

  const { calcul } = await usageRevendeur(params.tenantId, periode);
  const lignes = calcul.lignes.map((l) => ({
    designation: l.designation,
    quantite: l.quantite,
    prixUnitaireTtcCentimes: ttcDepuisHt(
      l.prixUnitaireHtCentimes,
      regime.tauxBp,
    ),
  }));

  try {
    const facture = await emettreFacture({
      tenantId: params.tenantId,
      paiementRef: ref,
      presteeLe: finDePeriode(periode),
      lignes,
    });
    const notif = await notifierFactureEmise({
      tenantId: params.tenantId,
      factureId: facture.id,
      numero: facture.numero,
      emiseLe: facture.emiseLe,
      totalTtcCentimes: facture.totalTtcCentimes,
    });
    return {
      etat: "emise",
      factureId: facture.id,
      numero: facture.numero,
      totalTtcCentimes: facture.totalTtcCentimes,
      notification: notif.etat,
    };
  } catch (e) {
    if (e instanceof EmissionImpossible) {
      return { etat: "refusee", motif: e.motif };
    }
    console.error("[facturation-revendeur] emission echouee", e);
    return { etat: "refusee", motif: "erreur_inattendue" };
  }
}
