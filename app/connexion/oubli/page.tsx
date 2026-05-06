// SPDX-License-Identifier: AGPL-3.0-or-later
// Page mot de passe oublie : envoie un lien de reinitialisation par email.
// Anti-enumeration : on repond toujours pareil, succes ou pas.
"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/profil/securite/actions";

export default function OubliPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const fd = new FormData();
    fd.set("email", email);
    await requestPasswordReset(fd);
    setSending(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">📬</div>
        <h1 className="text-2xl font-bold text-primary-500 mb-3">
          Si un compte existe…
        </h1>
        <p className="text-gray-600">
          …vous allez recevoir un email avec un lien pour réinitialiser votre
          mot de passe. Vérifiez aussi vos spams.
        </p>
        <p className="text-sm text-gray-400 mt-4">
          Le lien est valable 1 heure et utilisable une seule fois.
        </p>
        <Link
          href="/connexion"
          className="inline-block mt-6 text-accent-700 hover:underline"
        >
          ← Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-3xl font-bold text-primary-500">
          Mot de passe oublié ?
        </h1>
        <p className="text-gray-600 mt-2 text-sm">
          Entrez votre email, nous vous envoyons un lien de réinitialisation.
        </p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label
            htmlFor="oubli-email"
            className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
          >
            Email professionnel{" "}
            <span className="text-warn" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="oubli-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
            placeholder="prenom@masociete.fr"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          aria-busy={sending}
          className="btn-primary w-full"
        >
          {sending ? "Envoi…" : "Envoyer le lien"}
        </button>
        <Link
          href="/connexion"
          className="block text-center text-xs text-gray-500 hover:text-accent-700"
        >
          ← Retour à la connexion
        </Link>
      </form>
    </div>
  );
}
