// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useState } from "react";
import type { ActiviteBD, Choix } from "@/lib/enfants/types";
import type { COULEURS } from "@/lib/enfants/theme";
import HexDit from "./HexDit";
import EcouterBtn from "./EcouterBtn";

type Theme = (typeof COULEURS)[keyof typeof COULEURS];

const BULLE: Record<NonNullable<ActiviteBD["panels"][number]["qui"]>, string> = {
  hex: "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
  enfant: "bg-sky-50 border-sky-300 dark:bg-sky-950/40 dark:border-sky-800",
  piege: "bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800",
  narrateur:
    "bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700",
};

export default function KidsBD({
  activite,
  theme,
  onDone,
}: {
  activite: ActiviteBD;
  theme: Theme;
  onDone: (success: boolean) => void;
}) {
  const [i, setI] = useState(0);
  const [choix, setChoix] = useState<Choix | null>(null);
  const last = i >= activite.panels.length - 1;
  const panel = activite.panels[i];

  // Phase « choix / morale » une fois la dernière case atteinte.
  const enFin = last;

  return (
    <div className="space-y-5">
      {/* Case de BD */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 p-6 sm:p-8 text-center shadow-sm">
        <div className="text-7xl sm:text-8xl mb-3" aria-hidden="true">
          {panel.emoji}
        </div>
        {panel.texte && (
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-3">
            {panel.texte}
          </p>
        )}
        {panel.bulle && (
          <div
            className={`mx-auto max-w-md rounded-2xl border-2 px-4 py-3 text-base sm:text-lg font-medium ${
              BULLE[panel.qui ?? "narrateur"]
            }`}
          >
            {panel.qui === "hex" && (
              <span className="mr-1" aria-hidden="true">
                🦊
              </span>
            )}
            {panel.bulle}
          </div>
        )}
      </div>

      {(panel.texte || panel.bulle) && (
        <div className="flex justify-center">
          <EcouterBtn texte={[panel.texte, panel.bulle].filter(Boolean).join(". ")} />
        </div>
      )}

      {/* Navigation entre cases */}
      {!enFin && (
        <button
          type="button"
          onClick={() => setI((n) => n + 1)}
          className={`w-full rounded-2xl ${theme.btn} text-white text-lg font-bold py-4 transition active:scale-95`}
        >
          Suivant ▶
        </button>
      )}

      {/* Fin : choix (si question) puis morale */}
      {enFin && activite.question && !choix && (
        <div className="space-y-3">
          <p className="text-center text-lg font-bold text-gray-800 dark:text-gray-100">
            {activite.question.consigne}
          </p>
          {activite.question.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setChoix(o)}
              className="w-full rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 text-left text-base sm:text-lg font-medium hover:border-gray-400 dark:hover:border-slate-500 transition active:scale-95 flex items-center gap-3"
            >
              {o.emoji && (
                <span className="text-2xl" aria-hidden="true">
                  {o.emoji}
                </span>
              )}
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}

      {enFin && choix && (
        <div className="space-y-4" aria-live="polite">
          <HexDit mood={choix.bon ? "celebrate" : "think"}>
            {choix.reaction}
          </HexDit>
          <div
            className={`rounded-2xl ${theme.soft} border-2 ${theme.ring} px-4 py-3 text-center`}
          >
            <span className="text-sm uppercase tracking-wide font-bold text-gray-500">
              À retenir
            </span>
            <p className={`text-base sm:text-lg font-bold ${theme.text}`}>
              💡 {activite.morale}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDone(choix.bon)}
            className={`w-full rounded-2xl ${theme.btn} text-white text-lg font-bold py-4 transition active:scale-95`}
          >
            Continuer ▶
          </button>
        </div>
      )}

      {/* Fin sans question : morale directe */}
      {enFin && !activite.question && (
        <div className="space-y-4">
          <div
            className={`rounded-2xl ${theme.soft} border-2 ${theme.ring} px-4 py-3 text-center`}
          >
            <p className={`text-base sm:text-lg font-bold ${theme.text}`}>
              💡 {activite.morale}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDone(true)}
            className={`w-full rounded-2xl ${theme.btn} text-white text-lg font-bold py-4 transition active:scale-95`}
          >
            Continuer ▶
          </button>
        </div>
      )}
    </div>
  );
}
