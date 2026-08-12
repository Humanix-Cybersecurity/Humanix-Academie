// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Detection de la completion d'une SAISON ENTIERE par un utilisateur.
//
// Alimente l'evenement webhook `saison.completed`, declare dans
// lib/webhooks/events.ts mais qui n'etait EMIS NULLE PART (issue #734).
//
// ---------------------------------------------------------------------
// POURQUOI UN MODULE SEPARE
// ---------------------------------------------------------------------
//
// La question "cette saison vient-elle d'etre terminee ?" a quatre
// pieges, et tous se testent sans base de donnees :
//
//   1. Une saison SANS episode n'est pas "terminee", elle est vide.
//   2. Il faut que TOUS les episodes soient completes, pas seulement
//      celui qu'on vient de valider.
//   3. L'episode valide doit appartenir a la saison examinee.
//   4. On ne doit emettre qu'UNE FOIS par (utilisateur, saison).
//
// Enfouir ces regles dans le route handler les rendrait verifiables
// uniquement par un test d'integration, donc en pratique jamais
// verifiees.

export type ProgressionEpisode = {
  episodeId: string;
  /** `true` si l'utilisateur a termine cet episode. */
  termine: boolean;
  /** Meilleur score obtenu, sur 100. Vaut 0 si l'episode n'est pas termine. */
  score: number;
};

export type SaisonTerminee = {
  /** Score moyen sur l'ensemble des episodes, arrondi a l'entier. */
  scoreMoyen: number;
  episodesTotal: number;
};

/**
 * La saison vient-elle d'etre terminee par la validation de `episodeValideId` ?
 *
 * `estPremiereCompletion` porte la garantie d'UNICITE, et c'est
 * volontairement un parametre plutot qu'une deduction interne.
 *
 * La fonction est appelee APRES l'enregistrement de la progression : a ce
 * moment, l'episode valide est deja marque termine, et l'etat d'avant
 * n'est plus observable. Impossible donc de distinguer "je viens de
 * terminer la saison" de "je rejoue un episode d'une saison achevee"
 * a partir des seules donnees presentes. Seul l'appelant le sait.
 *
 * Le rendre explicite evite le piege classique : une fonction qui a
 * l'air de garantir l'unicite alors qu'elle repose en silence sur une
 * condition verifiee ailleurs.
 *
 * Retourne `null` dans tous les cas ou il ne faut PAS emettre.
 */
export function saisonVientDEtreTerminee(params: {
  episodes: ProgressionEpisode[];
  episodeValideId: string;
  estPremiereCompletion: boolean;
}): SaisonTerminee | null {
  const { episodes, episodeValideId, estPremiereCompletion } = params;

  if (!estPremiereCompletion) return null;
  if (episodes.length === 0) return null;
  if (!episodes.some((e) => e.episodeId === episodeValideId)) return null;
  if (!episodes.every((e) => e.termine)) return null;

  const somme = episodes.reduce((s, e) => s + e.score, 0);

  return {
    scoreMoyen: Math.round(somme / episodes.length),
    episodesTotal: episodes.length,
  };
}
