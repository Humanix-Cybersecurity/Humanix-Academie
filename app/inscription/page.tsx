// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page d'inscription publique côté apprenant gratuit (Niveau 3 du modèle
// 3-layer). Tout user qui s'inscrit ici atterrit dans le tenant Communauté
// avec role LEARNER. Voir lib/tenant-community.ts + lib/inscription-intent.ts
// pour le rationale.
//
// MODES :
//   - DEMO_MODE on  → redirect vers /demo (le flow inscription est désactivé
//     parce qu'en démo on a déjà des comptes prêts à essayer).
//   - DEMO_MODE off → page accessible publiquement.
//
// 4 voies d'inscription proposées (toutes actives quand env vars présents) :
//   1. Magic link (Scaleway TEM) — fallback universel sans dépendance externe
//   2. Google
//   3. Apple
//   4. Microsoft Entra ID
//
// Aucune voie ne crée de password : l'identité d'authentification est
// déléguée au provider externe, on s'affranchit de la gestion mot de passe
// (vérif email, reset, oubli, rotation) et l'expérience utilisateur reste
// minimale.

import Link from "next/link";
import { redirect } from "next/navigation";
import HexBackdrop from "@/components/HexBackdrop";
import {
  startSsoInscription,
  startMagicLinkInscription,
} from "./actions";

const isDemoMode = process.env.DEMO_MODE === "true";

type SsoEnabled = {
  google: boolean;
  microsoft: boolean;
  apple: boolean;
};

function detectSsoEnabled(): SsoEnabled {
  return {
    google: !!(
      process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ),
    microsoft: !!(
      process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
    ),
    apple: !!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
  };
}

export const metadata = {
  title: "Inscription gratuite — Humanix Académie",
  description:
    "Crée ton compte apprenant gratuit pour accéder aux modules Humanix Académie. Connexion via magic link, Google, Apple ou Microsoft. Sans mot de passe à retenir.",
  alternates: { canonical: "/inscription" },
  openGraph: {
    title: "Inscription gratuite — Humanix Académie",
    description:
      "Apprends la cybersécurité au rythme de la communauté. Inscription en 1 clic, sans mot de passe.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inscription gratuite — Humanix Académie",
    description:
      "1 clic, sans mot de passe. Magic link, Google, Apple ou Microsoft.",
  },
};

export default function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isDemoMode) {
    // En démo, on n'ouvre pas l'inscription publique : les apprenants
    // potentiels passent par /demo et choisissent un compte fictif.
    redirect("/demo");
  }
  return <InscriptionInner searchParams={searchParams} />;
}

