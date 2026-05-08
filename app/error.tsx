"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Error boundary global pour les routes app/. Next.js l'affiche pour toute
// erreur runtime non interceptée dans une route segment. Ton cosy comme la
// 404 : on rassure, on propose de réessayer, on redirige sans culpabiliser.
//
// Pour les erreurs DANS le root layout lui-même (rare), c'est global-error.tsx
// qui prend le relais avec son propre <html>/<body>.

import Link from "next/link";
import { useEffect } from "react";
import HexBackdrop from "@/components/HexBackdrop";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Loggué côté client pour observabilité (Sentry/console). On ne log pas
    // les détails sensibles : seulement le digest et le message si dispo.
    // eslint-disable-next-line no-console
    console.error("[humanix] page error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Petit accroc · pas de panique
          </p>
          <h1
            className="font-display text-5xl sm:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Quelque chose <span className="text-accent-500">a glissé</span>.
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up mb-8"
            style={{ animationDelay: "220ms" }}
          >
            On n'a pas réussi à charger cette page proprement. Ce n'est pas
            ta faute, c'est la nôtre. Réessaie une fois — souvent ça suffit.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up"
            style={{ animationDelay: "320ms" }}
          >
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 transition-colors shadow-md"
            >
              Réessayer
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-primary-500 dark:border-accent-300 text-primary-500 dark:text-accent-300 font-bold px-6 py-3 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
            >
              Retour à l'accueil
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-2xl text-primary-500 dark:text-accent-300 font-bold px-6 py-3 hover:underline"
            >
              Nous prévenir
            </Link>
          </div>

          {error.digest && (
            <p className="mt-10 text-xs text-gray-500 dark:text-gray-400 font-mono">
              Code de référence : <span className="select-all">{error.digest}</span>
            </p>
          )}
        </section>
      </HexBackdrop>

      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          « Une erreur n'est pas un échec - c'est un signal. On note, on
          répare, on continue. »
        </blockquote>
        <p
          aria-hidden="true"
          className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
        >
          - Hex veille
        </p>
      </div>
    </main>
  );
}
