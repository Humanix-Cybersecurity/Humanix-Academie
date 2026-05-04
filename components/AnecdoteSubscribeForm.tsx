"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Formulaire d'inscription a la newsletter Cyber-Anecdote.
// Reutilisable : home, footer, page anecdotes, audit-flash.
// Compact (1 input + 1 bouton) ou inline selon le prop variant.

import { useState, useTransition } from "react";
import { subscribeToAnecdote } from "@/app/anecdotes/actions";

export default function AnecdoteSubscribeForm({
  source = "form",
  variant = "block",
  className,
  defaultEmail = "",
}: {
  source?: string;
  variant?: "block" | "inline";
  className?: string;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("source", source);
    startTransition(async () => {
      const res = await subscribeToAnecdote(fd);
      setFeedback(res);
      if (res.ok) setEmail("");
    });
  };

  const baseInput =
    "w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 focus:border-accent-500 focus:outline-none text-sm text-gray-900 dark:text-gray-100";
  const baseBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-bold px-5 py-3 transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      aria-labelledby="anecdote-form-label"
    >
      <span id="anecdote-form-label" className="sr-only">
        Inscription à la Cyber-Anecdote du Lundi
      </span>
      <div
        className={
          variant === "inline"
            ? "flex flex-col sm:flex-row gap-2"
            : "flex flex-col gap-3"
        }
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@entreprise.fr"
          aria-label="Votre email professionnel"
          className={`${baseInput} flex-1`}
          maxLength={200}
        />
        <button type="submit" className={baseBtn} disabled={pending}>
          {pending ? "Envoi…" : "📬 M'abonner"}
        </button>
      </div>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-2 text-sm ${
            feedback.ok
              ? "text-green-700 dark:text-green-300"
              : "text-red-600 dark:text-red-300"
          }`}
        >
          {feedback.ok ? "✅ " : "⚠ "}
          {feedback.message}
        </p>
      )}

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        1 email/semaine. Désinscription en 1 clic. Pas de spam, jamais.
      </p>
    </form>
  );
}
