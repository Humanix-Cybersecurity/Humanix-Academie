// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /auth/error - Page d'erreur Auth.js v5 personnalisee.
//
// Pourquoi cette page existe (pentest fix #10, 2026-05-24) :
//
// Sans `pages.error` configure dans la config Auth.js, certaines erreurs
// internes (notamment `?error=Configuration`) provoquaient un HTTP 500
// sur `/api/auth/error?error=Configuration`. Effets :
//   - Fingerprint Auth.js v5 expose (stack trace visible en dev, status
//     500 reconnaissable en prod)
//   - UX cassee (page blanche avec stack)
//
// Avec cette page custom + `pages: { error: "/auth/error" }` dans
// `lib/auth.ts`, on intercepte tous les codes d'erreur, on les traduit
// via `humanizeAuthError` (deja maintenu), et on rend toujours un 200
// avec message FR clair. Pas de 500 possible.
//
// Le code d'erreur reste accessible dans `?error=` mais on ne l'expose
// PAS textuellement (juste le message FR humanise).

import Link from "next/link";
import { humanizeAuthError } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

// Auth.js peut nous appeler avec ou sans `?error=X`. Si X est inconnu,
// on rend quand meme une page propre.
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const rawCode = params.error ?? null;
  const humanMessage = humanizeAuthError(rawCode);

  return (
    <main
      id="main-content"
      className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12"
    >
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/15 p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl" aria-hidden="true">
              ⚠️
            </span>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-amber-900 dark:text-amber-200">
                Connexion impossible
              </h1>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 leading-relaxed">
                {humanMessage}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 bg-primary-500 text-white font-semibold px-4 py-2 rounded-full hover:bg-primary-600"
            >
              Réessayer la connexion
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 font-medium px-4 py-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Retour à l'accueil
            </Link>
          </div>

          <p className="text-xs text-amber-700 dark:text-amber-300 italic mt-6">
            Si le problème persiste, contactez{" "}
            <a
              href="mailto:contact@humanix-cybersecurity.fr"
              className="underline hover:text-amber-900 dark:hover:text-amber-100"
            >
              contact@humanix-cybersecurity.fr
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

export const metadata = {
  title: "Connexion impossible - Humanix Académie",
  description:
    "Une erreur de connexion s'est produite. Vous pouvez réessayer ou contacter le support.",
  robots: { index: false, follow: false },
};
