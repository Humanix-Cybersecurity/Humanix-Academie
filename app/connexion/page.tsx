// SPDX-License-Identifier: AGPL-3.0-or-later
// Page de connexion : 4 voies au choix
//  1. Email + mot de passe (avec 2FA TOTP si activee)
//  2. SSO Google (1 clic, si compte deja invite)
//  3. SSO Microsoft / Entra ID (1 clic, idem)
//  4. Magic link email (fallback universel)
//
// NEXT 15 SUSPENSE : useSearchParams() exige un <Suspense> boundary, sinon
// la page n'est plus pre-renderable statiquement. On wrappe dans un
// <Suspense> + on isole le contenu dans un sous-composant.
"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { humanizeAuthError } from "@/lib/auth-errors";

type SsoProviders = { google: boolean; microsoft: boolean };
type Mode = "password" | "magic-link" | "webauthn";

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
  const params = useSearchParams();
  const router = useRouter();
  const errorCode = params.get("error");
  const stepUp = params.get("step-up") === "1";

  const [mode, setMode] = useState<Mode>(stepUp ? "webauthn" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showMfa, setShowMfa] = useState(false);

  const [sending, setSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sso, setSso] = useState<SsoProviders>({
    google: false,
    microsoft: false,
  });

  // Detection runtime des providers SSO actifs (cf. lib/auth.ts).
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

  const onPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const res = await signIn("password", {
      email,
      password,
      mfaCode,
      redirect: false,
      callbackUrl: "/apprendre",
    });
    setSending(false);
    if (!res) {
      setError("Erreur réseau, réessayez.");
      return;
    }
    if (res.ok && !res.error) {
      router.push(res.url ?? "/apprendre");
      return;
    }
    // Auth.js v5 retourne l'erreur dans res.error.
    // Le mapping anglais -> francais est centralise dans lib/auth-errors.
    const code = (res.error ?? "").toString();
    if (/MfaRequired/.test(code)) {
      setShowMfa(true);
    }
    setError(humanizeAuthError(code));
  };

  const onWebauthnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const optsRes = await fetch("/api/webauthn/login/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!optsRes.ok) {
        const data = await optsRes.json().catch(() => ({}));
        throw new Error(
          data.error ?? "Aucune clé enregistrée pour cet email.",
        );
      }
      const options = await optsRes.json();
      const auth = await startAuthentication(options);
      const verifyRes = await fetch("/api/webauthn/login/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, response: auth }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok || !data.ok) {
        throw new Error(data.error ?? "Vérification de la clé échouée.");
      }
      // signIn finalise la session NextAuth en s'appuyant sur le cookie
      // wac_fresh pose par /verify
      const res = await signIn("webauthn", {
        email,
        marker: "fido2",
        redirect: false,
        callbackUrl: "/apprendre",
      });
      setSending(false);
      if (!res || res.error) {
        setError("Connexion impossible après vérification de la clé.");
        return;
      }
      router.push(res.url ?? "/apprendre");
    } catch (e: unknown) {
      setSending(false);
      const msg = e instanceof Error ? e.message : "Erreur";
      setError(humanizeAuthError(msg));
    }
  };

  const onMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    await signIn("resend", {
      email,
      redirect: false,
      callbackUrl: "/apprendre",
    });
    setMagicSent(true);
    setSending(false);
  };

  if (magicSent) {
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
    <div className="max-w-md mx-auto px-4 py-16">
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
        <p className="text-gray-600 mt-2 text-sm">
          Choisis ta voie d'accès.
        </p>
      </div>

      {/* Step-up requis pour /superadmin */}
      {stepUp && (
        <div
          role="status"
          className="card mb-4 bg-rose-50 border-rose-300 text-rose-900 text-sm"
        >
          <p className="font-bold">🔑 Authentification renforcée requise</p>
          <p className="mt-1">
            L'accès à la console super-admin exige une vérification par clé de
            sécurité (Thales et-Fusion / YubiKey / passkey). Branchez votre
            clé et utilisez l'onglet « Clé ».
          </p>
        </div>
      )}

      {/* Erreur */}
      {(errorCode || error) && (
        <div
          role="alert"
          className="card mb-4 bg-amber-50 border-amber-300 text-amber-900 text-sm"
        >
          {errorCode && <p>{humanizeAuthError(errorCode)}</p>}
          {error && <p>{error}</p>}
        </div>
      )}

      {/* Boutons SSO (visibles uniquement si configures) */}
      {(sso.google || sso.microsoft) && (
        <div className="space-y-2 mb-5">
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
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            ou
          </span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
        </div>
      )}

      {/* Switch Password / Magic link */}
      <div
        role="tablist"
        aria-label="Mode de connexion"
        className="grid grid-cols-3 mb-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-1 text-xs font-bold"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "password"}
          onClick={() => {
            setMode("password");
            setError(null);
          }}
          className={`py-2 rounded-lg transition ${
            mode === "password"
              ? "bg-primary-500 text-white"
              : "text-gray-600 dark:text-gray-300"
          }`}
        >
          🔐 Mot de passe
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "webauthn"}
          onClick={() => {
            setMode("webauthn");
            setError(null);
          }}
          className={`py-2 rounded-lg transition ${
            mode === "webauthn"
              ? "bg-primary-500 text-white"
              : "text-gray-600 dark:text-gray-300"
          }`}
        >
          🔑 Clé
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "magic-link"}
          onClick={() => {
            setMode("magic-link");
            setError(null);
          }}
          className={`py-2 rounded-lg transition ${
            mode === "magic-link"
              ? "bg-primary-500 text-white"
              : "text-gray-600 dark:text-gray-300"
          }`}
        >
          ✨ Lien magique
        </button>
      </div>

      {mode === "webauthn" ? (
        <form onSubmit={onWebauthnSubmit} className="card space-y-4">
          <div>
            <label
              htmlFor="connexion-email-fido"
              className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
            >
              Email professionnel{" "}
              <span className="text-warn" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="connexion-email-fido"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
              placeholder="prenom@masociete.fr"
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Branchez votre clé de sécurité (Thales et-Fusion, YubiKey, etc.) puis cliquez
            ci-dessous. Une dialogue navigateur vous demandera de la toucher.
          </p>
          <button
            type="submit"
            disabled={sending}
            aria-busy={sending}
            className="btn-primary w-full"
          >
            {sending ? "En attente de la clé…" : "Se connecter avec ma clé"}
          </button>
        </form>
      ) : mode === "password" ? (
        <form onSubmit={onPasswordSubmit} className="card space-y-4">
          <div>
            <label
              htmlFor="connexion-email"
              className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
            >
              Email professionnel{" "}
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
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
              placeholder="prenom@masociete.fr"
            />
          </div>
          <div>
            <label
              htmlFor="connexion-password"
              className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
            >
              Mot de passe{" "}
              <span className="text-warn" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="connexion-password"
              name="password"
              type="password"
              required
              aria-required="true"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
            />
          </div>

          {showMfa && (
            <div>
              <label
                htmlFor="connexion-mfa"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
              >
                Code d'authentification (6 chiffres ou code de secours){" "}
                <span className="text-warn" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="connexion-mfa"
                name="mfaCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 A-Za-z\-]{6,11}"
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123 456"
                className="block w-full rounded-xl border-2 border-accent-500 p-3 focus:border-accent-600 focus:outline-none tracking-widest text-center font-mono"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Ouvrez Google Authenticator, Authy ou 1Password.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            aria-busy={sending}
            className="btn-primary w-full"
          >
            {sending ? "Connexion…" : "Se connecter"}
          </button>

          <div className="flex items-center justify-between text-xs">
            <Link
              href="/connexion/oubli"
              className="text-accent-700 hover:underline"
            >
              Mot de passe oublié ?
            </Link>
            <span className="text-gray-400">
              Pas encore de mot de passe ?{" "}
              <button
                type="button"
                onClick={() => setMode("magic-link")}
                className="text-accent-700 hover:underline"
              >
                Lien magique
              </button>
            </span>
          </div>
        </form>
      ) : (
        <form onSubmit={onMagicLinkSubmit} className="card space-y-4">
          <div>
            <label
              htmlFor="connexion-email-ml"
              className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
            >
              Email professionnel{" "}
              <span className="text-warn" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="connexion-email-ml"
              name="email"
              type="email"
              required
              aria-required="true"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
              placeholder="prenom@masociete.fr"
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Aucun mot de passe requis : tu reçois un lien à usage unique.
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
      )}
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
