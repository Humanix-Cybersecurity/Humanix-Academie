// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Scoring du diagnostic ReCyF + construction du plan d'accompagnement.
//
// Une question par objectif, reponse oui / en_partie / non :
//   oui       -> 100 % (en place)
//   en_partie -> 50 %  (a renforcer)
//   non       -> 0 %   (a engager)
//
// PROPORTIONNALITE : le score ne porte que sur les objectifs APPLICABLES au
// profil (EI = objectifs 1-15 ; EE = objectifs 1-20). Un objectif reserve
// aux entites essentielles n'entre pas dans le score d'une entite importante.

import {
  RECYF_GROUPES,
  RECYF_BY_ID,
  objectifsForProfil,
  type RecyfObjectif,
  type RecyfProfil,
  type RecyfGroupe,
} from "./recyf";

export type RecyfAnswer = "oui" | "en_partie" | "non";
export type RecyfAnswers = Record<string, RecyfAnswer>;

export type RecyfVerdict = "robuste" | "en_marche" | "fragile" | "alerte";
export type RecyfStatus = "solide" | "a_renforcer" | "prioritaire";

export const RECYF_VERDICT_LABEL: Record<
  RecyfVerdict,
  { label: string; color: string }
> = {
  robuste: { label: "Robuste", color: "#10b981" },
  en_marche: { label: "En marche", color: "#0ea5e9" },
  fragile: { label: "Fragile", color: "#f59e0b" },
  alerte: { label: "À engager", color: "#dc2626" },
};

export const RECYF_STATUS_LABEL: Record<RecyfStatus, string> = {
  solide: "En place",
  a_renforcer: "À renforcer",
  prioritaire: "À engager",
};

export type RecyfPlanItem = {
  objectif: RecyfObjectif;
  /** Score 0 / 50 / 100 */
  score: number;
  status: RecyfStatus;
  /** Fait partie des chantiers prioritaires */
  isPriority: boolean;
};

export type RecyfGroupScore = {
  groupe: RecyfGroupe;
  label: string;
  emoji: string;
  score: number;
  objectifsCount: number;
};

export type RecyfPlan = {
  profil: RecyfProfil;
  globalScore: number;
  verdict: RecyfVerdict;
  /** Objectifs applicables, ordonnes : priorites d'abord, puis score croissant */
  items: RecyfPlanItem[];
  groupScores: RecyfGroupScore[];
  priorityCount: number;
  solidCount: number;
  /** Nombre d'objectifs evalues (15 pour EI, 20 pour EE) */
  objectifsCount: number;
};

const ANSWER_VALUE: Record<RecyfAnswer, number> = {
  oui: 1,
  en_partie: 0.5,
  non: 0,
};

function answerOf(answers: RecyfAnswers, id: string): RecyfAnswer {
  return answers[id] ?? "non";
}

function scoreOf(answer: RecyfAnswer): number {
  return Math.round(ANSWER_VALUE[answer] * 100);
}

function statusOf(score: number): RecyfStatus {
  if (score >= 100) return "solide";
  if (score >= 50) return "a_renforcer";
  return "prioritaire";
}

function verdictOf(score: number): RecyfVerdict {
  if (score >= 80) return "robuste";
  if (score >= 60) return "en_marche";
  if (score >= 40) return "fragile";
  return "alerte";
}

/**
 * Construit le plan ReCyF (score + statut + priorites) pour un profil donne.
 */
export function buildRecyfPlan(
  answers: RecyfAnswers,
  profil: RecyfProfil,
): RecyfPlan {
  const objectifs = objectifsForProfil(profil);

  // Score global pondere sur les objectifs applicables.
  let totalPoids = 0;
  let earned = 0;
  for (const o of objectifs) {
    const val = ANSWER_VALUE[answerOf(answers, o.id)];
    totalPoids += o.poids;
    earned += val * o.poids;
  }
  const globalScore =
    totalPoids === 0 ? 0 : Math.round((earned / totalPoids) * 100);

  // Priorites : objectifs non complets, classes par ecart pondere decroissant.
  const ranked = objectifs
    .map((o) => {
      const answer = answerOf(answers, o.id);
      const score = scoreOf(answer);
      const gap = (1 - ANSWER_VALUE[answer]) * o.poids;
      return { o, score, gap };
    })
    .filter((x) => x.score < 100)
    .sort((a, b) => b.gap - a.gap || a.o.num - b.o.num);

  const priorityIds = new Set(ranked.slice(0, 3).map((x) => x.o.id));

  const items: RecyfPlanItem[] = objectifs
    .map((o) => {
      const score = scoreOf(answerOf(answers, o.id));
      return {
        objectif: o,
        score,
        status: statusOf(score),
        isPriority: priorityIds.has(o.id),
      };
    })
    .sort((a, b) => {
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      if (a.score !== b.score) return a.score - b.score;
      return a.objectif.num - b.objectif.num;
    });

  // Scores par thematique (sur les objectifs applicables du groupe).
  const groupScores: RecyfGroupScore[] = (
    Object.keys(RECYF_GROUPES) as RecyfGroupe[]
  )
    .map((g) => {
      const inGroup = objectifs.filter((o) => o.groupe === g);
      if (inGroup.length === 0) return null;
      let tp = 0;
      let e = 0;
      for (const o of inGroup) {
        tp += o.poids;
        e += ANSWER_VALUE[answerOf(answers, o.id)] * o.poids;
      }
      return {
        groupe: g,
        label: RECYF_GROUPES[g].label,
        emoji: RECYF_GROUPES[g].emoji,
        score: tp === 0 ? 0 : Math.round((e / tp) * 100),
        objectifsCount: inGroup.length,
      };
    })
    .filter((x): x is RecyfGroupScore => x !== null)
    .sort((a, b) => RECYF_GROUPES[a.groupe].ordre - RECYF_GROUPES[b.groupe].ordre);

  return {
    profil,
    globalScore,
    verdict: verdictOf(globalScore),
    items,
    groupScores,
    priorityCount: items.filter((i) => i.status === "prioritaire").length,
    solidCount: items.filter((i) => i.status === "solide").length,
    objectifsCount: objectifs.length,
  };
}

/** Vrai si toutes les questions applicables ont une reponse. */
export function isComplete(
  answers: RecyfAnswers,
  profil: RecyfProfil,
): boolean {
  return objectifsForProfil(profil).every((o) => answers[o.id] != null);
}

/** Garde-fou : ne conserve que les ids d'objectifs connus. */
export function sanitizeAnswers(answers: RecyfAnswers): RecyfAnswers {
  const clean: RecyfAnswers = {};
  for (const [id, a] of Object.entries(answers)) {
    if (RECYF_BY_ID[id] && (a === "oui" || a === "en_partie" || a === "non")) {
      clean[id] = a;
    }
  }
  return clean;
}
