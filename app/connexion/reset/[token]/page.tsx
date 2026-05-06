// SPDX-License-Identifier: AGPL-3.0-or-later
// Page de reinitialisation : consomme le token recu par email.
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { resetPasswordWithToken } from "@/app/profil/securite/actions";

export default function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("newPassword", pwd);
    fd.set("newPasswordConfirm", pwd2);
    const res = await resetPasswordWithToken(fd);
    setSending(false);
    if (res.ok) {
      setDone(true);
    } else {
      setError(res.error ?? "Erreur");
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-primary-500 mb-3">
          Mot de passe mis à jour
        </h1>
        <p className="text-gray-600">
          Votre nouveau mot de passe est actif. Vous pouvez vous connecter.
        </p>
        <Link
          href="/connexion"
          className="btn-primary mt-6 inline-block"
        >
          Aller à la connexion →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-3xl font-bold text-primary-500">
          Nouveau mot de passe
        </h1>
        <p className="text-gray-600 mt-2 text-sm">
          Choisissez un mot de passe robuste : 10 caractères minimum, mélangeant
          au moins 3 types parmi minuscule, majuscule, chiffre, symbole.
        </p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm"
          >
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="reset-pwd"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
          >
            Nouveau mot de passe{" "}
            <span className="text-warn" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="reset-pwd"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="reset-pwd2"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
          >
            Confirmation{" "}
            <span className="text-warn" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="reset-pwd2"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          aria-busy={sending}
          className="btn-primary w-full"
        >
          {sending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
