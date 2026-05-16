"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Player du Mode Enqueteur.
//
// State machine :
//   - "brief"    : affiche le brief + bouton "Démarrer l'enquête"
//   - "playing"  : timer + media + checkboxes + bouton submit
//   - "submitting" : appel a la server action submitInvestigation
//   - "results"  : score + breakdown + bouton "Voir le débrief"
//   - "debrief"  : explications red flags + distractors + CTA suivant
//
// La logique de scoring est partagee avec le serveur via computeScore
// (lib/investigations/types.ts) — on calcule cote client pour
// affichage immediat MAIS le serveur recompute pour eviter la
// triche par dev tools (cf. server action submitInvestigation).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Investigation } from "@/lib/investigations/types";
import { computeScore } from "@/lib/investigations/types";
import MediaMockup from "./MediaMockup";
import MarkdownView from "@/components/MarkdownView";

type Phase = "brief" | "playing" | "submitting" | "results" | "debrief";

type Props = {
  investigation: Investigation;
  // Server action passee en prop (Next.js 15 pattern). Permet de tester
  // le composant en isolation avec une fake function.
  submitAction: (payload: {
    scenarioSlug: string;
    foundIds: string[];
    distractorIds: string[];
    durationSeconds: number;
  }) => Promise<{
    ok: boolean;
    score?: number;
    maxScore?: number;
    passed?: boolean;
    error?: string;
  }>;
};

