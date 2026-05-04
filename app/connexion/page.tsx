// SPDX-License-Identifier: AGPL-3.0-or-later
// Page de connexion : 3 voies au choix
//  1. SSO Google (1 clic, si compte deja invite)
//  2. SSO Microsoft / Entra ID (1 clic, idem)
//  3. Magic link email (fallback universel)
//
// NEXT 15 SUSPENSE : useSearchParams() exige un <Suspense> boundary, sinon
// la page n'est plus pre-renderable statiquement. On wrappe dans un
// <Suspense> + on isole le contenu dans un sous-composant.
"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type SsoProviders = { google: boolean; microsoft: boolean };

export default function ConnexionPage() {
  return (
    <Suspense fallback={<ConnexionFallback />}>
      <ConnexionInner />
    </Suspense>
  );
}

function ConnexionFallback() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-4xl opacity-40 animate-pulse" aria-hidden="true">
        🦊
      </div>
      <p className="text-sm text-gray-500 mt-3">Chargement…</p>
    </div>
  );
}

function ConnexionInner() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sso, setSso] = useState<SsoProviders>({
    google: false,
    microsoft: false,
  });
  const params = useSearchParams();
  const errorCode = params.get("error");

  // Detection runtime des providers SSO actifs (cf. lib/auth.ts).
  // Auth.js expose /api/auth/providers qui liste les providers configures.
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((p: Record<string, unknown>) => {
        setSso({
          google: !!p["google"],
          microsoft: !!p["microsoft-entra-id"],
        });
      })
      .catch(() => setSso({ google: false, microsoft: false }));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await signIn("resend", {
      email,
      redirect: false,
      callbackUrl: "/apprendre",
    });
    setSent(true);
    setSending(false);
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">📬</div>
        <h1 className="text-2xl font-bold text-primary-500 mb-3">
          Mail envoyé !
        </h1>
        <p className="text-gray-600">
          On vient de t'envoyer un lien magique sur <strong>{email}</strong>.
          Clique dessus pour entrer.
        </p>
        <p className="text-sm text-gray-400 mt-4">
          (Pense à vérifier tes spams s'il n'arrive pas tout de suite.)
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-humanix-academie-192.png"
            alt="Humanix Académie"
            className="h-24 w-auto mx-auto"
          />
        </div>
        <h1 className="text-3xl font-bold text-primary-500">Connexion</h1>
        <p className="text-gray-600 mt-2">
          Pas de mot de passe à créer : connexion SSO ou lien magique.
        </p>
      </div>

      {/* Erreur SSO si applicable */}
      {errorCode && (
        <div
          role="alert"
          className="card mb-4 bg-amber-50 border-amber-300 text-amber-900 text-sm"
        >
          {errorCode === "NoAccount" && (
            <p>
              <strong>Aucun compte trouvé pour cette adresse.</strong> Demandez
              à votre administrateur de vous inviter d'abord.
            </p>
          )}
          {errorCode === "AccountSuspended" && (
            <p>
              <strong>Votre compte est suspendu.</strong> Contactez votre
              administrateur.
            </p>
          )}
          {!["NoAccount", "AccountSuspended"].includes(errorCode) && (
            <p>Erreur de connexion : {errorCode}.</p>
          )}
        </div>
      )}

      {/* Boutons SSO (visibles uniquement si configures) */}
      {(sso.google || sso.microsoft) && (
        <div className="space-y-2 mb-6">
          {sso.microsoft && (
            <button
              type="button"
              onClick={() =>
                signIn("microsoft-entra-id", { callbackUrl: "/apprendre" })
              }
              className="w-full flex items-center justify-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition font-medium text-sm"
              aria-label="Se connecter avec Microsoft"
            >
              <MicrosoftLogo />
              Continuer avec Microsoft
            </button>
          )}
          {sso.google && (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/apprendre" })}
              className="w-full flex items-center justify-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition font-medium text-sm"
              aria-label="Se connecter avec Google"
            >
              <GoogleLogo />
              Continuer avec Google
            </button>
          )}
        </div>
      )}

      {(sso.google || sso.microsoft) && (
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            ou
          </span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
        </div>
      )}

      {/* Magic link */}
      <form
        onSubmit={onSubmit}
        className="card space-y-4"
        aria-describedby="connexion-aide"
      >
        <div>
          <label
            htmlFor="connexion-email"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
          >
            Ton email professionnel{" "}
            <span className="text-warn" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="connexion-email"
            name="email"
            type="email"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
            placeholder="prenom@masociete.fr"
            autoComplete="email"
          />
        </div>
        <p
          id="connexion-aide"
          className="text-xs text-gray-600 dark:text-gray-400"
        >
          Champs marqués <span className="text-warn">*</span> obligatoires.
          Aucun mot de passe ne te sera demandé.
        </p>
        <button
          type="submit"
          disabled={sending}
          aria-busy={sending}
          className="btn-primary w-full"
        >
          {sending ? "Envoi en cours…" : "Recevoir mon lien"}
        </button>
      </form>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
