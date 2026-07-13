"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Panneau de creation d'un exercice : choix du format (Eclair / Table-top)
// puis lancement d'un scenario -> ouvre le cockpit hote.

import { useState } from "react";
import { useRouter } from "next/navigation";

type ScenarioSummary = {
  id: string;
  title: string;
  rounds: number;
  durationMin: number;
};

type Mode = "ECLAIR" | "TABLETOP";

export default function CreateDrillPanel({
  scenarios,
}: {
  scenarios: ScenarioSummary[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("ECLAIR");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function create(scenarioId: string) {
    if (loadingId) return;
    setLoadingId(scenarioId);
    try {
      const res = await fetch("/api/drill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, mode }),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        router.push(`/admin/exercice-crise/${id}`);
        return;
      }
    } catch {
      // ignore
    }
    setLoadingId(null);
  }

  return (
    <div>
      {/* Choix du format */}
      <div className="mb-5">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
          Format de l&apos;exercice
        </p>
        <div className="inline-flex rounded-xl border-2 border-gray-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-900">
          {[
            { v: "ECLAIR" as const, label: "Éclair · collectif" },
            { v: "TABLETOP" as const, label: "Table-top · rôles" },
          ].map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setMode(m.v)}
              className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${
                mode === m.v
                  ? "bg-primary-500 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {mode === "ECLAIR"
            ? "Tout le monde répond la même chose. Idéal pour embarquer toute l'équipe en 15 minutes."
            : "Chacun endosse un rôle (Direction, Communication, Informatique, Sécurité), façon exercice ANSSI."}
        </p>
      </div>

      {/* Scenarios */}
      <div className="space-y-3">
        {scenarios.map((sc) => (
          <div
            key={sc.id}
            className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-primary-600 dark:text-accent-200">
                {sc.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {sc.rounds} manches · environ {sc.durationMin} min
              </p>
            </div>
            <button
              type="button"
              onClick={() => create(sc.id)}
              disabled={loadingId !== null}
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl shadow-md transition-colors shrink-0"
            >
              {loadingId === sc.id ? "Création…" : "Lancer cet exercice →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
