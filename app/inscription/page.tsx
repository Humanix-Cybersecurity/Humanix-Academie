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
import HexMascot from "@/components/HexMascot";
import {
  startSsoInscription,
  startMagicLinkInscription,
} from "./actions";

// force-dynamic : meme rationale que /demo/layout.tsx. La decision
// de rediriger vers /demo depend de DEMO_MODE qui n'est pas set au build,
// donc on doit evaluer a runtime.
export const dynamic = "force-dynamic";

const isDemoMode = process.env.DEMO_MODE === "true";

type InscriptionErrorCode = "invalid_email" | "invalid_provider";

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
  searchParams: Promise<{ error?: InscriptionErrorCode }>;
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
  searchParams: Promise<{ error?: InscriptionErrorCode }>;
}) {
  const sso = detectSsoEnabled();
  const params = await searchParams;
  const errorMsg = params.error
    ? errorMessageFromCode(params.error)
    : null;
  const anySso = sso.google || sso.microsoft || sso.apple;

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ==================== HERO ====================
          pb-10 sm:pb-12 pour donner de l'air avant que les trust badges
          + card AUTH commencent. */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-xl mx-auto px-4 pt-10 pb-10 sm:pt-14 sm:pb-12 text-center">
          <div className="mb-4 flex justify-center">
            <HexMascot mood="happy" size="lg" animated />
          </div>
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            🌱 Inscription gratuite · Communauté Humanix
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-3">
            Apprends la cyber,
            <br className="hidden sm:block" /> à ton rythme.
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed max-w-md mx-auto">
            Accès libre aux modules pédagogiques. Pas de carte bancaire,
            pas de mot de passe à retenir.
          </p>
        </section>
      </HexBackdrop>

      {/* ==================== TRUST SIGNALS ==================== */}
      <section
        aria-label="Garanties"
        className="max-w-3xl mx-auto px-4 -mt-2 mb-6"
      >
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
          {TRUST_BADGES.map((b) => (
            <li
              key={b.label}
              className="flex flex-col items-center gap-1 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/80 px-2 py-3 backdrop-blur-sm"
            >
              <span className="text-xl" aria-hidden="true">
                {b.emoji}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-100 leading-tight">
                {b.label}
              </span>
              <span className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                {b.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ==================== AUTH CARD ====================
          Le card "mord" sur les trust badges au-dessus via -mt-2 + shadow-xl
          pour donner un sentiment d'integration visuel forte (au lieu du
          shadow-sm initial qui flottait dans le vide). */}
      <section className="max-w-md mx-auto px-4 pb-12 relative z-10">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 rounded-xl p-3 mb-4"
          >
            <span aria-hidden="true">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-gray-200 dark:border-slate-700 shadow-xl p-5 sm:p-6 space-y-5">
          {/* SSO providers — un par un, action server-side */}
          {anySso && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                En 1 clic
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
                      className="group w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-accent-400 hover:shadow-md hover:-translate-y-px px-4 py-3 transition-all text-sm font-semibold text-gray-800 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
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
                      className="group w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-900 dark:border-white bg-gray-900 dark:bg-black text-white px-4 py-3 transition-all hover:shadow-md hover:-translate-y-px text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
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
                      className="group w-full flex items-center justify-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-accent-400 hover:shadow-md hover:-translate-y-px px-4 py-3 transition-all text-sm font-semibold text-gray-800 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                    >
                      <SsoLogo provider="microsoft" />
                      <span>Continuer avec Microsoft</span>
                    </button>
                  </form>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                  ou par email
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
              </div>
            </div>
          )}

          {/* Magic link — fallback universel */}
          <form action={startMagicLinkInscription} className="space-y-3">
            {!anySso && (
              <h2 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                Lien magique par email
              </h2>
            )}
            <label
              htmlFor="inscription-email"
              className="block text-sm font-semibold text-gray-800 dark:text-gray-100"
            >
              Ton adresse email
            </label>
            <input
              id="inscription-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="prenom.nom@exemple.fr"
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-200 dark:focus:ring-accent-500/30 focus:outline-none transition"
            />
            <button
              type="submit"
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <span aria-hidden="true">✉️</span>
              <span>Recevoir mon lien magique</span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <span aria-hidden="true">🔒</span> Lien à usage unique, valable
              24 h. Ouvre-le sur le même appareil pour finaliser ton
              inscription.
            </p>
          </form>
        </div>

        {/* ==================== FOOTER LINKS ==================== */}
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Tu as déjà un compte ?{" "}
            <Link
              href="/connexion"
              className="text-accent-700 dark:text-accent-300 font-semibold hover:underline"
            >
              Connexion
            </Link>
          </p>

          <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/60 px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              🏢 Pour ton organisation ?
            </span>{" "}
            Pack PME, Enterprise, SecNumCloud :{" "}
            <Link
              href="/contact?sujet=abonnement"
              className="text-accent-700 dark:text-accent-300 font-semibold hover:underline"
            >
              parlons-en
            </Link>
            .
          </div>

          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            En t&apos;inscrivant, tu acceptes nos{" "}
            <Link
              href="/cgu"
              className="text-accent-700 dark:text-accent-300 hover:underline"
            >
              Conditions générales
            </Link>{" "}
            et notre{" "}
            <Link
              href="/confidentialite"
              className="text-accent-700 dark:text-accent-300 hover:underline"
            >
              Politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

const TRUST_BADGES = [
  {
    emoji: "🇫🇷",
    label: "Souverain FR",
    detail: "Hébergement Scaleway",
  },
  {
    emoji: "💳",
    label: "Sans CB",
    detail: "Aucun paiement",
  },
  {
    emoji: "🔓",
    label: "AGPLv3",
    detail: "Open source",
  },
  {
    emoji: "🪪",
    label: "RGPD",
    detail: "Données minimales",
  },
] as const;

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
