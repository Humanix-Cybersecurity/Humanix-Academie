// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { buildFallbackContent } from "@/lib/episodes-fallback";

import { resolveResume, type StoredResume } from "./episode-resume";

// Contenu redige, a la maniere d'un MDX : choix "a", "b", "c" et trois
// questions de quiz.
const redige = {
  choices: ["a", "b", "c"].map((id) => ({
    id,
    label: `Choix ${id}`,
    outcome: "neutral" as const,
    feedback: "",
    points: 0,
  })),
  quiz: [1, 2, 3].map((n) => ({
    question: `Question ${n}`,
    choices: [{ id: "a", label: "Oui", correct: true }],
    explanation: "",
  })),
};

// Contenu generique reel : choix "rush", "verify", "ignore" et une question.
const generique = buildFallbackContent({
  saisonSlug: "reconnaitre-phishing",
  episodeSlug: "01-domaine",
  episodeTitle: "Verifier le domaine",
  xpReward: 40,
}).meta;

function enCours(reprise: Partial<StoredResume>): StoredResume {
  return {
    status: "IN_PROGRESS",
    resumeStep: null,
    resumeQuizIndex: 0,
    resumeChoiceId: null,
    ...reprise,
  };
}

describe("resolveResume", () => {
  it("ne propose rien a qui n'a jamais ouvert le module", () => {
    expect(resolveResume(null, redige)).toBeNull();
  });

  it("ne propose rien sur un module termine", () => {
    const termine = enCours({
      status: "COMPLETED",
      resumeStep: "quiz",
      resumeQuizIndex: 1,
      resumeChoiceId: "b",
    });
    expect(resolveResume(termine, redige)).toBeNull();
  });

  it("ne propose rien sans etape enregistree, ou avec une etape inconnue", () => {
    expect(resolveResume(enCours({ resumeStep: null }), redige)).toBeNull();
    expect(resolveResume(enCours({ resumeStep: "bilan" }), redige)).toBeNull();
  });

  it("reprend au scenario", () => {
    expect(resolveResume(enCours({ resumeStep: "scenario" }), redige)).toEqual({
      step: "scenario",
      quizIndex: 0,
      choiceId: null,
    });
  });

  it("reprend au debrief quand le choix existe toujours", () => {
    const progress = enCours({ resumeStep: "debrief", resumeChoiceId: "b" });
    expect(resolveResume(progress, redige)).toEqual({
      step: "debrief",
      quizIndex: 0,
      choiceId: "b",
    });
  });

  it("reprend au quiz, a la question en cours", () => {
    const progress = enCours({
      resumeStep: "quiz",
      resumeQuizIndex: 2,
      resumeChoiceId: "c",
    });
    expect(resolveResume(progress, redige)).toEqual({
      step: "quiz",
      quizIndex: 2,
      choiceId: "c",
    });
  });

  describe("quand le contenu a change depuis l'arret", () => {
    it("le contenu generique numerote bien ses choix autrement qu'un MDX", () => {
      // Si ces identifiants changent, les deux tests suivants ne prouvent plus rien.
      expect(generique.choices.map((c) => c.id)).toEqual([
        "rush",
        "verify",
        "ignore",
      ]);
      expect(generique.quiz).toHaveLength(1);
    });

    it("repart du scenario apres un arret au debrief de la version generique", () => {
      // Le cas de la livraison : le module etait servi en contenu generique,
      // il est desormais servi redige. Sans cette regle, l'ecran est vide.
      const progress = enCours({
        resumeStep: "debrief",
        resumeChoiceId: "verify",
      });
      expect(resolveResume(progress, generique)).not.toBeNull();
      expect(resolveResume(progress, redige)).toBeNull();
    });

    it("repart du scenario apres un arret au quiz de la version generique", () => {
      // La personne n'a lu ni le scenario ni le debrief du texte redige.
      const progress = enCours({
        resumeStep: "quiz",
        resumeQuizIndex: 0,
        resumeChoiceId: "verify",
      });
      expect(resolveResume(progress, generique)).not.toBeNull();
      expect(resolveResume(progress, redige)).toBeNull();
    });

    it("repart du scenario quand la question en cours n'existe plus", () => {
      const progress = enCours({
        resumeStep: "quiz",
        resumeQuizIndex: 3,
        resumeChoiceId: "a",
      });
      expect(resolveResume(progress, redige)).toBeNull();
      expect(
        resolveResume({ ...progress, resumeQuizIndex: -1 }, redige),
      ).toBeNull();
      expect(resolveResume(progress, { ...redige, quiz: [] })).toBeNull();
    });

    it("repart du scenario quand le choix n'a pas ete enregistre", () => {
      const auDebrief = enCours({ resumeStep: "debrief" });
      const auQuiz = enCours({ resumeStep: "quiz" });
      expect(resolveResume(auDebrief, redige)).toBeNull();
      expect(resolveResume(auQuiz, redige)).toBeNull();
    });
  });
});
