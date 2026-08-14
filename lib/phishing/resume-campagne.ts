// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Resume chiffre d'une campagne de phishing simule.
//
// Extrait de app/admin/phishing/actions.ts, qui porte "use server" et ne peut
// donc exporter que des fonctions asynchrones. Le sortir d'ici le rend
// testable -- et cette logique le merite, pour une raison qui n'est pas
// evidente a la lecture.

/** Ce dont le resume a besoin : uniquement deux horodatages. */
export type ResultatPourResume = {
  clickedAt: Date | null;
  reportedAt: Date | null;
};

export type ResumeCampagne = {
  sentTo: number;
  clicked: number;
  reported: number;
  /** Entre 0 et 1. Vaut 0 sur une campagne sans destinataire. */
  reportRate: number;
};

/**
 * Compte les clics et les signalements d'une campagne.
 *
 * ON COMPTE SUR LES HORODATAGES, PAS SUR `status`, et c'est tout le sujet.
 *
 * La convention du schema (cf. `enum PhishingStatus` dans schema.prisma) est
 * de stocker le PLUS HAUT etat atteint dans le funnel :
 *
 *     SENT -> OPENED -> CLICKED -> SUBMITTED
 *
 * REPORTED y est ORTHOGONAL : un utilisateur peut signaler depuis n'importe
 * quel etat, y compris sans avoir ouvert. Le schema le dit explicitement et
 * renvoie vers `reportedAt` pour le drapeau independant.
 *
 * Consequence : compter `status === "REPORTED"` sous-estime les
 * signalements, parce qu'un utilisateur qui CLIQUE PUIS SIGNALE garde le
 * statut CLICKED. Or c'est exactement le comportement qu'une campagne bien
 * menee cherche a produire -- l'utilisateur mord, comprend, puis signale --
 * et exactement la metrique que l'admin regarde.
 *
 * Le taux de signalement serait donc d'autant plus faux que la campagne
 * aurait mieux marche.
 */
export function resumerCampagne(
  resultats: readonly ResultatPourResume[],
): ResumeCampagne {
  const sentTo = resultats.length;
  const clicked = resultats.filter((r) => r.clickedAt !== null).length;
  const reported = resultats.filter((r) => r.reportedAt !== null).length;

  return {
    sentTo,
    clicked,
    reported,
    // Une campagne sans destinataire donnerait NaN, qui traverserait le
    // webhook jusqu'au Slack de l'admin sous la forme « NaN % ».
    reportRate: sentTo > 0 ? reported / sentTo : 0,
  };
}
