// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Porte d'entree apprenant vers un exercice de crise en direct (#746).
// Avant, un apprenant ne pouvait atteindre /exercice/[code] que via une URL
// envoyee hors plateforme. Ce champ lui permet de saisir le code de salle
// donne par l'organisateur.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Meme normalisation que la route /exercice/[code] (code stocke en MAJUSCULES).
function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

export default function JoinExerciseCard() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const clean = normalizeCode(code);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clean) return;
    setSubmitting(true);
    router.push(`/exercice/${clean}`);
  };

  return (
    <section aria-labelledby="join-exercice-title">
      <div className="rounded-3xl border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-950/30 dark:via-slate-900 dark:to-orange-950/20 p-6 sm:p-8">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="text-5xl shrink-0" aria-hidden="true">
            🚨
          </span>
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs uppercase tracking-widest font-bold text-red-600 dark:text-red-300 mb-1">
              Exercice de crise en direct
            </p>
            <h2
              id="join-exercice-title"
              className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-2"
            >
              J&apos;ai un code d&apos;exercice
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
              Ton organisateur lance une simulation de crise cyber ? Entre le
              code de salle qu&apos;il t&apos;a communiqué pour rejoindre la
              session.
            </p>
            <form
              onSubmit={submit}
              className="flex flex-wrap gap-2 items-center"
            >
              <label htmlFor="exercice-code" className="sr-only">
                Code de salle
              </label>
              <input
                id="exercice-code"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex : 4F7K2P"
                aria-describedby="exercice-code-hint"
                className="font-mono tracking-[0.3em] uppercase text-lg w-40 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-accent-500"
              />
              <button
                type="submit"
                disabled={!clean || submitting}
                className="rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 transition-colors"
              >
                {submitting ? "Connexion…" : "Rejoindre"}
              </button>
            </form>
            <p
              id="exercice-code-hint"
              className="text-xs text-gray-500 dark:text-gray-400 mt-2"
            >
              La session doit appartenir à ton organisation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
