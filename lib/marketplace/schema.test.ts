// Tests du schéma Zod marketplace.
// Sécurité critique : ce schéma est la première ligne de défense contre
// les payloads malveillants soumis par des contributeurs externes (XSS,
// stockage abusif, injections HTML).

import { describe, it, expect } from "vitest";
import {
  ChoiceSchema,
  QuizQuestionSchema,
  EpisodeSchema,
  ModuleSubmissionSchema,
  ALLOWED_CATEGORIES,
  ALLOWED_DIFFICULTIES,
} from "./schema";

const validChoice = {
  id: "a1",
  label: "Cliquer sur le lien sans vérifier",
  outcome: "bad" as const,
  feedback: "Mauvaise idée — toujours vérifier l'expéditeur d'abord.",
  points: -10,
};

const validQuiz = {
  question: "Quelle est la meilleure pratique face à un email suspect ?",
  choices: [
    { id: "q1a", label: "Le supprimer", correct: false },
    { id: "q1b", label: "Le signaler à l'IT", correct: true },
    { id: "q1c", label: "Cliquer pour voir", correct: false },
  ],
  explanation:
    "Le signalement permet au RSSI de bloquer la campagne pour les autres collaborateurs.",
};

const validEpisode = {
  title: "Phishing fournisseur",
  durationMinutes: 5,
  scenario:
    "Un email semble provenir de votre fournisseur habituel et demande un changement de RIB urgent. Que faites-vous ?",
  choices: [
    validChoice,
    {
      id: "a2",
      label: "Appeler le contact connu pour vérifier",
      outcome: "good" as const,
      feedback: "Excellente démarche — la double vérification voix/écrit.",
      points: 20,
    },
  ],
  debrief:
    "La fraude au président et la fraude au RIB sont parmi les attaques les plus coûteuses pour les PME françaises. Toujours vérifier par un canal alternatif avant tout virement modifié, et instaurer des seuils d'autorisation à plusieurs personnes pour éviter la fraude solo.",
  quiz: [validQuiz],
  xpReward: 50,
};

const validModule = {
  slug: "phishing-fournisseur-2026",
  title: "Phishing fournisseur — cas réel 2026",
  description:
    "Module de sensibilisation à la fraude au RIB et à la fraude au président. Cas réel anonymisé issu d'un cabinet comptable francais.",
  emoji: "🎣",
  category: "phishing" as const,
  difficulty: "medium" as const,
  language: "fr" as const,
  authorOrgName: "Humanix Cybersecurity",
  license: "CC_BY" as const,
  payload: { episodes: [validEpisode] },
};

describe("ChoiceSchema", () => {
  it("accepte un choice valide", () => {
    expect(ChoiceSchema.safeParse(validChoice).success).toBe(true);
  });

  it("refuse un id avec caractères interdits", () => {
    expect(
      ChoiceSchema.safeParse({ ...validChoice, id: "invalid id!" }).success,
    ).toBe(false);
  });

  it("refuse un label avec balises HTML", () => {
    const r = ChoiceSchema.safeParse({
      ...validChoice,
      label: "Cliquer <script>alert('xss')</script>",
    });
    expect(r.success).toBe(false);
  });

  it("refuse un label trop court ou trop long", () => {
    expect(
      ChoiceSchema.safeParse({ ...validChoice, label: "ok" }).success,
    ).toBe(false);
    expect(
      ChoiceSchema.safeParse({ ...validChoice, label: "x".repeat(241) })
        .success,
    ).toBe(false);
  });

  it("refuse outcome hors enum", () => {
    expect(
      ChoiceSchema.safeParse({ ...validChoice, outcome: "maybe" }).success,
    ).toBe(false);
  });

  it("refuse points hors plage [-30, 50]", () => {
    expect(ChoiceSchema.safeParse({ ...validChoice, points: 51 }).success).toBe(
      false,
    );
    expect(
      ChoiceSchema.safeParse({ ...validChoice, points: -31 }).success,
    ).toBe(false);
  });
});

describe("QuizQuestionSchema", () => {
  it("accepte un quiz valide", () => {
    expect(QuizQuestionSchema.safeParse(validQuiz).success).toBe(true);
  });

  it("refuse un quiz sans bonne réponse", () => {
    const bad = {
      ...validQuiz,
      choices: validQuiz.choices.map((c) => ({ ...c, correct: false })),
    };
    expect(QuizQuestionSchema.safeParse(bad).success).toBe(false);
  });

  it("refuse un quiz avec plusieurs bonnes réponses", () => {
    const bad = {
      ...validQuiz,
      choices: validQuiz.choices.map((c) => ({ ...c, correct: true })),
    };
    expect(QuizQuestionSchema.safeParse(bad).success).toBe(false);
  });

  it("refuse moins de 2 propositions", () => {
    const bad = { ...validQuiz, choices: [validQuiz.choices[0]] };
    expect(QuizQuestionSchema.safeParse(bad).success).toBe(false);
  });

  it("refuse plus de 4 propositions", () => {
    const bad = {
      ...validQuiz,
      choices: [
        ...validQuiz.choices,
        { id: "q1d", label: "Option 4 supplémentaire", correct: false },
        { id: "q1e", label: "Option 5 supplémentaire", correct: false },
      ],
    };
    expect(QuizQuestionSchema.safeParse(bad).success).toBe(false);
  });
});

