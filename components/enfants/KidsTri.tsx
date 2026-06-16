// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useState } from "react";
import type { ActiviteTri } from "@/lib/enfants/types";
import type { COULEURS } from "@/lib/enfants/theme";
import HexDit from "./HexDit";

type Theme = (typeof COULEURS)[keyof typeof COULEURS];

export default function KidsTri({
  activite,
  theme,
  onDone,
}: {
  activite: ActiviteTri;
  theme: Theme;
  onDone: (success: boolean) => void;
}) {
  const [i, setI] = useState(0);
  const [reponse, setReponse] = useState<null | { bon: boolean; reaction: string }>(
    null,
  );
  const [erreurs, setErreurs] = useState(0);

  const carte = activite.cartes[i];

  function repondre(cote: "gauche" | "droite") {
    const bon = cote === carte.bon;
    if (!bon) setErreurs((n) => n + 1);
    setReponse({ bon, reaction: carte.reaction });
  }

  function suivante() {
    if (i >= activite.cartes.length - 1) {
      onDone(erreurs === 0);
      return;
    }
    setI((n) => n + 1);
    setReponse(null);
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-lg font-bold text-gray-800 dark:text-gray-100">
        {activite.consigne}
      </p>
      <p className="text-center text-sm font-bold text-gray-400">
        Carte {i + 1} / {activite.cartes.length}
      </p>

      {/* Carte courante */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 p-6 sm:p-8 text-center shadow-sm min-h-[10rem] flex flex-col items-center justify-center">
        <div className="text-6xl sm:text-7xl mb-3" aria-hidden="true">
          {carte.emoji}
        </div>
        <p className="text-lg sm:text-xl font-medium text-gray-800 dark:text-gray-100">
          {carte.label}
        </p>
      </div>

      {!reponse ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => repondre("gauche")}
            className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 py-5 text-lg font-bold text-emerald-700 dark:text-emerald-300 transition active:scale-95"
          >
            <span className="text-3xl block mb-1" aria-hidden="true">
              {activite.gauche.emoji}
            </span>
            {activite.gauche.label}
          </button>
          <button
            type="button"
            onClick={() => repondre("droite")}
            className="rounded-2xl border-2 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 py-5 text-lg font-bold text-rose-700 dark:text-rose-300 transition active:scale-95"
          >
            <span className="text-3xl block mb-1" aria-hidden="true">
              {activite.droite.emoji}
            </span>
            {activite.droite.label}
          </button>
        </div>
      ) : (
        <div className="space-y-4" aria-live="polite">
          <HexDit mood={reponse.bon ? "celebrate" : "think"}>
            {reponse.bon ? "Bravo ! " : "Presque ! "}
            {reponse.reaction}
          </HexDit>
          <button
            type="button"
            onClick={suivante}
            className={`w-full rounded-2xl ${theme.btn} text-white text-lg font-bold py-4 transition active:scale-95`}
          >
            {i >= activite.cartes.length - 1 ? "Terminer ▶" : "Suivante ▶"}
          </button>
        </div>
      )}
    </div>
  );
}
