// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";
//
// Form client component pour declencher reseedCatalogAction.
//
// - Confirmation step-up (modal natif window.confirm pour simplicite,
//   le step-up WebAuthn est deja exige par /superadmin/layout.tsx donc
//   on est deja sur un humain authentifie fort).
// - Loading state pendant l'execution (le seed prend typiquement 1-5s).
// - Affichage inline du resultat (toast inline, pas de modal complexe).
// - useActionState (React 19) pour le state.

import { useActionState } from "react";
import {
  reseedCatalogAction,
  type ReseedCatalogResponse,
} from "./actions";

export function ReseedCatalogForm() {
  const [state, formAction, isPending] = useActionState<
    ReseedCatalogResponse | null,
    FormData
  >(async (_prev) => {
    return await reseedCatalogAction();
  }, null);

  return (
    <section
      aria-labelledby="reseed-action-title"
      className="card border-2 border-primary-200 dark:border-accent-900/40 bg-gradient-to-br from-primary-50 to-white dark:from-slate-900 dark:to-slate-950"
    >
      <h2
        id="reseed-action-title"
        className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2"
      >
        Re-importer le catalog
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Synchronise dans la BDD toutes les saisons, épisodes, badges et items boutique
        définis dans le code. Idempotent : ne crée pas de doublons, ne supprime rien.
      </p>

      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !confirm(
              "Re-importer le catalog dans la BDD ?\n\nL'operation est idempotente (safe), mais peut prendre quelques secondes.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Re-import en cours..." : "Re-importer maintenant"}
        </button>
      </form>

      {/* Resultat inline */}
      {state && state.ok && (
        <div
          role="status"
          className="mt-4 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4"
        >
          <p className="font-bold text-emerald-900 dark:text-emerald-200">
            ✅ Re-import réussi
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2 text-emerald-900 dark:text-emerald-200">
            <dt>Source catalog</dt>
            <dd className="font-mono">{state.result.catalogSource}</dd>
            <dt>Saisons</dt>
            <dd className="tabular-nums">{state.result.saisons}</dd>
            <dt>Épisodes</dt>
            <dd className="tabular-nums">{state.result.episodes}</dd>
            <dt>Badges</dt>
            <dd className="tabular-nums">{state.result.achievements}</dd>
            <dt>Items boutique</dt>
            <dd className="tabular-nums">{state.result.shopItems}</dd>
            <dt>Durée</dt>
            <dd className="tabular-nums">{state.result.durationMs} ms</dd>
          </dl>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-3">
            Rafraîchis la page pour voir les nouveaux totaux BDD ci-dessus.
          </p>
        </div>
      )}

      {state && !state.ok && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4"
        >
          <p className="font-bold text-red-900 dark:text-red-200">
            ❌ Re-import échoué
          </p>
          <p className="text-sm text-red-800 dark:text-red-300 mt-1 font-mono">
            {state.error}
          </p>
          <p className="text-xs text-red-700 dark:text-red-400 mt-2">
            Consulte l'audit log /admin/audit pour le détail. Si le problème
            persiste, vérifie l'état de la BDD et les logs serveur.
          </p>
        </div>
      )}
    </section>
  );
}