async function InscriptionInner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sso = detectSsoEnabled();
  const params = await searchParams;
  const errorMsg = params.error
    ? errorMessageFromCode(params.error)
    : null;
  const anySso = sso.google || sso.microsoft || sso.apple;

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-md mx-auto px-4 pt-12 pb-6 sm:pt-16 sm:pb-8 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            🌱 Inscription gratuite · Communauté Humanix
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-3">
            Apprends la cyber, à ton rythme.
          </h1>
          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            Accès libre aux modules pédagogiques. Pas de carte bancaire,
            pas de mot de passe à retenir.
          </p>
        </section>
      </HexBackdrop>

      <section className="max-w-md mx-auto px-4 pb-16">
        {errorMsg && (
          <div
            role="alert"
            className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 mb-4"
          >
            {errorMsg}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 p-5 space-y-4">
          {/* SSO providers — un par un, action server-side */}
          {anySso && (
            <>
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                Continuer avec
              </h2>
              <div className="space-y-2">
                {sso.google && (
                  <form
                    action={async () => {
                      "use server";
                      await startSsoInscription("google");
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-accent-300 hover:shadow-sm px-4 py-3 transition-colors text-sm font-medium"
                    >
                      <SsoLogo provider="google" />
                      <span>Continuer avec Google</span>
                    </button>
                  </form>
                )}
                {sso.apple && (
                  <form
                    action={async () => {
                      "use server";
                      await startSsoInscription("apple");
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-900 dark:border-white bg-gray-900 dark:bg-black text-white px-4 py-3 transition-colors hover:bg-black text-sm font-medium"
                    >
                      <SsoLogo provider="apple" />
                      <span>Continuer avec Apple</span>
                    </button>
                  </form>
                )}
                {sso.microsoft && (
                  <form
                    action={async () => {
                      "use server";
                      await startSsoInscription("microsoft-entra-id");
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-accent-300 hover:shadow-sm px-4 py-3 transition-colors text-sm font-medium"
                    >
                      <SsoLogo provider="microsoft" />
                      <span>Continuer avec Microsoft</span>
                    </button>
                  </form>
                )}
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                <span className="text-xs text-gray-500">ou</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
              </div>
            </>
          )}

          {/* Magic link — fallback universel */}
          <form action={startMagicLinkInscription} className="space-y-2">
            <label
              htmlFor="inscription-email"
              className="block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Recevoir un lien magique par email
            </label>
            <input
              id="inscription-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="prenom.nom@exemple.fr"
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
            />
            <button
              type="submit"
              className="btn-primary w-full"
            >
              Envoyer le lien
            </button>
            <p className="text-xs text-gray-500">
              On t&apos;envoie un lien à usage unique. Ouvre-le sur le même
              appareil. Le lien expire après 24 h.
            </p>
          </form>
        </div>

        <p className="text-xs text-center text-gray-500 mt-6">
          En t&apos;inscrivant, tu acceptes nos{" "}
          <Link
            href="/cgu"
            className="text-accent-700 hover:underline"
          >
            Conditions générales
          </Link>{" "}
          et notre{" "}
          <Link
            href="/confidentialite"
            className="text-accent-700 hover:underline"
          >
            Politique de confidentialité
          </Link>
          .
        </p>
        <p className="text-sm text-center text-gray-600 dark:text-gray-300 mt-4">
          Tu as déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="text-accent-700 font-medium hover:underline"
          >
            Connexion
          </Link>
        </p>
        <p className="text-xs text-center text-gray-500 mt-6">
          Ton organisation cherche un abonnement ?{" "}
          <Link
            href="/contact?sujet=abonnement"
            className="text-accent-700 hover:underline"
          >
            Contactez-nous
          </Link>{" "}
          pour le pack PME.
        </p>
      </section>
    </main>
  );
}

function errorMessageFromCode(code: string): string {
  switch (code) {
    case "invalid_email":
      return "Adresse email invalide. Vérifie l'orthographe et réessaye.";
    case "invalid_provider":
      return "Méthode de connexion non supportée.";
    default:
      return "Une erreur est survenue. Réessaye dans un instant.";
  }
}

// SsoLogo : icônes inline (pas d'image externe → pas de requête CDN, pas
// de fuite de l'IP visiteur vers Google/Apple/Microsoft avant qu'il ne
// clique).
function SsoLogo({ provider }: { provider: "google" | "apple" | "microsoft" }) {
  if (provider === "google") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1 0-3.4 2.7-6.1 6-6.1 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12s4.2 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.2-.2-1.6H12z"
        />
      </svg>
    );
  }
  if (provider === "apple") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M16.4 12.6c0-2.8 2.3-4.1 2.4-4.2-1.3-1.9-3.3-2.2-4-2.2-1.7-.2-3.3 1-4.1 1-.9 0-2.2-1-3.6-1-1.8 0-3.6 1.1-4.5 2.7-2 3.4-.5 8.5 1.4 11.3.9 1.4 2 2.9 3.4 2.8 1.4-.1 1.9-.9 3.5-.9s2.1.9 3.6.9c1.5 0 2.4-1.4 3.3-2.7 1.1-1.6 1.5-3.1 1.5-3.2-.1 0-2.9-1.1-2.9-4.5zm-2.7-8.2c.7-.9 1.3-2.1 1.1-3.4-1.1.1-2.5.8-3.2 1.6-.7.8-1.4 2.1-1.2 3.3 1.3.1 2.5-.6 3.3-1.5z" />
      </svg>
    );
  }
  // microsoft
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
