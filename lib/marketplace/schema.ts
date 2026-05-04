// SPDX-License-Identifier: AGPL-3.0-or-later
// SCHEMA STRICT du payload d'un module marketplace.
// Aucune zone libre, aucune balise HTML, aucune URL externe.
// Tout texte est valide pour des longueurs max raisonnables.
import { z } from "zod";

// Regex anti-HTML : refuse toute balise et tout caractere d'echappement HTML.
// On accepte les caracteres typographiques courants : accents, ponctuation,
// chiffres, retours a la ligne, mais PAS les chevrons ni les esperluettes
// brutes (qui ouvrent la porte aux entites HTML).
const NO_HTML = /^[^<>]*$/;
const NO_HTML_NO_AMP = /^[^<>&]*$/;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;
const EMOJI_RE = /^.{1,4}$/u; // accepte 1 a 4 caracteres (1 emoji peut faire 2-3 codepoints)

// Limites strictes pour empecher les abus de stockage / DoS
const TXT_LIMITS = {
  title: { min: 5, max: 80 },
  description: { min: 20, max: 400 },
  scenario: { min: 50, max: 2000 },
  choiceLabel: { min: 5, max: 240 },
  choiceFeedback: { min: 10, max: 500 },
  debrief: { min: 100, max: 2500 },
  quizQuestion: { min: 10, max: 300 },
  quizChoice: { min: 2, max: 200 },
  quizExplanation: { min: 10, max: 600 },
} as const;

const txt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(NO_HTML, "Aucune balise HTML autorisée");

const txtStrict = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(NO_HTML_NO_AMP, "Caractères <, > et & interdits");

// CHOICE (mise en situation)
export const ChoiceSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,8}$/, "ID invalide"),
  label: txt(TXT_LIMITS.choiceLabel.min, TXT_LIMITS.choiceLabel.max),
  outcome: z.enum(["good", "bad", "neutral"]),
  feedback: txt(TXT_LIMITS.choiceFeedback.min, TXT_LIMITS.choiceFeedback.max),
  points: z.number().int().min(-30).max(50),
});

// QUIZ
export const QuizQuestionSchema = z.object({
  question: txt(TXT_LIMITS.quizQuestion.min, TXT_LIMITS.quizQuestion.max),
  choices: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9_-]{1,8}$/),
        label: txt(TXT_LIMITS.quizChoice.min, TXT_LIMITS.quizChoice.max),
        correct: z.boolean(),
      }),
    )
    .min(2, "2 propositions minimum")
    .max(4, "4 propositions maximum")
    .refine((arr) => arr.filter((c) => c.correct).length === 1, {
      message: "Exactement 1 bonne réponse requise",
    }),
  explanation: txt(
    TXT_LIMITS.quizExplanation.min,
    TXT_LIMITS.quizExplanation.max,
  ),
});

// EPISODE
export const EpisodeSchema = z.object({
  title: txt(TXT_LIMITS.title.min, TXT_LIMITS.title.max),
  durationMinutes: z.number().int().min(3).max(15),
  scenario: txt(TXT_LIMITS.scenario.min, TXT_LIMITS.scenario.max),
  choices: z
    .array(ChoiceSchema)
    .min(2, "2 choix minimum")
    .max(4, "4 choix maximum")
    .refine((arr) => arr.some((c) => c.outcome === "good"), {
      message: "Au moins une option doit avoir l'issue 'good'",
    })
    .refine((arr) => new Set(arr.map((c) => c.id)).size === arr.length, {
      message: "Les IDs des choix doivent être uniques",
    }),
  debrief: txt(TXT_LIMITS.debrief.min, TXT_LIMITS.debrief.max),
  quiz: z
    .array(QuizQuestionSchema)
    .min(1, "1 question quiz minimum")
    .max(5, "5 questions max"),
  xpReward: z.number().int().min(20).max(100).default(50),
});

// MODULE COMPLET
export const ALLOWED_CATEGORIES = [
  "phishing",
  "mots-de-passe",
  "donnees-sensibles",
  "teletravail",
  "fraude",
  "reseaux-sociaux",
  "crise",
  "rgpd",
  "ia-generative",
  "autre",
] as const;

export const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const ModuleMetadataSchema = z.object({
  title: txt(TXT_LIMITS.title.min, TXT_LIMITS.title.max),
  description: txt(TXT_LIMITS.description.min, TXT_LIMITS.description.max),
  emoji: z.string().regex(EMOJI_RE, "Emoji invalide (1-4 caractères)"),
  category: z.enum(ALLOWED_CATEGORIES),
  difficulty: z.enum(ALLOWED_DIFFICULTIES).default("medium"),
  language: z.literal("fr"), // V1 : FR uniquement (controle qualite linguistique)
  authorOrgName: txtStrict(0, 80).optional().or(z.literal("")),
  license: z.enum(["CC_BY", "CC_BY_SA"]),
});

export const ModulePayloadSchema = z.object({
  episodes: z
    .array(EpisodeSchema)
    .min(1, "1 épisode minimum")
    .max(10, "10 épisodes maximum"),
});

// Utilise pour la creation/edition cote API
export const ModuleSubmissionSchema = ModuleMetadataSchema.extend({
  slug: z
    .string()
    .regex(SLUG_RE, "Slug invalide (a-z, 0-9, tirets, 3-50 caractères)"),
  payload: ModulePayloadSchema,
});

export type ModulePayload = z.infer<typeof ModulePayloadSchema>;
export type ModuleSubmission = z.infer<typeof ModuleSubmissionSchema>;
export type EpisodePayload = z.infer<typeof EpisodeSchema>;
