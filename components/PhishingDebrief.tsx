// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";
//
// Composant client : debrief IA personnalise sur la landing /phishing/[token].
//
// Fetch /api/phishing/[token]/debrief au mount, affiche un skeleton pendant
// le call (~3-5s pour Mistral), puis le texte une fois recu. Si erreur ou
// pas de cle API, on n'affiche RIEN -- le debrief hardcoded existant
// (markers du template) reste visible et fait office de fallback.
//
// Pourquoi un composant client plutot que server :
//   - L'appel Mistral prend 3-5s ; faire le server-side bloquerait le render
//     de la page entiere. Cote UX, on prefere :
//       1. Render immediat du contenu hardcoded (markers, CTAs)
//       2. Skeleton "Hex prepare un debrief perso..."
//       3. Apparition fluide du texte IA quand ready
//   - Permet aussi un retry user si on echoue, sans recharger la page.

import { useEffect, useState } from "react";

type State =
  | { kind: "loading" }
  | { kind: "ready"; text: string }
  | { kind: "error" };

export default function PhishingDebrief({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/phishing/${token}/debrief`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { ok: boolean; text?: string; error?: string }) => {
        if (cancelled) return;
        if (data.ok && data.text) {
          setState({ kind: "ready", text: data.text });
        } else {
          setState({ kind: "error" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // En cas d'erreur, on ne montre RIEN : le contenu pedagogique hardcoded
  // (markers, AskHexExplain) fait office de fallback complet. Pas de message
  // d'erreur visible pour ne pas detourner de la pedagogie.
  if (state.kind === "error") return null;

  return (
    <div className="rounded-2xl border-2 border-accent-200 dark:border-accent-900/50 bg-gradient-to-br from-accent-50 to-white dark:from-accent-950/30 dark:to-slate-900 p-5 mb-6">
      <p className="text-xs uppercase tracking-widest font-bold text-accent-700 dark:text-accent-300 mb-3 flex items-center gap-2">
        <span aria-hidden="true">🦊</span>
        Debrief personnalise par Hex
      </p>
      {state.kind === "loading" ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-accent-100 dark:bg-accent-900/40 rounded w-full" />
          <div className="h-3 bg-accent-100 dark:bg-accent-900/40 rounded w-11/12" />
          <div className="h-3 bg-accent-100 dark:bg-accent-900/40 rounded w-10/12" />
          <div className="h-3 bg-accent-100 dark:bg-accent-900/40 rounded w-9/12" />
          <p className="text-xs text-accent-700/70 dark:text-accent-300/70 italic mt-3">
            Hex prepare un debrief adapte a ton historique...
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
          {state.text}
        </p>
      )}
    </div>
  );
}
