"use client";

// Mode "Presentation CODIR" : passe le dashboard en plein ecran avec polices XL
// et masque les details techniques. Le dirigeant projette ce composant pendant
// son CODIR mensuel.
//
// Design rules :
//  - 4 KPIs maximum dans le viewport (pas 12)
//  - police 4xl-7xl
//  - couleurs : pas de gradient agressif, cibles : primary-500, accent-500, success, warn
//  - aucune action mutative ici (vue lecture seule)
//
// A11y : Escape pour quitter, role=dialog quand actif, focus trap natif via fullscreenAPI.

import { useEffect, useRef, useState } from "react";

type Action = {
  label: string;
  potentialPoints: number;
  difficulty: "easy" | "medium" | "hard";
};

export type CodirModeProps = {
  collectiveScore: number;
  scoreVerdictLabel: string;
  scoreVerdictColor: "green" | "amber" | "orange" | "red";
  expectedAnnualLoss: number; // EUR
  incidentProbabilityPct: number; // 0..100
  estimatedAnnualSaving: number; // EUR
  roiMultiplier: number;
  totalSeats: number;
  topActions: Action[];
  tenantName: string;
};

const VERDICT_TEXT_COLOR: Record<CodirModeProps["scoreVerdictColor"], string> =
  {
    green: "text-green-600",
    amber: "text-amber-500",
    orange: "text-orange-600",
    red: "text-red-600",
  };

const VERDICT_BG: Record<CodirModeProps["scoreVerdictColor"], string> = {
  green: "bg-green-50 border-green-300",
  amber: "bg-amber-50 border-amber-300",
  orange: "bg-orange-50 border-orange-300",
  red: "bg-red-50 border-red-300",
};

export default function CodirMode(props: CodirModeProps) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Synchronise l'etat avec l'API Fullscreen native (l'utilisateur peut
  // sortir du plein ecran avec Escape ou le bouton du navigateur).
  useEffect(() => {
    function onChange() {
      setActive(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function enter() {
    if (!ref.current) return;
    try {
      await ref.current.requestFullscreen();
      setActive(true);
    } catch {
      // Fallback : si plein ecran refuse (Safari iframe), on bascule en mode "fixed"
      setActive(true);
    }
  }

  async function exit() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    setActive(false);
  }

  const today = new Date().toLocaleDateString("fr-FR", { dateStyle: "long" });

  return (
    <>
      {/* Bouton de declenchement (visible toujours) */}
      <button
        type="button"
        onClick={enter}
        className="btn-primary text-sm inline-flex items-center gap-2"
        aria-label="Activer le mode présentation CODIR (plein écran)"
      >
        <span aria-hidden="true">🎤</span> Mode Présentation CODIR
      </button>

      {/* Panneau plein ecran */}
      <div
        ref={ref}
        role={active ? "dialog" : undefined}
        aria-modal={active ? true : undefined}
        aria-label={active ? "Mode présentation CODIR" : undefined}
        className={
          active
            ? "fixed inset-0 z-[9999] bg-white dark:bg-slate-950 overflow-auto"
            : "hidden"
        }
      >
        {active && (
          <div className="min-h-full flex flex-col p-8 sm:p-12">
            {/* En-tete */}
            <header className="flex items-start justify-between mb-10">
              <div>
                <p className="text-xs uppercase tracking-widest text-accent-500 font-bold">
                  Tableau de bord cyber — Mode CODIR
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mt-1">
                  {props.tenantName}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {today} — Vue de pilotage executif
                </p>
              </div>
              <button
                type="button"
                onClick={exit}
                className="btn-secondary text-sm"
                aria-label="Quitter le mode présentation CODIR"
              >
                <span aria-hidden="true">✕</span> Quitter
              </button>
            </header>

            {/* Bandeau XL : 3 indicateurs cles */}
            <div className="grid sm:grid-cols-3 gap-6 mb-10">
              {/* Score */}
              <div
                className={`rounded-3xl border-2 p-8 ${VERDICT_BG[props.scoreVerdictColor]}`}
              >
                <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                  Score collectif
                </p>
                <p className="text-7xl sm:text-8xl font-extrabold text-primary-500 leading-none mt-3">
                  {props.collectiveScore}
                  <span className="text-2xl text-gray-400">/100</span>
                </p>
                <p
                  className={`text-2xl font-bold mt-3 ${VERDICT_TEXT_COLOR[props.scoreVerdictColor]}`}
                >
                  {props.scoreVerdictLabel}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Moyenne pondérée des {props.totalSeats} collaborateurs
                </p>
              </div>

              {/* Cout attendu */}
              <div className="rounded-3xl border-2 border-red-200 bg-red-50 p-8">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                  Coût attendu sur 12 mois
                </p>
                <p className="text-6xl sm:text-7xl font-extrabold text-red-600 leading-none mt-3">
                  {props.expectedAnnualLoss.toLocaleString("fr-FR")}
                  <span className="text-3xl text-red-400 ml-1">€</span>
                </p>
                <p className="text-sm text-gray-700 mt-3">
                  Probabilité d'incident :{" "}
                  <strong>{props.incidentProbabilityPct} %</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Sources : ANSSI 2024, baromètre Hiscox 2023
                </p>
              </div>

              {/* ROI */}
              <div className="rounded-3xl border-2 border-green-200 bg-green-50 p-8">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                  ROI HumaniX
                </p>
                <p className="text-7xl sm:text-8xl font-extrabold text-green-600 leading-none mt-3">
                  ×{props.roiMultiplier}
                </p>
                <p className="text-sm text-gray-700 mt-3">
                  Économie estimée :{" "}
                  <strong>
                    {props.estimatedAnnualSaving.toLocaleString("fr-FR")} €/an
                  </strong>
                </p>
              </div>
            </div>

            {/* Top 3 actions XL */}
            <section className="rounded-3xl border-2 border-gray-200 dark:border-slate-700 p-8 flex-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-primary-500 mb-6">
                Top 3 actions à mener
              </h3>
              <ol className="space-y-4">
                {props.topActions.slice(0, 3).map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-6 p-5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                  >
                    <span className="text-5xl font-extrabold text-accent-500 shrink-0 w-16 text-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-xl sm:text-2xl font-bold text-primary-500">
                        {a.label}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Difficulté :{" "}
                        <span
                          className={
                            a.difficulty === "easy"
                              ? "text-green-600 font-medium"
                              : a.difficulty === "medium"
                                ? "text-amber-600 font-medium"
                                : "text-red-600 font-medium"
                          }
                        >
                          {a.difficulty === "easy"
                            ? "Facile"
                            : a.difficulty === "medium"
                              ? "Moyenne"
                              : "Élevée"}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-4xl sm:text-5xl font-extrabold text-green-600">
                        +{a.potentialPoints}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        pts/score
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Pied de page */}
            <footer className="mt-10 text-xs text-gray-400 text-center">
              Données extraites en temps réel · Humanix Académie ·{" "}
              <span className="font-mono">{today}</span>
              <br />
              <kbd className="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                Échap
              </kbd>{" "}
              pour quitter le mode présentation
            </footer>
          </div>
        )}
      </div>
    </>
  );
}
