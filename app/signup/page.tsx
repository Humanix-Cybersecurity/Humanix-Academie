// SPDX-License-Identifier: AGPL-3.0-or-later
// Page d'inscription self-service pour le plan "decouverte" (forever-free
// 5 sieges) ou "trial". Cree un Tenant + un User ADMIN puis logue
// automatiquement l'utilisateur sur /admin.
"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createDecouverteAccount } from "./actions";

const PLAN_LABELS: Record<string, { label: string; tagline: string }> = {
  decouverte: {
    label: "Découverte",
    tagline: "Forever-free · 5 sièges · sans CB",
  },
  trial: {
    label: "Essai gratuit",
    tagline: "14 jours pour tester l'ensemble des modules",
  },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupInner />
    </Suspense>
  );
}

function SignupFallback() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-4xl opacity-40 animate-pulse" aria-hidden="true">
        🦊
      </div>
      <p className="text-sm text-gray-500 mt-3">Chargement…</p>
    </div>
  );
}

function SignupInner() {
  const params = useSearchParams();
  const planParam = params.get("plan");
  const planKey =
    planParam === "trial" || planParam === "decouverte"
      ? planParam
      : "decouverte";
  const planMeta = PLAN_LABELS[planKey];

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set("plan", planKey);
    try {
      const res = await createDecouverteAccount(fd);
      if (!res.ok) {
        setError(res.error);
        setPending(false);
      }
      // si ok=true, l'action a redirige : on reste en pending=true.
    } catch (err: unknown) {
      // Le redirect cote server lance NEXT_REDIRECT, qui n'est PAS une
      // vraie erreur. On le laisse remonter au router.
      const code = (err as { digest?: string } | null)?.digest;
      if (typeof code === "string" && code.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      setError("Une erreur est survenue. Réessayez dans quelques instants.");
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-humanix-academie-192.png"
            alt="Humanix Académie"
            className="h-20 w-auto mx-auto"
          />
        </div>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
          Plan {planMeta.label}
        </p>
        <h1 className="text-3xl font-bold text-primary-500 dark:text-accent-300">
          Créer mon compte
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">
          {planMeta.tagline}.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="card mb-4 bg-amber-50 border-amber-300 text-amber-900 text-sm"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-4">
        <input type="hidden" name="plan" value={planKey} />
        {/* Honeypot anti-bot : champ visuellement masque mais pas auto-fillable */}
        <div className="hidden" aria-hidden="true">
          <label>
            Site web (laissez vide)
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>

        <div>
          <label
            htmlFor="signup-org"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
          >
            Nom de l'organisation{" "}
            <span className="text-warn" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="signup-org"
            name="orgName"
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="Ma Société SARL"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="signup-name"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
          >
            Votre prénom et nom
          </label>
          <input
            id="signup-name"
            name="adminName"
            type="text"
            maxLength={100}
            placeholder="Prénom Nom"
            autoComplete="name"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
          >
            Email professionnel{" "}
            <span className="text-warn" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="prenom@masociete.fr"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="signup-pwd"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
          >
            Mot de passe{" "}
            <span className="text-warn" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="signup-pwd"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            10 caractères min. avec 3 types parmi : minuscule, majuscule,
            chiffre, symbole.
          </p>
        </div>

        <div>
          <label
            htmlFor="signup-pwd2"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
          >
            Confirmer le mot de passe{" "}
            <span className="text-warn" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="signup-pwd2"
            name="passwordConfirm"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
          />
        </div>

        <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 shrink-0"
          />
          <span>
            J'accepte les{" "}
            <Link href="/cgu" className="underline text-accent-700">
              CGU
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="underline text-accent-700">
              politique de confidentialité
            </Link>{" "}
            (RGPD).
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="btn-primary w-full"
        >
          {pending ? "Création…" : `Créer mon compte ${planMeta.label}`}
        </button>

        <p className="text-center text-xs text-gray-500">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="underline text-accent-700">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
