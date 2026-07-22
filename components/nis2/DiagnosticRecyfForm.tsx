"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Formulaire de diagnostic ReCyF (20 objectifs de securite ANSSI).
//
// Reactif : le profil declare (entite importante / essentielle) determine
// les objectifs affiches, par principe de proportionnalite :
//   - entite importante (EI) : objectifs 1 a 15
//   - entite essentielle (EE) : objectifs 1 a 20
//
// Une question par objectif, reponse Oui / En partie / Non. A la soumission,
// la server action encode profil + reponses dans l'URL (rien stocke).

import { useState } from "react";
import Link from "next/link";
import {
  RECYF_GROUPES,
  objectifsForProfil,
  type RecyfGroupe,
  type RecyfProfil,
} from "@/lib/nis2/recyf";

const ANSWER_OPTIONS = [
  { value: "oui", label: "Oui", symbol: "✓" },
  { value: "en_partie", label: "En partie", symbol: "~" },
  { value: "non", label: "Non / je ne sais pas", symbol: "✗" },
] as const;

const GROUP_ORDER = (Object.keys(RECYF_GROUPES) as RecyfGroupe[]).sort(
  (a, b) => RECYF_GROUPES[a].ordre - RECYF_GROUPES[b].ordre,
);

export default function DiagnosticRecyfForm({
  action,
  submitLabel,
  initialProfil,
  initialAnswers,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Texte du bouton de soumission (defaut : diagnostic public). */
  submitLabel?: string;
  /** Pre-selection du profil (usage in-app : reprise de l'auto-evaluation). */
  initialProfil?: RecyfProfil;
  /** Pre-selection des reponses, clef = numero d'objectif. */
  initialAnswers?: Record<number, "oui" | "en_partie" | "non">;
}) {
  const [profil, setProfil] = useState<RecyfProfil>(initialProfil ?? "EI");

  const visibles = objectifsForProfil(profil);

  return (
    <form action={action} className="space-y-8">
      {/* Profil */}
      <fieldset className="rounded-2xl border-2 border-primary-200 dark:border-primary-900/50 bg-primary-50/50 dark:bg-primary-950/20 p-6">
        <legend className="font-display text-lg font-bold text-primary-600 dark:text-accent-300 px-2">
          Votre profil
        </legend>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 mb-4 px-2">
          Le référentiel s&apos;applique de façon proportionnée :{" "}
          <strong>15 objectifs</strong> pour les entités importantes,{" "}
          <strong>20 objectifs</strong> pour les entités essentielles.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              v: "EI" as const,
              t: "Entité importante",
              d: "15 objectifs de sécurité",
            },
            {
              v: "EE" as const,
              t: "Entité essentielle",
              d: "20 objectifs (5 de plus)",
            },
          ].map((p) => (
            <label
              key={p.v}
              className="cursor-pointer block rounded-xl border-2 border-gray-200 dark:border-slate-700 p-4 hover:border-accent-400 has-[input:checked]:border-accent-500 has-[input:checked]:bg-accent-50 dark:has-[input:checked]:bg-accent-950/40 transition-colors"
            >
              <input
                type="radio"
                name="profil"
                value={p.v}
                checked={profil === p.v}
                onChange={() => setProfil(p.v)}
                className="sr-only"
              />
              <span className="block font-bold text-gray-900 dark:text-gray-100">
                {p.t}
              </span>
              <span className="block text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {p.d}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 px-2">
          Pas sûr de votre statut ?{" "}
          <Link
            href="/nis2/concerne"
            className="text-accent-600 dark:text-accent-300 underline hover:no-underline"
          >
            Faites le test d&apos;éligibilité
          </Link>{" "}
          (3 questions). Par défaut, commencez par les 15 objectifs communs.
        </p>
      </fieldset>

      {/* Identite optionnelle */}
      <div>
        <label
          htmlFor="diag-company"
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
        >
          Nom de votre organisation (optionnel)
        </label>
        <input
          id="diag-company"
          name="companyName"
          type="text"
          placeholder="Acme SAS"
          className="w-full sm:w-80 rounded-xl border-2 border-gray-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-sm"
        />
      </div>

      {/* Questions groupees par thematique */}
      {GROUP_ORDER.map((g) => {
        const objs = visibles.filter((o) => o.groupe === g);
        if (objs.length === 0) return null;
        const meta = RECYF_GROUPES[g];
        return (
          <section
            key={g}
            aria-labelledby={`grp-${g}`}
            className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
          >
            <h2
              id={`grp-${g}`}
              className="font-display text-lg font-bold text-primary-600 dark:text-accent-300 mb-4 pb-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2"
            >
              <span aria-hidden="true">{meta.emoji}</span> {meta.label}
            </h2>
            <div className="space-y-6">
              {objs.map((o) => (
                <fieldset key={o.id} className="space-y-2">
                  <legend
                    id={`q-${o.num}-legend`}
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug"
                  >
                    <span className="text-xs font-bold text-accent-500 mr-1">
                      Objectif {o.num}
                      {o.scope === "EE" ? " (essentielles)" : ""} ·
                    </span>{" "}
                    {o.question}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {ANSWER_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="cursor-pointer text-sm px-3 py-1.5 rounded-full border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 has-[input:checked]:border-accent-500 has-[input:checked]:bg-accent-50 dark:has-[input:checked]:bg-accent-950/40 has-[input:checked]:text-accent-800 dark:has-[input:checked]:text-accent-200 has-[input:checked]:font-bold transition-colors"
                      >
                        <input
                          type="radio"
                          name={`q_${o.num}`}
                          value={opt.value}
                          required
                          defaultChecked={initialAnswers?.[o.num] === opt.value}
                          className="sr-only"
                        />
                        <span aria-hidden="true">{opt.symbol} </span>
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        );
      })}

      {/* Submit */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950/40 dark:to-accent-950/40 border-2 border-primary-200 dark:border-primary-900/40 p-6 text-center">
        <h2 className="font-display text-xl font-bold text-primary-500 dark:text-accent-300 mb-3">
          Voir mon plan d&apos;action
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-5">
          Vous obtenez votre situation objectif par objectif, et un plan concret
          priorisé.
        </p>
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-3 rounded-xl text-lg shadow-md transition-colors"
        >
          {submitLabel ?? "📊 Voir mon diagnostic ReCyF →"}
        </button>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
          Aucune donnée n&apos;est stockée. Le résultat est encodé dans
          l&apos;URL, sans information personnelle.
        </p>
      </div>
    </form>
  );
}
