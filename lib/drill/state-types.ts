// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Forme de la reponse de GET /api/drill/[id] (endpoint de polling), partagee
// entre la route et les composants client. On la garde synchro a la main.

export type DrillStateResponse = {
  session: {
    id: string;
    code: string;
    scenarioTitle: string;
    status: "LOBBY" | "RUNNING" | "ENDED";
    currentRound: number;
    phase: "VOTING" | "REVEAL";
    totalRounds: number;
  };
  isHost: boolean;
  /** Libelle du bouton hote (null si terminé ou non-hote). */
  hostAction: string | null;
  participantCount: number;
  me: { id: string; score: number } | null;
  /** Le choix voté par l'utilisateur a la manche courante (null sinon). */
  myAnswer: string | null;
  round: null | {
    num: number;
    time: string;
    narrative: string;
    prompt: string;
    respondedCount: number;
    choices: Array<{ id: string; label: string; emoji: string }>;
  };
  reveal: null | {
    hexVerdict: string;
    bestChoiceId: string | null;
    tally: Array<{
      choiceId: string;
      label: string;
      emoji: string;
      points: number;
      isBest: boolean;
      count: number;
      pct: number;
    }>;
  };
  leaderboard: null | {
    rows: Array<{ rank: number; name: string; score: number }>;
    max: number;
  };
};