export default function InvestigationPlayer({
  investigation,
  submitAction,
}: Props) {
  const [phase, setPhase] = useState<Phase>("brief");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  // IDs coches par l'utilisateur (red flags ET distractors melanges
  // dans une seule liste, comme dans la UI).
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [serverResult, setServerResult] = useState<{
    score: number;
    maxScore: number;
    passed: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Liste melangee + memoisee : red flags + distractors melanges
  // une seule fois au mount pour eviter le shuffling a chaque render.
  const shuffledItems = useMemo(() => {
    const all = [
      ...investigation.redFlags.map((rf) => ({
        id: rf.id,
        label: rf.label,
        isRedFlag: true as const,
      })),
      ...investigation.distractors.map((d) => ({
        id: d.id,
        label: d.label,
        isRedFlag: false as const,
      })),
    ];
    // Fisher-Yates shuffle deterministe a partir du slug (seed) pour
    // que tous les users voient le meme ordre — facilite le support
    // ("clique sur la 3e case", peer learning).
    // Hash simple sur le slug pour seed pseudo-random.
    const seed = investigation.slug
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    let rng = seed;
    const next = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };
    const arr = [...all];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [investigation]);

  // Timer
  useEffect(() => {
    if (phase !== "playing" || startedAt === null) return;
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, startedAt]);

  function start() {
    setStartedAt(Date.now());
    setChecked(new Set());
    setError(null);
    setPhase("playing");
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (phase !== "playing") return;
    setPhase("submitting");
    const allIds = [...checked];
    const redFlagIds = investigation.redFlags.map((rf) => rf.id);
    const distractorIds = investigation.distractors.map((d) => d.id);
    const foundIds = allIds.filter((id) => redFlagIds.includes(id));
    const distrIds = allIds.filter((id) => distractorIds.includes(id));
    try {
      const result = await submitAction({
        scenarioSlug: investigation.slug,
        foundIds,
        distractorIds: distrIds,
        durationSeconds: elapsedSec,
      });
      if (!result.ok) {
        setError(result.error ?? "Erreur inconnue");
        setPhase("playing");
        return;
      }
      // Fallback si le serveur n'a pas renvoye score/max (degraded mode)
      const local = computeScore(investigation, {
        foundIds,
        distractorIds: distrIds,
      });
      setServerResult({
        score: result.score ?? local.score,
        maxScore: result.maxScore ?? local.maxScore,
        passed: result.passed ?? local.passed,
      });
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setPhase("playing");
    }
  }

  // ============== Phase: brief ==============
  if (phase === "brief") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
            🔍 Mode Enquêteur · {investigation.investigationType.toLowerCase().replace("_", " ")}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
            {investigation.title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300 mt-2">
            <span>{"⭐".repeat(investigation.difficulty)}</span>
            <span aria-hidden="true">·</span>
            <span>~{investigation.durationSeconds}s</span>
            <span aria-hidden="true">·</span>
            <span>+{investigation.xpReward} XP max</span>
          </div>
        </header>
        <div className="bg-accent-50 dark:bg-accent-950/30 border-2 border-accent-200 dark:border-accent-900/50 rounded-2xl p-5">
          <MarkdownView content={investigation.brief} />
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={start}
            className="btn-primary text-base px-6 py-3"
          >
            Démarrer l'enquête →
          </button>
        </div>
      </div>
    );
  }

  // ============== Phase: playing / submitting ==============
  if (phase === "playing" || phase === "submitting") {
    const isOver = elapsedSec > investigation.durationSeconds;
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-primary-500 dark:text-accent-300">
            🔍 {investigation.title}
          </h1>
          <div
            className={`flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded-lg ${
              isOver
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200"
                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200"
            }`}
            aria-live="polite"
          >
            <span aria-hidden="true">⏱</span>
            <span>{elapsedSec}s</span>
            <span className="opacity-50">/ ~{investigation.durationSeconds}s</span>
          </div>
        </header>

        {/* Media */}
        <MediaMockup media={investigation.media} />

        {/* Checkboxes */}
        <section
          aria-labelledby="flags-title"
          className="bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-5"
        >
          <h2
            id="flags-title"
            className="font-display text-lg font-bold text-primary-500 dark:text-accent-300 mb-3"
          >
            Quels signaux suspects identifies-tu ?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Coche tout ce qui te paraît anormal. Attention aux faux
            positifs — sur-alarmer pénalise le score.
          </p>
          <ul className="space-y-2">
            {shuffledItems.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-700 hover:bg-accent-50/50 dark:hover:bg-accent-950/20 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={checked.has(item.id)}
                    onChange={() => toggle(item.id)}
                    disabled={phase === "submitting"}
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-accent-500 focus:ring-accent-500"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        {error && (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900 rounded-xl p-3 text-sm text-red-800 dark:text-red-200"
          >
            <strong>Erreur :</strong> {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {checked.size} case{checked.size > 1 ? "s" : ""} cochée
            {checked.size > 1 ? "s" : ""}
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={phase === "submitting" || checked.size === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "submitting" ? "Analyse en cours…" : "Valider mon analyse →"}
          </button>
        </div>
      </div>
    );
  }

  // ============== Phase: results ==============
  if (phase === "results" && serverResult) {
    const ratio =
      serverResult.maxScore > 0
        ? Math.round((serverResult.score / serverResult.maxScore) * 100)
        : 0;
    const badge =
      ratio >= 90
        ? { label: "Cyber Sherlock", emoji: "🕵️‍♂️", color: "from-purple-500 to-purple-700" }
        : ratio >= 75
          ? { label: "Détective Confirmé", emoji: "🔍", color: "from-blue-500 to-blue-700" }
          : ratio >= 60
            ? { label: "Détective Junior", emoji: "🔎", color: "from-emerald-500 to-emerald-700" }
            : { label: "À rejouer", emoji: "📚", color: "from-amber-500 to-amber-700" };
    return (
      <div className="max-w-3xl mx-auto space-y-6 text-center">
        <div
          className={`mx-auto inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r ${badge.color} text-white font-bold text-lg shadow-xl`}
        >
          <span className="text-2xl">{badge.emoji}</span>
          <span>{badge.label}</span>
        </div>
        <div>
          <p className="text-6xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
            {ratio}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {serverResult.score} / {serverResult.maxScore} points · en {elapsedSec}s
          </p>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 max-w-prose mx-auto">
          {serverResult.passed
            ? "Bien joué détective. Tu as identifié assez de signaux pour qualifier ce contenu comme suspect."
            : "Pas assez de signaux identifiés cette fois. Lis le débrief, rejoue, ça rentrera vite."}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setPhase("debrief")}
            className="btn-primary"
          >
            Voir le débrief →
          </button>
          <Link
            href="/apprendre/enquetes"
            className="btn-secondary"
          >
            Autres enquêtes
          </Link>
        </div>
      </div>
    );
  }

  // ============== Phase: debrief ==============
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-500 dark:text-accent-300 mb-2">
          Débrief — {investigation.title}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Détails de chaque signal et faux positif.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
          ✅ Les signaux à repérer
        </h2>
        {investigation.redFlags.map((rf) => {
          const found = checked.has(rf.id);
          return (
            <div
              key={rf.id}
              className={`rounded-2xl border-2 p-4 ${
                found
                  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {found ? "✅" : "👁"} {rf.label}
                </p>
                <span className="shrink-0 text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                  +{rf.points} pts
                </span>
              </div>
              <div className="text-sm">
                <MarkdownView content={rf.explanation} />
              </div>
            </div>
          );
        })}
      </section>

      {investigation.distractors.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-amber-600 dark:text-amber-400">
            ⚠️ Les faux positifs à éviter
          </h2>
          {investigation.distractors.map((d) => {
            const hit = checked.has(d.id);
            return (
              <div
                key={d.id}
                className={`rounded-2xl border-2 p-4 ${
                  hit
                    ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                    : "border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    {hit ? "❌" : "👌"} {d.label}
                  </p>
                  <span className="shrink-0 text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                    −{d.penalty} pts
                  </span>
                </div>
                <div className="text-sm">
                  <MarkdownView content={d.explanation} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="bg-primary-50 dark:bg-primary-950/30 border-2 border-primary-200 dark:border-primary-900/50 rounded-2xl p-5">
        <h2 className="font-display text-lg font-bold text-primary-500 dark:text-accent-300 mb-3">
          💡 Synthèse
        </h2>
        <MarkdownView content={investigation.debrief} />
      </section>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link href="/apprendre/enquetes" className="btn-primary">
          Autres enquêtes →
        </Link>
      </div>
    </div>
  );
}
