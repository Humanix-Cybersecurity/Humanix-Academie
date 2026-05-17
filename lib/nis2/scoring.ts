// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Scoring du diagnostic NIS2 : 30 reponses -> score per-article +
// score global + verdict + top 3 priorites.
//
// LOGIQUE :
//   - Chaque question a un poids 1-3.
//   - Reponse "oui" = 100 % du poids gagne. "non" ou "ne_sait_pas" = 0 %.
//   - Score per-article = (somme des points gagnes / somme des poids
//     possibles) sur les questions de l'article. Ratio en 0-100.
//   - Score global = (somme totale gagnee / somme totale possible).
//   - Verdict :
//       >= 80 : "robuste" (mesures appropriees)
//       60-79 : "en marche" (chantiers identifies, plan a 6 mois)
//       40-59 : "fragile" (gaps critiques, plan urgent)
//       < 40  : "alerte" (non conforme, risque sanction)

import { NIS2_QUESTIONS, type Nis2Question } from "./questions";
import {
  NIS2_ARTICLES_ORDER,
  type Nis2Article,
  type Nis2ArticleMeta,
  NIS2_ARTICLES,
} from "./articles";

export type Nis2Answer = "oui" | "non" | "ne_sait_pas";

export type Nis2Answers = Record<string, Nis2Answer>;

export type Nis2ArticleScore = {
  article: Nis2Article;
  meta: Nis2ArticleMeta;
  /** Score en pourcentage 0-100 */
  score: number;
  /** Questions avec leur reponse, pour rendu du detail */
  questions: Array<{
    question: Nis2Question;
    answer: Nis2Answer;
    /** Points gagnes (0 si non / ne_sait_pas, weight si oui) */
    earned: number;
    weight: number;
  }>;
};

export type Nis2Verdict = "robuste" | "en_marche" | "fragile" | "alerte";

export type Nis2DiagnosticResult = {
  /** Score global 0-100 */
  globalScore: number;
  verdict: Nis2Verdict;
  /** Score par article (11 entrees, dans l'ordre canonique) */
  articleScores: Nis2ArticleScore[];
  /** Top 3 priorites : articles avec le plus gros gap absolu (weight non-gagne) */
  topPriorities: Nis2ArticleScore[];
  /** Date de calcul (UTC) */
  computedAt: string;
};

export const VERDICT_LABEL: Record<Nis2Verdict, { label: string; color: string }> =
  {
    robuste: { label: "Robuste", color: "#10b981" }, // emerald
    en_marche: { label: "En marche", color: "#0ea5e9" }, // sky
    fragile: { label: "Fragile", color: "#f59e0b" }, // amber
    alerte: { label: "Alerte", color: "#dc2626" }, // red
  };

function computeVerdict(score: number): Nis2Verdict {
  if (score >= 80) return "robuste";
  if (score >= 60) return "en_marche";
  if (score >= 40) return "fragile";
  return "alerte";
}

/**
 * Calcule le score d'un article a partir des reponses.
 */
function computeArticleScore(
  article: Nis2Article,
  answers: Nis2Answers,
): Nis2ArticleScore {
  const articleQuestions = NIS2_QUESTIONS.filter((q) => q.article === article);
  let totalWeight = 0;
  let earnedWeight = 0;
  const detail: Nis2ArticleScore["questions"] = [];

  for (const q of articleQuestions) {
    const answer = (answers[q.id] ?? "ne_sait_pas") as Nis2Answer;
    const earned = answer === "oui" ? q.weight : 0;
    totalWeight += q.weight;
    earnedWeight += earned;
    detail.push({
      question: q,
      answer,
      earned,
      weight: q.weight,
    });
  }

  const score =
    totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);

  return {
    article,
    meta: NIS2_ARTICLES[article],
    score,
    questions: detail,
  };
}

/**
 * Calcule le diagnostic complet (global + per-article + top priorites).
 */
export function computeNis2Diagnostic(
  answers: Nis2Answers,
): Nis2DiagnosticResult {
  const articleScores = NIS2_ARTICLES_ORDER.map((a) =>
    computeArticleScore(a, answers),
  );

  // Score global = ratio total points gagnes / total points possibles
  let totalWeight = 0;
  let earnedWeight = 0;
  for (const a of articleScores) {
    for (const q of a.questions) {
      totalWeight += q.weight;
      earnedWeight += q.earned;
    }
  }
  const globalScore =
    totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);

  // Top 3 priorites : articles avec le plus gros gap (poids non-gagne)
  // pondere par leur criticite (un article 100% non-couvert + poids 3 prime
  // sur un article a 80% + poids 2).
  const topPriorities = [...articleScores]
    .map((a) => {
      const gap = a.questions.reduce(
        (sum, q) => sum + (q.earned === 0 ? q.weight : 0),
        0,
      );
      return { ...a, gap };
    })
    .filter((a) => a.score < 80) // pas une priorite si deja robuste
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  return {
    globalScore,
    verdict: computeVerdict(globalScore),
    articleScores,
    topPriorities,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Helper : nombre de questions avec une reponse "oui".
 */
export function countYesAnswers(answers: Nis2Answers): number {
  return Object.values(answers).filter((a) => a === "oui").length;
}
