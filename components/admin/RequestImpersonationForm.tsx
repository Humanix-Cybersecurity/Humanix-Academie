"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Formulaire admin : demander un acces en lecture seule au compte
// d'un utilisateur (debug, support). L'utilisateur doit consentir
// par mail.

import { useState, useTransition } from "react";
import { requestImpersonation } from "@/lib/impersonation/actions";

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes (debug rapide)" },
  { value: 60, label: "1 heure" },
  { value: 240, label: "4 heures" },
  { value: 1440, label: "24 heures (max)" },
];

export default function RequestImpersonationForm() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { type: "ok"; msg: string }
    | { type: "err"; msg: string }
    | null
  >(null);

  const onSubmit = async (formData: FormData) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await requestImpersonation(formData);
      if (res.ok) {
        setFeedback({
          type: "ok",
          msg: "Demande envoyée. L'utilisateur recevra un mail pour autoriser ou refuser. Vous serez notifié de sa réponse.",
        });
        const form = document.querySelector(
          "#request-impersonation-form",
        ) as HTMLFormElement | null;
        form?.reset();
      } else {
        const msg = errorMessage(res.reason);
        setFeedback({ type: "err", msg });
      }
    });
  };

  return (
    <form
      id="request-impersonation-form"
      action={onSubmit}
      className="space-y-3"
    >
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        Pour le support / debug : demandez à un utilisateur de votre
        espace l'autorisation de consulter son compte en{" "}
        <strong>lecture seule</strong>. Il recevra un mail pour donner
        son accord explicite. Aucune modification ne sera possible.
      </p>

      <div>
        <label
          htmlFor="impersonation-email"
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
        >
          Email de l'utilisateur{" "}
          <span className="text-warn" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="impersonation-email"
          name="targetEmail"
          type="email"
          required
          placeholder="utilisateur@masociete.fr"
          className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="impersonation-reason"
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
        >
          Raison de la demande{" "}
          <span className="text-warn" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id="impersonation-reason"
          name="reason"
          required
          minLength={10}
          maxLength={400}
          rows={3}
          placeholder="Ex : « Problème d'affichage du certificat ISO 27001 signalé par l'utilisateur, je dois vérifier son parcours »."
          className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm resize-none"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Cette raison sera visible par l'utilisateur dans le mail de
          demande. Soyez clair et précis.
        </p>
      </div>

      <div>
        <label
          htmlFor="impersonation-duration"
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
        >
          Durée maximale d'accès
        </label>
        <select
          id="impersonation-duration"
          name="durationMinutes"
          defaultValue="60"
          className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none text-sm bg-white dark:bg-slate-800"
        >
          {DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full text-sm"
      >
        {pending ? "Envoi…" : "Envoyer la demande d'accès"}
      </button>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`text-sm text-center font-medium p-3 rounded-lg ${
            feedback.type === "ok"
              ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
              : "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30"
          }`}
        >
          {feedback.type === "ok" ? "✓ " : "✗ "}
          {feedback.msg}
        </div>
      )}
    </form>
  );
}

function errorMessage(reason: string): string {
  switch (reason) {
    case "target_not_found":
      return "Cet email n'est pas associé à un compte. Vérifiez l'orthographe.";
    case "target_not_same_tenant":
      return "Cet utilisateur n'appartient pas à votre espace.";
    case "self_target":
      return "Vous ne pouvez pas demander l'accès à votre propre compte.";
    case "invalid_reason":
      return "La raison doit faire au moins 10 caractères (forme documentée).";
    case "invalid_duration":
      return "Durée invalide. Choisissez entre 5 minutes et 24 heures.";
    default:
      return "Une erreur est survenue. Réessayez plus tard.";
  }
}
