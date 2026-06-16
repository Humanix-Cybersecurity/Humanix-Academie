// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useState } from "react";
import type { ActivitePaires } from "@/lib/enfants/types";
import type { COULEURS } from "@/lib/enfants/theme";
import HexDit from "./HexDit";
import EcouterBtn from "./EcouterBtn";

type Theme = (typeof COULEURS)[keyof typeof COULEURS];

export default function KidsPaires({
  activite,
  theme,
  onDone,
}: {
  activite: ActivitePaires;
  theme: Theme;
  onDone: (success: boolean) => void;
}) {
  // Colonne droite mélangée une seule fois (au montage).
  const [droite] = useState(() =>
    [...activite.paires].sort(() => Math.random() - 0.5),
  );
  const [selId, setSelId] = useState<string | null>(null);
  const [relies, setRelies] = useState<Set<string>>(new Set());
  const [erreurs, setErreurs] = useState(0);
  const [flashFaux, setFlashFaux] = useState(false);

  const gagne = relies.size >= activite.paires.length;

  function tapGauche(id: string) {
    if (relies.has(id)) return;
    setSelId((cur) => (cur === id ? null : id));
    setFlashFaux(false);
  }

  function tapDroite(id: string) {
    if (relies.has(id) || !selId) return;
    if (id === selId) {
      setRelies((prev) => new Set(prev).add(id));
      setSelId(null);
    } else {
      setErreurs((n) => n + 1);
      setFlashFaux(true);
      setSelId(null);
    }
  }

  const itemCls = (etat: "base" | "sel" | "ok") =>
    etat === "ok"
      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-700 opacity-70"
      : etat === "sel"
        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-600 ring-2 ring-amber-300"
        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-400";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <p className="text-center text-lg font-bold text-gray-800 dark:text-gray-100">
          {activite.consigne}
        </p>
        <EcouterBtn texte={activite.consigne} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Colonne gauche (dans l'ordre) */}
        <div className="space-y-3">
          {activite.paires.map((p) => {
            const ok = relies.has(p.id);
            const sel = selId === p.id;
            return (
              <button
                key={`g-${p.id}`}
                type="button"
                disabled={ok}
                aria-pressed={sel}
                onClick={() => tapGauche(p.id)}
                className={`w-full flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-left text-sm font-medium transition active:scale-95 ${itemCls(ok ? "ok" : sel ? "sel" : "base")}`}
              >
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {p.gauche.emoji}
                </span>
                <span className="flex-1">{p.gauche.label}</span>
                {ok && <span className="text-emerald-600">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Colonne droite (mélangée) */}
        <div className="space-y-3">
          {droite.map((p) => {
            const ok = relies.has(p.id);
            return (
              <button
                key={`d-${p.id}`}
                type="button"
                disabled={ok}
                onClick={() => tapDroite(p.id)}
                className={`w-full flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-left text-sm font-medium transition active:scale-95 ${itemCls(ok ? "ok" : "base")} ${flashFaux ? "animate-shake" : ""}`}
              >
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {p.droite.emoji}
                </span>
                <span className="flex-1">{p.droite.label}</span>
                {ok && <span className="text-emerald-600">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <p
        className="text-center text-sm font-bold text-gray-500"
        aria-live="polite"
      >
        Reliées : {relies.size} / {activite.paires.length}
      </p>

      {!gagne && selId && (
        <p className="text-center text-sm text-amber-600 font-medium">
          Touche maintenant la bonne carte à droite 👉
        </p>
      )}

      {gagne && (
        <div className="space-y-4" aria-live="polite">
          <HexDit mood="celebrate">
            Tout est relié, bravo ! Tu as une super mémoire 🧠
          </HexDit>
          <button
            type="button"
            onClick={() => onDone(erreurs === 0)}
            className={`w-full rounded-2xl ${theme.btn} text-white text-lg font-bold py-4 transition active:scale-95`}
          >
            Continuer ▶
          </button>
        </div>
      )}
    </div>
  );
}
