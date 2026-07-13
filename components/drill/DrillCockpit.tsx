"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Cockpit de l'HOTE : partage le code, lance l'exercice, pilote les manches
// (voter -> reveler -> suivante -> terminer) et voit les votes de la salle en
// direct. S'appuie sur le polling (useDrillState).

import { useState } from "react";
import { useDrillState, drillAction } from "./useDrillState";

export default function DrillCockpit({
  exerciseId,
  code,
  scenarioTitle,
}: {
  exerciseId: string;
  code: string;
  scenarioTitle: string;
}) {
  const { state, refresh } = useDrillState(exerciseId);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function advance() {
    if (busy) return;
    setBusy(true);
    await drillAction(exerciseId, { action: "advance" });
    await refresh();
    setBusy(false);
  }

  function copyLink() {
    const url = `${window.location.origin}/exercice/${code}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  const s = state?.session;
  const round = state?.round;
  const reveal = state?.reveal;
  const lb = state?.leaderboard;
  const avg =
    lb && lb.rows.length > 0
      ? Math.round(
          lb.rows.reduce((sum, r) => sum + r.score, 0) / lb.rows.length,
        )
      : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* En-tete */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-accent-500">
            Cockpit hôte
          </p>
          <h1 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300">
            {scenarioTitle}
          </h1>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300 inline-flex items-center gap-2">
          <span aria-hidden="true">👥</span>
          {state?.participantCount ?? 0} participant
          {(state?.participantCount ?? 0) > 1 ? "s" : ""}
        </span>
      </div>

      {/* Bloc code de salle (toujours visible tant que non terminé) */}
      {s?.status !== "ENDED" && (
        <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-900/40 bg-primary-50/50 dark:bg-primary-950/20 p-5 mb-5 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            Les participants rejoignent avec ce code sur{" "}
            <span className="font-mono">/exercice</span>
          </p>
          <p className="font-mono text-4xl font-extrabold tracking-[0.3em] text-primary-600 dark:text-accent-200 my-2">
            {code}
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="text-sm text-accent-600 dark:text-accent-300 underline hover:no-underline"
          >
            {copied ? "Lien copié ✓" : "Copier le lien d'invitation"}
          </button>
        </div>
      )}

      {/* Etat LOBBY */}
      {s?.status === "LOBBY" && (
        <div className="text-center py-6">
          <p className="text-gray-700 dark:text-gray-200 mb-4">
            Salle d&apos;attente. Lance quand tout le monde est là.
          </p>
          <button
            type="button"
            onClick={advance}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl text-lg shadow-md transition-colors"
          >
            {busy ? "…" : "Lancer l'exercice →"}
          </button>
        </div>
      )}

      {/* Etat RUNNING */}
      {s?.status === "RUNNING" && round && (
        <div>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
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

          {/* VOTING : liste des choix + compteur de votes */}
          {s.phase === "VOTING" && (
            <>
              <ul className="space-y-2 mb-4 list-none p-0">
                {round.choices.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3"
                  >
                    <span className="text-xl" aria-hidden="true">
                      {c.emoji}
                    </span>
                    <span className="text-sm text-gray-800 dark:text-gray-100">
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4">
                <span aria-hidden="true">📡 </span>
                <strong>{round.respondedCount}</strong> /{" "}
                {state?.participantCount ?? 0} ont voté
              </p>
            </>
          )}

          {/* REVEAL : agregation + verdict Hex */}
          {s.phase === "REVEAL" && reveal && (
            <>
              <ul className="space-y-2 mb-4 list-none p-0">
                {reveal.tally.map((t) => (
                  <li key={t.choiceId}>
                    <div className="flex items-center justify-between text-sm mb-1">
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
                      </span>
                      <span className="tabular-nums text-gray-500 dark:text-gray-400">
                        {t.pct}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.isBest ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl bg-accent-50 dark:bg-accent-950/30 p-3 mb-4 flex gap-2 items-start">
                <span className="text-xl leading-none" aria-hidden="true">
                  🦊
                </span>
                <p className="text-sm text-accent-900 dark:text-accent-100 leading-relaxed">
                  <span className="font-bold">Hex :</span> {reveal.hexVerdict}
                </p>
              </div>
            </>
          )}

          {state?.hostAction && (
            <div className="text-center">
              <button
                type="button"
                onClick={advance}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors"
              >
                {busy ? "…" : state.hostAction}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Etat ENDED : podium + classement */}
      {s?.status === "ENDED" && lb && (
        <div>
          <div className="text-center mb-5">
            <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300">
              Exercice terminé
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Score moyen de l&apos;équipe : <strong>{avg}</strong> / {lb.max}
            </p>
          </div>
          <ol className="space-y-2 list-none p-0 max-w-md mx-auto">
            {lb.rows.map((r) => (
              <li
                key={`${r.rank}-${r.name}`}
                className="flex items-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3"
              >
                <span className="w-7 text-center font-bold text-gray-500 dark:text-gray-400 tabular-nums">
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
          <div className="mt-6 rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4 text-center text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            <span aria-hidden="true">📄 </span>
            L&apos;attestation d&apos;exercice pour le registre (ReCyF objectif
            15 / NIS2) arrive en phase 2.
          </div>
        </div>
      )}
    </div>
  );
}
