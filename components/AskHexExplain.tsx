// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Bouton "Demande a Hex" qui appelle /api/ai/explain pour obtenir une
// explication contextuelle adaptee au persona de l'user.
//
// Cas d'usage principal : sur la landing phishing post-clic, l'user veut
// approfondir un point precis ("pourquoi ce domaine ?", "c'est quoi le
// spoofing ?"). Au lieu de lire un manuel statique, il pose la question
// et Hex/Mistral repond dans son langage.
//
// UX :
//   - Bouton minimaliste qui ouvre une zone Q&A
//   - Quelques questions suggerees pour amorcer
//   - Reponse streamee (pas encore de SSE, mais la reponse arrive en 1
//     coup, avec spinner pendant l'appel ~ 2-4s)
//   - Persona affiche pour transparence ("Hex te repond en mode Compta")

"use client";

import { useState } from "react";

type Topic = "phishing_email" | "phishing_indicator" | "concept" | "ioc";

type Props = {
  topic: Topic;
  /** Suggestions de questions pre-remplies, l'user peut cliquer pour
   *  declencher direct sans taper. */
  suggestions: string[];
  /** Contexte factuel a envoyer a l'IA (template, red flags, domaine...).
   *  Pas de PII ! */
  context?: {
    templateName?: string;
    redFlags?: string[];
    fromDomain?: string;
    extra?: string;
  };
  /** Variante visuelle (defaut = card claire ; "subtle" = juste un bouton
   *  qui se developpe). */
  variant?: "card" | "subtle";
  /** Titre du bloc (defaut "Demande à Hex"). */
  title?: string;
};

type State =
  | { kind: "idle" }
  | { kind: "loading"; question: string }
  | { kind: "answer"; question: string; explanation: string; persona: string }
  | { kind: "error"; question: string; message: string };

export default function AskHexExplain({
  topic,
  suggestions,
  context,
  variant = "card",
  title = "Demande à Hex",
}: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [customQuestion, setCustomQuestion] = useState("");

  const ask = async (question: string) => {
    if (!question || question.trim().length < 3) return;
    setState({ kind: "loading", question });
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, question, context }),
      });
      const data = await res.json();
      if (!data.ok) {
        setState({
          kind: "error",
          question,
          message:
            data.message ?? "Hex a eu un souci. Réessaye dans un moment.",
        });
        return;
      }
      setState({
        kind: "answer",
        question,
        explanation: data.explanation,
        persona: data.persona,
      });
    } catch (e) {
      setState({
        kind: "error",
        question,
        message:
          e instanceof Error
            ? e.message
            : "Erreur réseau. Vérifie ta connexion et réessaye.",
      });
    }
  };

  const reset = () => {
    setState({ kind: "idle" });
    setCustomQuestion("");
  };

  const onSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    void ask(customQuestion);
  };

  const wrapperClass =
    variant === "card"
      ? "rounded-2xl border-2 border-cyan-200 dark:border-cyan-900/40 bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/20 p-5 sm:p-6"
      : "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4";

  return (
    <section aria-label={title} className={wrapperClass}>
      <header className="flex items-center gap-2 mb-3">
        <span className="text-2xl" aria-hidden="true">
          🦊
        </span>
        <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 leading-tight">
          {title}
        </h3>
      </header>

      {state.kind === "idle" && (
        <>
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-3 leading-relaxed">
            Une question sur ce qui s&apos;est passé&nbsp;? Hex te répond dans
            ton langage métier.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="text-xs px-3 py-2 rounded-full bg-white dark:bg-slate-800 border border-cyan-300 dark:border-cyan-800 text-primary-500 dark:text-accent-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hover:border-cyan-400 transition font-medium"
              >
                {q}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmitCustom} className="flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              maxLength={500}
              placeholder="Ou pose ta propre question…"
              className="flex-1 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:border-accent-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={customQuestion.trim().length < 3}
              className="btn-primary text-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </form>
        </>
      )}

      {state.kind === "loading" && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Tu demandes&nbsp;:{" "}
            <em className="font-normal italic text-gray-600 dark:text-gray-300">
              {state.question}
            </em>
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span
              className="inline-block w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>Hex réfléchit…</span>
          </div>
        </div>
      )}

      {state.kind === "answer" && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Tu demandes&nbsp;:{" "}
            <em className="font-normal italic text-gray-600 dark:text-gray-300">
              {state.question}
            </em>
          </p>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line">
            {state.explanation}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
            Hex t&apos;a répondu en mode <strong>{personaLabel(state.persona)}</strong>.{" "}
            <button
              type="button"
              onClick={reset}
              className="underline hover:text-accent-700 dark:hover:text-accent-300"
            >
              Poser une autre question →
            </button>
          </p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
            ⚠️ {state.message}
          </p>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-accent-700 dark:text-accent-300 underline"
          >
            Réessayer →
          </button>
        </div>
      )}
    </section>
  );
}

function personaLabel(p: string): string {
  switch (p) {
    case "beginner":
      return "Débutant";
    case "technical":
      return "Tech / IT";
    case "manager":
      return "Manager / Dirigeant";
    case "developer":
      return "Développeur";
    case "finance":
      return "Finance / Compta";
    case "hr":
      return "RH";
    case "ops":
      return "Ops / Production";
    default:
      return p;
  }
}