describe("EpisodeSchema", () => {
  it("accepte un épisode valide", () => {
    expect(EpisodeSchema.safeParse(validEpisode).success).toBe(true);
  });

  it("refuse un épisode sans choix 'good'", () => {
    const bad = {
      ...validEpisode,
      choices: validEpisode.choices.map((c) => ({
        ...c,
        outcome: "bad" as const,
      })),
    };
    expect(EpisodeSchema.safeParse(bad).success).toBe(false);
  });

  it("refuse des choix avec IDs dupliqués", () => {
    const bad = {
      ...validEpisode,
      choices: [
        { ...validEpisode.choices[0] },
        { ...validEpisode.choices[1], id: validEpisode.choices[0].id },
      ],
    };
    expect(EpisodeSchema.safeParse(bad).success).toBe(false);
  });

  it("refuse une durée hors [3, 15] minutes", () => {
    expect(
      EpisodeSchema.safeParse({ ...validEpisode, durationMinutes: 2 }).success,
    ).toBe(false);
    expect(
      EpisodeSchema.safeParse({ ...validEpisode, durationMinutes: 16 }).success,
    ).toBe(false);
  });

  it("applique la valeur par défaut xpReward=50 si omise", () => {
    const { xpReward: _, ...withoutXp } = validEpisode;
    const r = EpisodeSchema.safeParse(withoutXp);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.xpReward).toBe(50);
  });
});

describe("ModuleSubmissionSchema", () => {
  it("accepte un module complet valide", () => {
    expect(ModuleSubmissionSchema.safeParse(validModule).success).toBe(true);
  });

  it("refuse un slug avec majuscules ou underscores", () => {
    expect(
      ModuleSubmissionSchema.safeParse({
        ...validModule,
        slug: "Phishing_fournisseur",
      }).success,
    ).toBe(false);
  });

  it("refuse un slug commençant par un tiret", () => {
    expect(
      ModuleSubmissionSchema.safeParse({ ...validModule, slug: "-invalid" })
        .success,
    ).toBe(false);
  });

  it("refuse une catégorie hors enum", () => {
    expect(
      ModuleSubmissionSchema.safeParse({
        ...validModule,
        category: "hacking-illegal",
      }).success,
    ).toBe(false);
  });

  it("refuse une langue autre que 'fr' (V1 FR-only)", () => {
    expect(
      ModuleSubmissionSchema.safeParse({
        ...validModule,
        language: "en",
      }).success,
    ).toBe(false);
  });

  it("refuse une licence non standard", () => {
    expect(
      ModuleSubmissionSchema.safeParse({
        ...validModule,
        license: "PROPRIETARY",
      }).success,
    ).toBe(false);
  });

  it("refuse une description avec & non échappée (anti-HTML strict)", () => {
    expect(
      ModuleSubmissionSchema.safeParse({
        ...validModule,
        // & autorisé dans description (txt simple) — mais pas dans authorOrgName
        authorOrgName: "Humanix & Co",
      }).success,
    ).toBe(false);
  });

  it("refuse 0 épisode", () => {
    expect(
      ModuleSubmissionSchema.safeParse({
        ...validModule,
        payload: { episodes: [] },
      }).success,
    ).toBe(false);
  });

  it("refuse plus de 10 épisodes", () => {
    expect(
      ModuleSubmissionSchema.safeParse({
        ...validModule,
        payload: { episodes: Array(11).fill(validEpisode) },
      }).success,
    ).toBe(false);
  });
});

describe("Constantes exportées", () => {
  it("ALLOWED_CATEGORIES contient les 10 catégories attendues", () => {
    expect(ALLOWED_CATEGORIES).toHaveLength(10);
    expect(ALLOWED_CATEGORIES).toContain("phishing");
    expect(ALLOWED_CATEGORIES).toContain("rgpd");
    expect(ALLOWED_CATEGORIES).toContain("ia-generative");
  });

  it("ALLOWED_DIFFICULTIES contient les 3 niveaux", () => {
    expect(ALLOWED_DIFFICULTIES).toEqual(["easy", "medium", "hard"]);
  });
});
