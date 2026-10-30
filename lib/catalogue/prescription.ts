// SPDX-License-Identifier: AGPL-3.0-or-later
// Prescription des saisons par groupe : la regle, ecrite une seule fois.
//
// CE QUE DIT LA REGLE (decision du 2026-10-30 : prescrite, pas dediee)
//
//   Une saison affectee a un ou plusieurs groupes de l'espace
//   (TenantSaisonGroupe) est PRESCRITE aux membres de ces groupes :
//   - elle leur est mise en avant sur /apprendre ;
//   - si l'espace l'a rendue obligatoire, elle ne l'est QUE pour eux :
//     parcours d'arrivee, relances, score de risque.
//   Elle reste consultable par tout le monde. Une saison sans affectation
//   s'adresse a tout l'espace, exactement comme avant cette table.
//
// QUI PASSE PAR ICI
//
//   app/apprendre/page.tsx            mise en avant et obligatoire par personne
//   lib/onboarding/auto-assign.ts     parcours d'arrivee
//   lib/notifications-mandatory.ts    relances d'obligatoire
//   lib/risk-score.ts                 obligatoires comptees dans le score
//   app/api/v1/saisons/route.ts       exposition des groupes vises
//
//   Les fonctions pures ne touchent pas la base : elles se testent sans
//   mock et s'appellent en map() sur des listes deja chargees. Les deux
//   chargeurs du bas font les deux requetes necessaires.

import { db } from "@/lib/db";

/** Une ligne de TenantSaisonGroupe, reduite a ce qui sert ici. */
export type AffectationSaisonGroupe = { saisonId: string; groupId: string };

export type EtatPrescription = {
  /** La saison a au moins un groupe affecte dans l'espace. */
  ciblee: boolean;
  /** La personne fait partie du public vise. Toujours vrai si non ciblee. */
  prescrite: boolean;
  /** Obligatoire POUR CETTE PERSONNE : obligatoire dans l'espace ET prescrite. */
  obligatoire: boolean;
};

export type ContextePrescription = {
  affectations: AffectationSaisonGroupe[];
  groupesUtilisateur: Set<string>;
};

/** Regroupe les affectations par saison : saisonId -> groupIds. */
export function groupesParSaison(
  affectations: AffectationSaisonGroupe[],
): Map<string, string[]> {
  const parSaison = new Map<string, string[]>();
  for (const a of affectations) {
    const liste = parSaison.get(a.saisonId) ?? [];
    liste.push(a.groupId);
    parSaison.set(a.saisonId, liste);
  }
  return parSaison;
}

/**
 * Etat d'une saison pour une personne, a partir de ce que l'espace a decide.
 *
 * `groupesSaison` : les groupes affectes a la saison (vide = tout l'espace).
 * `groupesUtilisateur` : les groupes de la personne (ids).
 */
export function etatPrescription(input: {
  isMandatory: boolean;
  groupesSaison: readonly string[];
  groupesUtilisateur: ReadonlySet<string>;
}): EtatPrescription {
  const ciblee = input.groupesSaison.length > 0;
  const prescrite =
    !ciblee || input.groupesSaison.some((g) => input.groupesUtilisateur.has(g));
  return { ciblee, prescrite, obligatoire: input.isMandatory && prescrite };
}

/**
 * Ne garde que les elements dont la saison est prescrite a la personne.
 * Sert aux lecteurs qui partent d'une liste de saisons obligatoires :
 * une saison ciblee sur d'autres groupes que les siens en sort.
 */
export function filtrerSaisonsPrescrites<T extends { saisonId: string }>(
  elements: readonly T[],
  contexte: ContextePrescription,
): T[] {
  const parSaison = groupesParSaison(contexte.affectations);
  return elements.filter(
    (e) =>
      etatPrescription({
        isMandatory: true,
        groupesSaison: parSaison.get(e.saisonId) ?? [],
        groupesUtilisateur: contexte.groupesUtilisateur,
      }).prescrite,
  );
}

/** Les deux requetes dont tout lecteur a besoin : affectations de l'espace, groupes de la personne. */
export async function chargerContextePrescription(
  tenantId: string,
  userId: string,
): Promise<ContextePrescription> {
  const [affectations, appartenances] = await Promise.all([
    db.tenantSaisonGroupe.findMany({
      where: { tenantId },
      select: { saisonId: true, groupId: true },
    }),
    db.userGroup.findMany({ where: { userId }, select: { groupId: true } }),
  ]);
  return {
    affectations,
    groupesUtilisateur: new Set(appartenances.map((a) => a.groupId)),
  };
}

/** Les affectations d'un espace, pour les lecteurs qui n'ont pas de personne en face (API, console). */
export async function chargerAffectations(
  tenantId: string,
): Promise<AffectationSaisonGroupe[]> {
  return db.tenantSaisonGroupe.findMany({
    where: { tenantId },
    select: { saisonId: true, groupId: true },
  });
}
