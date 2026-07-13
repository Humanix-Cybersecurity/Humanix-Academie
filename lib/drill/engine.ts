// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Moteur de l'exercice de crise en direct : fonctions PURES (aucune
// dependance a Prisma ou au reseau) donc entierement testables.
//   - machine a etats (salle d'attente -> manches -> revelations -> fin)
//   - agregation des votes de la salle
//   - score participant + score collectif + classement

import type { DrillRound, DrillScenario } from "./scenarios";

export type DrillStatus = "LOBBY" | "RUNNING" | "ENDED";
export type DrillPhase = "VOTING" | "REVEAL";

export type DrillState = {
  status: DrillStatus;
  /** Manche courante (1-based). 0 en salle d'attente. */
  currentRound: number;
  phase: DrillPhase;
};

export const INITIAL_STATE: DrillState = {
  status: "LOBBY",
  currentRound: 0,
  phase: "VOTING",
};

/**
 * Transition pilotee par l'hote (un seul bouton "avancer") :
 *   LOBBY                 -> manche 1, VOTING
 *   RUNNING/VOTING        -> meme manche, REVEAL (on montre les votes)
 *   RUNNING/REVEAL (n<N)  -> manche n+1, VOTING
 *   RUNNING/REVEAL (n==N) -> ENDED
 *   ENDED                 -> ENDED (no-op)
 */
export function advanceDrill(
  state: DrillState,
  totalRounds: number,
): DrillState {
  if (state.status === "LOBBY") {
    return { status: "RUNNING", currentRound: 1, phase: "VOTING" };
  }
  if (state.status === "RUNNING") {
    if (state.phase === "VOTING") {
      return { ...state, phase: "REVEAL" };
    }
    // phase REVEAL
    if (state.currentRound >= totalRounds) {
      return {
        status: "ENDED",
        currentRound: state.currentRound,
        phase: "REVEAL",
      };
    }
    return {
      status: "RUNNING",
      currentRound: state.currentRound + 1,
      phase: "VOTING",
    };
  }
  return state; // ENDED
}

/** Libelle du bouton hote correspondant a la prochaine transition. */
export function hostActionLabel(
  state: DrillState,
  totalRounds: number,
): string | null {
  if (state.status === "LOBBY") return "Lancer l'exercice";
  if (state.status === "ENDED") return null;
  if (state.phase === "VOTING") return "Révéler les votes";
  return state.currentRound >= totalRounds ? "Terminer" : "Manche suivante";
}

// -----------------------------------------------------------------------------
// Agregation des votes de la salle
// -----------------------------------------------------------------------------

export type ChoiceTally = {
  choiceId: string;
  label: string;
  emoji: string;
  points: number;
  isBest: boolean;
  count: number;
  /** Pourcentage arrondi (0-100). */
  pct: number;
};

/**
 * Compte les votes par choix pour une manche. `choiceIds` = la liste des
 * choix soumis par les participants (un par participant ayant vote).
 */
export function tallyVotes(
  round: DrillRound,
  choiceIds: string[],
): ChoiceTally[] {
  const total = choiceIds.length;
  return round.choices.map((c) => {
    const count = choiceIds.filter((id) => id === c.id).length;
    return {
      choiceId: c.id,
      label: c.label,
      emoji: c.emoji,
      points: c.points,
      isBest: c.isBest,
      count,
      pct: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
}

// -----------------------------------------------------------------------------
// Scores et classement
// -----------------------------------------------------------------------------

/** Reponses d'un participant : { numero de manche -> id du choix }. */
export type DrillAnswers = Record<number, string>;

/** Score d'un participant = somme des points des choix retenus. */
export function scoreForAnswers(
  scenario: DrillScenario,
  answers: DrillAnswers,
): number {
  let score = 0;
  for (const round of scenario.rounds) {
    const choiceId = answers[round.num];
    if (!choiceId) continue;
    const choice = round.choices.find((c) => c.id === choiceId);
    if (choice) score += choice.points;
  }
  return score;
}

export type LeaderRow = { name: string; score: number };

/** Classement decroissant, egalites departagees par nom (deterministe). */
export function leaderboard(rows: LeaderRow[]): LeaderRow[] {
  return [...rows].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
}

/** Score collectif = moyenne (arrondie) des scores participants. */
export function averageScore(rows: LeaderRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + r.score, 0);
  return Math.round(sum / rows.length);
}
