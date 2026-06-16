// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useState } from "react";
import type { ActiviteRepere } from "@/lib/enfants/types";
import type { COULEURS } from "@/lib/enfants/theme";
import HexDit from "./HexDit";

type Theme = (typeof COULEURS)[keyof typeof COULEURS];

export default function KidsRepere({
  activite,
  theme,
  onDone,
}: {
  activite: ActiviteRepere;
  theme: Theme;
  onDone: (success: boolean) => void;
}) {
  const totalPieges = activite.elements.filter((e) => e.piege).length;
  const [found, setFound] = useState<Set<string>>(new Set());
  const [reaction, setReaction] = useState<string | null>(null);

  const gagne = found.size >= totalPieges;

  function tap(id: string, piege: boolean, r: string) {
    setReaction(r);
    if (piege && !found.has(id)) {
      setFound((prev) => new Set(prev).add(id));
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-lg font-bold text-gray-800 dark:text-gray-100">
        {activite.consigne}
      </p>

      {/* Écran simulé */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
        <p className="text-center text-sm text-gray-500 mb-4">{activite.ecran}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activite.elements.map((el) => {
            const trouve = found.has(el.id);
            return (
              <button
                key={el.id}
                type="button"
                aria-pressed={trouve}
                onClick={() => tap(el.id, el.piege, el.reaction)}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-base font-medium transition active:scale-95 ${
                  trouve
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-700"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-400"
                }`}
              >
                <span className="text-3xl shrink-0" aria-hidden="true">
                  {el.emoji}
                </span>
                <span className="flex-1">{el.texte}</span>
                {trouve && (
                  <span className="text-xl text-emerald-600" aria-label="trouvé">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compteur + réaction */}
      <p className="text-center text-sm font-bold text-gray-500" aria-live="polite">
        Pièges trouvés : {found.size} / {totalPieges}
      </p>
      {reaction && !gagne && <HexDit mood="curious">{reaction}</HexDit>}

      {gagne && (
        <div className="space-y-4" aria-live="polite">
          <HexDit mood="celebrate">
            Tu les as tous trouvés ! Tu as l&apos;œil d&apos;un vrai détective 🕵️
          </HexDit>
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
