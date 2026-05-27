// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";
//
// Formulaire d'import CSV d'une recipient list phishing.

import { useActionState } from "react";
import { createListFromCsv } from "./actions";

type CreateResult = Awaited<ReturnType<typeof createListFromCsv>>;

export default function CreateListForm() {
  const [state, formAction, isPending] = useActionState<
    CreateResult | null,
    FormData
  >(async (_prev, formData) => {
    return await createListFromCsv(formData);
  }, null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="list-name"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Nom de la liste
          </label>
          <input
            type="text"
            id="list-name"
            name="name"
            placeholder="Panel pilote Q3 2026, Prestataires audit, Cohorte nouveaux arrivants..."
            required
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="list-description"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Description <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <textarea
            id="list-description"
            name="description"
            placeholder="Contexte, periode, objectif de la liste..."
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="csv-file"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Fichier CSV
          </label>
          <input
            type="file"
            id="csv-file"
            name="csvFile"
            accept=".csv,text/csv,text/plain"
            required
            className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-primary-500 file:text-white hover:file:bg-primary-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Max 10 000 lignes / 1 Mo. Format : email;name;service (separateur ; ou , auto-detecte)
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Import en cours..." : "Importer la liste"}
        </button>
      </form>

      {state && state.ok && (
        <div
          role="status"
          className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4"
        >
          <p className="font-bold text-emerald-900 dark:text-emerald-200">
            ✅ Liste créée avec succès
          </p>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
            {state.imported} destinataire(s) importé(s)
            {state.skipped && state.skipped > 0
              ? ` · ${state.skipped} ligne(s) ignorée(s) (invalides ou doublons)`
              : ""}
            .
          </p>
        </div>
      )}

      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4"
        >
          <p className="font-bold text-red-900 dark:text-red-200">
            ❌ Import échoué
          </p>
          <p className="text-sm text-red-800 dark:text-red-300 mt-1 font-mono">
            {explainError(state.error)}
          </p>
        </div>
      )}
    </div>
  );
}

function explainError(code: string | undefined): string {
  switch (code) {
    case "missing_name":
      return "Le nom de la liste est obligatoire.";
    case "missing_csv":
      return "Aucun fichier CSV joint.";
    case "csv_too_large":
      return "Fichier trop volumineux (max 1 Mo).";
    case "too_many_lines":
      return "Trop de lignes dans le CSV (max 10 000).";
    case "no_valid_rows":
      return "Aucune ligne valide trouvée dans le CSV. Vérifie le format (email obligatoire).";
    default:
      return code ?? "Erreur inconnue";
  }
}
