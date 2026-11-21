// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Reprise d'un module en cours : ou remettre la personne qui revient.
//
// Le lecteur enregistre l'etape atteinte (Progress.resumeStep), le choix fait
// au scenario (resumeChoiceId) et la question de quiz en cours
// (resumeQuizIndex). Ces trois valeurs ne valent que pour le contenu qui
// etait servi AU MOMENT DE L'ARRET.
//
// POURQUOI VERIFIER LA REPRISE CONTRE LE CONTENU
//
//   Le contenu d'un module change sans que sa ligne Progress bouge : un MDX
//   est ecrit pour un module jusque-la servi en contenu generique, un texte
//   est repris, une question de quiz est retiree.
//
//   Le contenu generique numerote ses choix "rush", "verify", "ignore"
//   (lib/episodes-fallback.ts) ; un MDX les numerote "a", "b", "c". Une
//   personne arretee au debrief de la version generique revenait donc sur un
//   module VIDE : le lecteur n'affiche le debrief que s'il retrouve le choix,
//   et il ne le retrouvait plus. Ni texte ni bouton, seulement la barre
//   d'etapes. Constate le 2026-11-20, en servant les MDX des saisons de demo
//   a cote du catalogue commercial (cf. lib/episodes.ts).
//
//   Une reprise que le contenu servi n'aurait pas pu produire est donc
//   ignoree : la personne repart du scenario, sur le texte qu'elle n'a pas
//   encore lu. Sa progression n'est pas touchee.

import type { EpisodeContent } from "@/lib/episodes";

export type ResumeStep = "scenario" | "debrief" | "quiz";

export type EpisodeResume = {
  step: ResumeStep;
  quizIndex: number;
  choiceId: string | null;
};

/** Les champs de Progress qui decrivent une reprise. */
export type StoredResume = {
  status: string;
  resumeStep: string | null;
  resumeQuizIndex: number;
  resumeChoiceId: string | null;
};

function isResumeStep(step: string | null): step is ResumeStep {
  return step === "scenario" || step === "debrief" || step === "quiz";
}

/**
 * Reprise a proposer pour ce module, ou null pour repartir du scenario.
 *
 * @param progress la progression enregistree, null si la personne n'a jamais
 *   ouvert le module
 * @param meta le contenu servi MAINTENANT (MDX ou contenu generique)
 */
export function resolveResume(
  progress: StoredResume | null,
  meta: Pick<EpisodeContent["meta"], "choices" | "quiz">,
): EpisodeResume | null {
  if (!progress || progress.status === "COMPLETED") return null;
  const step = progress.resumeStep;
  if (!isResumeStep(step)) return null;

  if (step !== "scenario") {
    // Le debrief et le quiz viennent apres un choix : s'il n'existe plus,
    // c'est que le scenario a change depuis l'arret.
    const choiceStillExists = meta.choices.some(
      (c) => c.id === progress.resumeChoiceId,
    );
    if (!choiceStillExists) return null;
  }
  if (step === "quiz") {
    const index = progress.resumeQuizIndex;
    if (index < 0 || index >= meta.quiz.length) return null;
  }

  return {
    step,
    quizIndex: progress.resumeQuizIndex,
    choiceId: progress.resumeChoiceId,
  };
}
