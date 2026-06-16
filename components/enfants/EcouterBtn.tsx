// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useEffect, useState } from "react";

/**
 * Petit bouton « Écouter » : lit un texte à voix haute via l'API Web Speech
 * du navigateur (gratuit, aucune donnée envoyée, aucun token). Utile pour les
 * jeunes lecteurs et l'accessibilité. Masqué si le navigateur ne sait pas lire.
 */
export default function EcouterBtn({ texte }: { texte: string }) {
  const [supporte, setSupporte] = useState(false);
  const [parle, setParle] = useState(false);

  useEffect(() => {
    setSupporte(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* no-op */
      }
    };
  }, []);

  if (!supporte) return null;

  function lire() {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texte);
      u.lang = "fr-FR";
      u.rate = 0.95;
      u.pitch = 1.05;
      u.onend = () => setParle(false);
      u.onerror = () => setParle(false);
      setParle(true);
      window.speechSynthesis.speak(u);
    } catch {
      setParle(false);
    }
  }

  return (
    <button
      type="button"
      onClick={lire}
      aria-label="Écouter le texte à voix haute"
      className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-gray-200 px-3 py-1.5 transition active:scale-95"
    >
      <span aria-hidden="true">{parle ? "🔈" : "🔊"}</span> Écouter
    </button>
  );
}
