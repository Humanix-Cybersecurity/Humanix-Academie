// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import type { Monde } from "@/lib/enfants/types";
import { COULEURS } from "@/lib/enfants/theme";
import HexDit from "./HexDit";
import KidsBD from "./KidsBD";
import KidsRepere from "./KidsRepere";
import KidsTri from "./KidsTri";
import KidsQuiz from "./KidsQuiz";

/** Sauvegarde locale (jamais en base : enfants = aucune donnée serveur). */
function saveStars(slug: string, stars: number) {
  try {
    const key = `hex-ecole.${slug}`;
    const prev = JSON.parse(localStorage.getItem(key) || "{}");
    const best = Math.max(Number(prev.bestStars) || 0, stars);
    localStorage.setItem(key, JSON.stringify({ done: true, bestStars: best }));
  } catch {
    // localStorage indisponible (navigation privée…) : on ignore, c'est cosmétique.
  }
}

export default function KidsParcoursPlayer({ monde }: { monde: Monde }) {
  const theme = COULEURS[monde.couleur];
  const total = monde.activites.length;
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [fini, setFini] = useState(false);

  useEffect(() => {
    if (!fini) return;
    saveStars(monde.slug, stars);
    // Pluie de confettis pour fêter la fin 🎉
    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch {
      /* no-op */
    }
  }, [fini, monde.slug, stars]);

  function onDone(success: boolean) {
    const newStars = stars + (success ? 1 : 0);
    setStars(newStars);
    if (index >= total - 1) {
      setFini(true);
    } else {
      setIndex((n) => n + 1);
    }
  }

  function rejouer() {
    setIndex(0);
    setStars(0);
    setFini(false);
  }

  // --- Écran de fin ---
  if (fini) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center space-y-6">
        <div className="text-7xl" aria-hidden="true">
          🎉
        </div>
        <h1 className="font-display text-3xl font-extrabold text-gray-900 dark:text-white">
          Bravo, parcours terminé !
        </h1>
        <div
          className="text-4xl tracking-widest"
          aria-label={`Tu as gagné ${stars} étoile${stars > 1 ? "s" : ""} sur ${total}`}
        >
          {Array.from({ length: total }, (_, i) => (
            <span key={i} aria-hidden="true">
              {i < stars ? "⭐" : "☆"}
            </span>
          ))}
        </div>
        <HexDit mood="celebrate" size="lg">
          {stars === total
            ? "Sans aucune faute ! Tu es un vrai détective du Net 🕵️"
            : "Super travail ! Tu connais déjà plein de réflexes malins."}
        </HexDit>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={rejouer}
            className={`rounded-2xl ${theme.btn} text-white text-lg font-bold px-6 py-4 transition active:scale-95`}
          >
            🔁 Rejouer
          </button>
          <Link
            href="/famille/enfants"
            className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-bold px-6 py-4 transition active:scale-95"
          >
            🏡 Retour aux mondes
          </Link>
        </div>
      </div>
    );
  }

  const activite = monde.activites[index];

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${theme.grad} bg-fixed`}
    >
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Barre du haut : retour + progression */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/famille/enfants"
            className="text-white/90 hover:text-white text-sm font-bold bg-black/10 rounded-full px-3 py-1.5"
          >
            ✕ Quitter
          </Link>
          <div className="flex items-center gap-1.5" aria-label={`Étape ${index + 1} sur ${total}`}>
            {monde.activites.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i <= index ? "bg-white" : "bg-white/40"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* Carte blanche qui contient l'activité courante */}
        <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur p-4 sm:p-6 shadow-xl">
          <h2 className="text-center text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">
            {activite.titre}
          </h2>
          {activite.type === "bd" && (
            <KidsBD activite={activite} theme={theme} onDone={onDone} />
          )}
          {activite.type === "repere" && (
            <KidsRepere activite={activite} theme={theme} onDone={onDone} />
          )}
          {activite.type === "tri" && (
            <KidsTri activite={activite} theme={theme} onDone={onDone} />
          )}
          {activite.type === "quiz" && (
            <KidsQuiz activite={activite} theme={theme} onDone={onDone} />
          )}
        </div>
      </div>
    </div>
  );
}
