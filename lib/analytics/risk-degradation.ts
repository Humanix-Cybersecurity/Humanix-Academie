// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Detection de la degradation du score de risque collectif d'un tenant.
//
// Alimente l'evenement webhook `risk.degraded`, declare dans
// lib/webhooks/events.ts mais qui n'etait EMIS NULLE PART (issue #734).
//
// ---------------------------------------------------------------------
// POURQUOI UN MODULE SEPARE PLUTOT QU'UN `if` DANS LE CRON
// ---------------------------------------------------------------------
//
// La regle "baisse de >= 5 points sur 7 jours" est une decision METIER :
// elle a un seuil, une fenetre, et une condition de non-repetition. Ces
// trois choses se testent sans base de donnees, sans cron et sans
// webhook. Les enfouir dans recordTenantSnapshot() les rendrait
// verifiables uniquement par un test d'integration lourd, donc en
// pratique jamais verifiees.

/** Baisse minimale, en points, pour considerer le score degrade. */
export const SEUIL_DEGRADATION = 5;

/** Fenetre de comparaison, en jours. */
export const FENETRE_JOURS = 7;

export type EtatScore = {
  /** Score moyen du jour. */
  actuel: number;
  /** Score moyen il y a FENETRE_JOURS. `null` si l'historique manque. */
  reference: number | null;
};

export type Degradation = {
  scorePrecedent: number;
  scoreActuel: number;
  /** Negatif quand le score baisse. Arrondi au dixieme. */
  delta: number;
};

/**
 * Le score est-il degrade a cette date ?
 *
 * Retourne `false` si l'historique est insuffisant : un tenant cree il y a
 * trois jours n'a pas "baisse", il n'a simplement pas de passe. Confondre
 * les deux produirait une alerte a chaque creation de tenant.
 */
export function estDegrade(etat: EtatScore): boolean {
  if (etat.reference === null) return false;
  return etat.actuel - etat.reference <= -SEUIL_DEGRADATION;
}

/**
 * Faut-il EMETTRE l'evenement aujourd'hui ?
 *
 * On n'emet qu'a la TRANSITION : degrade aujourd'hui, pas degrade hier.
 *
 * Sans cette condition, le cron quotidien reemettrait l'evenement chaque
 * jour tant que la baisse reste dans la fenetre glissante de 7 jours,
 * soit jusqu'a sept notifications pour un seul incident. Un destinataire
 * qui recoit la meme alerte sept matins de suite cesse de les lire, et
 * c'est exactement le mecanisme qui a laissé passer les pannes qu'on a
 * corrigees le 2026-08-12.
 *
 * `hier` a `null` (pas d'historique la veille) compte comme NON degrade :
 * la premiere detection possible est donc bien emise.
 */
export function doitEmettre(params: {
  aujourdhui: EtatScore;
  hier: EtatScore | null;
}): Degradation | null {
  if (!estDegrade(params.aujourdhui)) return null;
  if (params.hier !== null && estDegrade(params.hier)) return null;

  const reference = params.aujourdhui.reference as number;
  return {
    scorePrecedent: arrondir(reference),
    scoreActuel: arrondir(params.aujourdhui.actuel),
    delta: arrondir(params.aujourdhui.actuel - reference),
  };
}

function arrondir(n: number): number {
  return Math.round(n * 10) / 10;
}
