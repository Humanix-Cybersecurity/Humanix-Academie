"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Ecran PARTICIPANT : rejoint la salle automatiquement, vote a chaque manche,
// voit le vote de la salle a la revelation, et son score en fin d'exercice.

import { useEffect, useRef, useState } from "react";
import { useDrillState, drillAction } from "./useDrillState";

export default function DrillPlayer({
  exerciseId,
  mascotEmoji,
}: {
  exerciseId: string;
  mascotEmoji: string;
}) {
  const { state, refresh } = useDrillState(exerciseId);
  const joined = useRef(false);
  const [voting, setVoting] = useState(false);

  // Rejoint une seule fois au montage (upsert cote serveur = idempotent).
  useEffect(() => {
    if (joined.current) return;
    joined.current = true;
    drillAction(exerciseId, { action: "join" }).then(() => refresh());
  }, [exerciseId, refresh]);

  async function vote(choiceId: string) {
    if (voting) return;
    setVoting(true);
    await drillAction(exerciseId, { action: "answer", choiceId });
    await refresh();
    setVoting(false);
  }

  const s = state?.session;
  const round = state?.round;
  const reveal = state?.reveal;
  const myAnswer = state?.myAnswer ?? null;

  const HexLine = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-xl bg-accent-50 dark:bg-accent-950/30 p-3 flex gap-2 items-start">
      <span className="text-xl leading-none" aria-hidden="true">
        {mascotEmoji}
      </span>
      <p className="text-sm text-accent-900 dark:text-accent-100 leading-relaxed">
        {children}
      </p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      {/* En-tete compacte */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <span className="font-bold text-primary-500 dark:text-accent-300 truncate">
          {s?.scenarioTitle ?? "Exercice de crise"}
        </span>
        {state?.me && (
          <span className="text-gray-600 dark:text-gray-300 shrink-0">
            Ton score : <strong>{state.me.score}</strong>
          </span>
        )}
      </div>

      {/* LOBBY */}
      {(!s || s.status === "LOBBY") && (
        <div className="text-center py-10">
          <div className="text-5xl mb-3 animate-pulse" aria-hidden="true">
            {mascotEmoji}
          </div>
          <p className="font-bold text-primary-600 dark:text-accent-200 mb-1">
            Tu es dans la salle.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            L&apos;exercice va commencer. {state?.participantCount ?? 1}{" "}
            personne
            {(state?.participantCount ?? 1) > 1 ? "s" : ""} connectée
            {(state?.participantCount ?? 1) > 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* RUNNING */}
      {s?.status === "RUNNING" && round && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>
              Manche {round.num} / {s.totalRounds}
            </span>
            <span className="font-mono">{round.time}</span>
          </div>

          <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-4 mb-4">
            <p className="text-sm text-red-900 dark:text-red-100 leading-relaxed">
              {round.narrative}
            </p>
          </div>

          <p className="font-bold text-primary-600 dark:text-accent-200 mb-3">
            {round.prompt}
          </p>

          {/* VOTING : boutons cliquables */}
          {s.phase === "VOTING" && (
            <>
              <div className="space-y-2 mb-3">
                {round.choices.map((c) => {
                  const picked = myAnswer === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => vote(c.id)}
                      disabled={voting}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                        picked
                          ? "border-accent-500 bg-accent-50 dark:bg-accent-950/40"
                          : "border-gray-200 dark:border-slate-700 hover:border-accent-400"
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">
                        {c.emoji}
                      </span>
                      <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">
                        {c.label}
                      </span>
                      {picked && (
                        <span
                          className="text-accent-600 dark:text-accent-300 font-bold"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {myAnswer
                  ? "Vote enregistré. Tu peux encore changer d'avis."
                  : "Choisis ton réflexe."}{" "}
                · {round.respondedCount}/{state?.participantCount ?? 0} ont voté
              </p>
            </>
          )}

          {/* REVEAL : resultats + verdict */}
          {s.phase === "REVEAL" && reveal && (
            <>
              <div className="mb-3">
                {myAnswer && myAnswer === reveal.bestChoiceId ? (
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                    <span aria-hidden="true">🎯 </span>Bien joué, c&apos;était
                    le meilleur réflexe.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Le meilleur réflexe était en vert. On apprend, pas de souci.
                  </p>
                )}
              </div>
              <ul className="space-y-2 mb-4 list-none p-0">
                {reveal.tally.map((t) => {
                  const mine = myAnswer === t.choiceId;
                  return (
                    <li key={t.choiceId}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span
                          className={
                            t.isBest
                              ? "font-bold text-emerald-700 dark:text-emerald-300"
                              : "text-gray-700 dark:text-gray-200"
                          }
                        >
                          <span aria-hidden="true">{t.emoji} </span>
                          {t.label}
                          {t.isBest && <span aria-hidden="true"> ✓</span>}
                          {mine && !t.isBest && (
                            <span className="text-gray-400"> (ton choix)</span>
                          )}
                        </span>
                        <span className="tabular-nums text-gray-500 dark:text-gray-400">
                          {t.pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            t.isBest ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                          style={{ width: `${t.pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <HexLine>
                <span className="font-bold">Hex :</span> {reveal.hexVerdict}
              </HexLine>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
                On attend l&apos;hôte pour la suite…
              </p>
            </>
          )}
        </div>
      )}

      {/* ENDED */}
      {s?.status === "ENDED" && (
        <div className="text-center py-6">
          <div className="text-5xl mb-2" aria-hidden="true">
            {mascotEmoji}
          </div>
          <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-1">
            Exercice terminé !
          </h2>
          {state?.me && (
            <p className="text-gray-700 dark:text-gray-200 mb-4">
              Ton score : <strong>{state.me.score}</strong>
              {state.leaderboard ? ` / ${state.leaderboard.max}` : ""}
            </p>
          )}
          {state?.leaderboard && (
            <ol className="space-y-2 list-none p-0 max-w-sm mx-auto text-left">
              {state.leaderboard.rows.slice(0, 5).map((r) => (
                <li
                  key={`${r.rank}-${r.name}`}
                  className="flex items-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-2.5"
                >
                  <span className="w-6 text-center font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                    {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {r.name}
                  </span>
                  <span className="text-sm font-bold text-primary-600 dark:text-accent-300 tabular-nums">
                    {r.score}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-5">
            <HexLine>
              La crise la mieux gérée, c&apos;est celle dont on tire les leçons.
              Merci d&apos;avoir joué le jeu !
            </HexLine>
          </div>
        </div>
      )}
    </div>
  );
}
