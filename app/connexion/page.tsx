// SPDX-License-Identifier: AGPL-3.0-or-later
// Page de connexion : 4 voies au choix
//  1. Email + mot de passe (avec 2FA TOTP si activee)
//  2. SSO Google (1 clic, si compte déjà invite)
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
import HexBackdrop from "@/components/HexBackdrop";
import HexMascot from "@/components/HexMascot";

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
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-20 text-center">
      <div>
        <div
          className="text-5xl opacity-40 animate-pulse"
          aria-hidden="true"
        >
          🦊
        </div>
        <p className="text-sm text-gray-500 mt-3">Chargement…</p>
      </div>
    </main>
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
      callbackUrl: "/post-login",
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
    // Le mapping anglais -> français est centralise dans lib/auth-errors.
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
        callbackUrl: "/post-login",
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
      callbackUrl: "/post-login",
    });
    setMagicSent(true);
    setSending(false);
  };

  if (magicSent) {
    return (
      <main id="main-content" className="overflow-x-hidden animate-fadeIn">
        <HexBackdrop intensity="soft" className="bg-humanix-soft">
          <section className="max-w-md mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
            <div className="mb-4 flex justify-center">
              <HexMascot mood="happy" size="lg" animated />
            </div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              ✉️ Mail envoyé
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3">
              Vérifie ta boîte mail
            </h1>
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
              Un lien magique vient d&apos;être envoyé à{" "}
              <strong>{email}</strong>. Clique dessus depuis le même
              appareil pour finaliser ta connexion.
            </p>
            <div className="bg-white/70 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/80 rounded-2xl p-5 backdrop-blur-sm space-y-2 text-left text-sm text-gray-700 dark:text-gray-200">
              <p>
                <strong className="text-primary-500">⏱️ Validité :</strong>{" "}
                lien à usage unique, valable 24h.
              </p>
              <p>
                <strong className="text-primary-500">🔍 Pas reçu ?</strong>{" "}
                Vérifie tes spams et le dossier &laquo;&nbsp;Promotions&nbsp;&raquo; (Gmail).
              </p>
            </div>
          </section>
        </HexBackdrop>
      </main>
    );
  }

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ==================== HERO ====================
          pb-10 sm:pb-12 pour donner de l'air sous le sous-titre avant que
          le card AUTH commence. Iteration precedente avait pb-4 sm:pb-6
          + une marge negative sur le card qui chevauchait le texte du
          hero. */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-md mx-auto px-4 pt-10 pb-10 sm:pt-14 sm:pb-12 text-center">
          <div className="mb-4 flex justify-center">
            <HexMascot mood="neutral" size="lg" animated />
          </div>
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            🔐 Connexion · Humanix Académie
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-3">
            Bon retour parmi nous.
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed max-w-sm mx-auto">
            Choisis ta voie d&apos;accès. Magic link, mot de passe, ou clé
            de sécurité — comme tu préfères.
          </p>
        </section>
      </HexBackdrop>

      {/* ==================== AUTH CARD UNIFIE ====================
          Toute la machine d'auth (step-up message, erreurs, SSO, tabs,
          form) est dans UN SEUL card visuel (relative + bg + border) pour
          éviter l'effet "tabs flottants entre hero et form" signale par
          l'utilisateur.
          IMPORTANT : pas de marge negative ! Une iteration precedente
          utilisait -mt-6 sm:-mt-8 pour faire "mordre" la card sur le
          backdrop, mais ca chevauchait le sous-titre du hero. Le card
          se positionne donc proprement SOUS le hero avec une marge
          positive qui le decolle visuellement. */}
      <section className="max-w-md mx-auto px-4 pb-12 mt-6 sm:mt-8 relative z-10">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden">

      {/* ===== TABS : barre haute integree au card ===== */}
      <div
        role="tablist"
        aria-label="Mode de connexion"
        className="grid grid-cols-3 border-b-2 border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40"
      >
        <TabBtn
          active={mode === "password"}
          onClick={() => {
            setMode("password");
            setError(null);
          }}
          icon="🔐"
          label="Mot de passe"
        />
        <TabBtn
          active={mode === "webauthn"}
          onClick={() => {
            setMode("webauthn");
            setError(null);
          }}
          icon="🔑"
          label="Clé"
        />
        <TabBtn
          active={mode === "magic-link"}
          onClick={() => {
            setMode("magic-link");
            setError(null);
          }}
          icon="✨"
          label="Lien magique"
        />
      </div>

      {/* ===== CONTENU DU CARD (padding cohérent partout) ===== */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Step-up requis pour /superadmin */}
        {stepUp && (
          <div
            role="status"
            className="rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-100 text-sm p-3"
          >
            <p className="font-bold flex items-center gap-2">
              <span aria-hidden="true">🔑</span>
              Authentification renforcée requise
            </p>
            <p className="mt-1">
              L&apos;accès à la console super-admin exige une vérification
              par clé de sécurité (Thales et-Fusion / YubiKey / passkey).
              Branchez votre clé et utilisez l&apos;onglet «&nbsp;Clé&nbsp;».
            </p>
          </div>
        )}

        {/* Erreur */}
        {(errorCode || error) && (
          <div
            role="alert"
            className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 text-sm p-3 flex items-start gap-2"
          >
            <span aria-hidden="true" className="shrink-0">
              ⚠️
            </span>
            <div>
              {errorCode && <p>{humanizeAuthError(errorCode)}</p>}
              {error && <p>{error}</p>}
            </div>
          </div>
        )}

        {/* Boutons SSO (visibles uniquement si configures) */}
        {(sso.google || sso.microsoft) && (
          <>
            <div className="space-y-2">
              {sso.microsoft && (
                <button
                  type="button"
                  onClick={() =>
                    signIn("microsoft-entra-id", {
                      callbackUrl: "/post-login",
                    })
                  }
                  className="w-full flex items-center justify-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:-translate-y-px transition-all font-medium text-sm"
                  aria-label="Se connecter avec Microsoft"
                >
                  <MicrosoftLogo />
                  Continuer avec Microsoft
                </button>
              )}
              {sso.google && (
                <button
                  type="button"
                  onClick={() =>
                    signIn("google", { callbackUrl: "/post-login" })
                  }
                  className="w-full flex items-center justify-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:-translate-y-px transition-all font-medium text-sm"
                  aria-label="Se connecter avec Google"
                >
                  <GoogleLogo />
                  Continuer avec Google
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
              <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                ou par email
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
            </div>
          </>
        )}

        {/* ===== FORMS (un seul affiche selon `mode`) ===== */}
        {mode === "webauthn" ? (
          <form onSubmit={onWebauthnSubmit} className="space-y-4">
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
        <form onSubmit={onPasswordSubmit} className="space-y-4">
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

          {/* Footer du form password : Mot de passe oublie + bascule magic
              link, en stack vertical pour éviter la cohabitation cramped
              signalee par l'utilisateur. */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs pt-2 border-t border-gray-100 dark:border-slate-800">
            <Link
              href="/connexion/oubli"
              className="text-accent-700 dark:text-accent-300 hover:underline font-medium"
            >
              Mot de passe oublié&nbsp;?
            </Link>
            <button
              type="button"
              onClick={() => setMode("magic-link")}
              className="text-gray-500 dark:text-gray-400 hover:text-accent-700 dark:hover:text-accent-300 transition"
            >
              Pas encore de mot de passe&nbsp;? Recevoir un lien magique →
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onMagicLinkSubmit} className="space-y-4">
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
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            <span aria-hidden="true">🔒</span> Lien à usage unique, valable
            24&nbsp;h.
          </p>
        </form>
      )}
        </div>
        {/* fin du contenu p-5 sm:p-6 */}
        </div>
        {/* fin du card AUTH englobant */}

        {/* ==================== FOOTER LINKS (hors card) ==================== */}
        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Pas encore de compte&nbsp;?{" "}
            <Link
              href="/inscription"
              className="text-accent-700 dark:text-accent-300 font-semibold hover:underline"
            >
              Inscription gratuite
            </Link>
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            En te connectant, tu acceptes nos{" "}
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

/**
 * Bouton de tab integre a la barre haute du card (style "segmented control"
 * deux fois plus generaux que les anciens tabs flottants). Active = primary
 * solide en bas du tab + texte sombre. Inactive = texte grise + hover subtle.
 */
function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative py-3 px-2 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
        active
          ? "text-primary-500 dark:text-accent-300 bg-white dark:bg-slate-900"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-slate-900/50"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
      {active && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 dark:bg-accent-300 rounded-full"
        />
      )}
    </button>
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
