// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useState } from "react";
import type { ActiviteQuiz, Choix } from "@/lib/enfants/types";
import type { COULEURS } from "@/lib/enfants/theme";
import HexDit from "./HexDit";

type Theme = (typeof COULEURS)[keyof typeof COULEURS];

export default function KidsQuiz({
  activite,
  theme,
  onDone,
}: {
  activite: ActiviteQuiz;
  theme: Theme;
  onDone: (success: boolean) => void;
}) {
  const [choix, setChoix] = useState<Choix | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 p-6 sm:p-8 text-center shadow-sm">
        <div className="text-7xl sm:text-8xl mb-3" aria-hidden="true">
          {activite.emoji}
        </div>
        <p className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
          {activite.question}
        </p>
      </div>

      {!choix ? (
        <div className="space-y-3">
          {activite.options.map((o) => (
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
      ) : (
        <div className="space-y-4" aria-live="polite">
          <HexDit mood={choix.bon ? "celebrate" : "think"}>
            {choix.reaction}
          </HexDit>
          <button
            type="button"
            onClick={() => onDone(choix.bon)}
            className={`w-full rounded-2xl ${theme.btn} text-white text-lg font-bold py-4 transition active:scale-95`}
          >
            Continuer ▶
          </button>
        </div>
      )}
    </div>
  );
}
