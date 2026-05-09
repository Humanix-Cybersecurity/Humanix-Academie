// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Composant client : recap personnalise IA post-quiz.
//
// Cas d'usage : monte dans le step "recap" de EpisodePlayer, declenche
// automatiquement un appel a /api/ai/recap qui synthetise les questions
// ratees adapte au persona de l'user.
//
// UX :
//   - Si l'user a fait un sans-faute : on n'affiche RIEN (pas d'IA inutile,
//     le bilan visuel + badge "Sans-faute" parlent déjà)
//   - Sinon : skeleton de chargement ~2-4s puis synthese affichee, avec
//     mention discrete du persona utilise pour transparence
//   - En cas d'erreur reseau ou IA : message poli, pas de blocage du flow

"use client";

import { useEffect, useState } from "react";

type Props = {
  saisonSlug: string;
  episodeSlug: string;
  /** Liste des reponses de l'user (un slot par question) */
  userAnswers: { questionIndex: number; selectedChoiceId: string }[];
  /** Si true (100% au quiz) : on n'affiche rien (le badge sans-faute suffit) */
  perfect: boolean;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "answer";
      recap: string;
      persona: string;
      missedCount: number;
      totalQuestions: number;
    }
  | { kind: "error"; message: string };

export default function HexRecap(props: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    // Sans-faute : pas d'appel inutile a Mistral
    if (props.perfect) return;
    if (props.userAnswers.length === 0) return;

    let cancelled = false;
    setState({ kind: "loading" });

    void (async () => {
      try {
        const res = await fetch("/api/ai/recap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            saisonSlug: props.saisonSlug,
            episodeSlug: props.episodeSlug,
            userAnswers: props.userAnswers,
          }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!data.ok) {
          setState({
            kind: "error",
            message:
              data.message ??
              "Hex n'a pas pu générer ta synthèse. Réessaye plus tard.",
          });
          return;
        }

        // Cas sans-faute renvoye par le serveur (defense en profondeur,
        // normalement on a déjà shortcut cote client avec props.perfect)
        if (data.noMisses) {
          setState({ kind: "idle" });
          return;
        }

        setState({
          kind: "answer",
          recap: data.recap,
          persona: data.persona,
          missedCount: data.missedCount,
          totalQuestions: data.totalQuestions,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            e instanceof Error
              ? e.message
              : "Erreur réseau. Vérifie ta connexion.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.perfect,
    props.saisonSlug,
    props.episodeSlug,
    // userAnswers : on serialize pour éviter de redeclencher si même contenu
    JSON.stringify(props.userAnswers),
  ]);

  // Pas d'affichage si sans-faute ou pas de reponses
  if (props.perfect) return null;
  if (state.kind === "idle") return null;

  return (
    <section
      aria-label="Synthèse personnalisée Hex"
      className="rounded-2xl border-2 border-cyan-200 dark:border-cyan-900/40 bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/20 p-5 sm:p-6 max-w-2xl mx-auto mb-8 text-left"
    >
      <header className="flex items-center gap-2 mb-3">
        <span className="text-2xl" aria-hidden="true">
          🦊
        </span>
        <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 leading-tight">
          Hex te dit ce que tu as raté
        </h3>
      </header>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span
            className="inline-block w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <span>Hex prépare ta synthèse personnalisée…</span>
        </div>
      )}

      {state.kind === "answer" && (
        <>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line">
            {state.recap}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic mt-3">
            Synthèse adaptée {personaLabel(state.persona)} sur les{" "}
            {state.missedCount} question{state.missedCount > 1 ? "s" : ""}{" "}
            ratée{state.missedCount > 1 ? "s" : ""} sur{" "}
            {state.totalQuestions}.
          </p>
        </>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-amber-900 dark:text-amber-200">
          ⚠️ {state.message}
        </p>
      )}
    </section>
  );
}

function personaLabel(p: string): string {
  switch (p) {
    case "beginner":
      return "au mode Débutant";
    case "technical":
      return "au mode Tech / IT";
    case "manager":
      return "au mode Manager / Dirigeant";
    case "developer":
      return "au mode Développeur";
    case "finance":
      return "au mode Finance / Compta";
    case "hr":
      return "au mode RH";
    case "ops":
      return "au mode Ops / Production";
    default:
      return "à ton profil";
  }
}
