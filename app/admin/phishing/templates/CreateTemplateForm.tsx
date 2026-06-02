// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";
//
// Formulaire de creation d'un template phishing custom.
// Champs : name, slug (optionnel auto), emoji, difficulty, subject,
// from, body HTML, markers (1 par ligne).
// Apercu HTML rendu dans iframe sandbox sans allow-scripts pour
// defense en profondeur contre injection.

import { useActionState, useState } from "react";
import { createCustomTemplate, type CreateTemplateResult } from "./actions";

export default function CreateTemplateForm() {
  const [state, formAction, isPending] = useActionState<
    CreateTemplateResult | null,
    FormData
  >(async (_prev, formData) => {
    return await createCustomTemplate(formData);
  }, null);

  // Preview state : on garde une version locale du HTML pour le rendre
  // dans l'iframe en live (sans attendre le submit).
  const [previewHtml, setPreviewHtml] = useState("");

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="name"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
            >
              Nom du template
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              maxLength={100}
              placeholder="Faux service paie urgent"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="emoji"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
            >
              Emoji
            </label>
            <input
              type="text"
              id="emoji"
              name="emoji"
              defaultValue="🎣"
              maxLength={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Description{" "}
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <input
            type="text"
            id="description"
            name="description"
            maxLength={500}
            placeholder="Contexte pédagogique, cible recommandée..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
            >
              Slug{" "}
              <span className="text-gray-400 font-normal">
                (auto si vide, préfixé "tnt-")
              </span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              maxLength={60}
              placeholder="faux-paie-urgent"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="difficulty"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
            >
              Difficulté
            </label>
            <select
              id="difficulty"
              name="difficulty"
              defaultValue="medium"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
            >
              <option value="easy">Facile (signaux évidents)</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile (vrai test)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="emailSubject"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
            >
              Objet de l'email
            </label>
            <input
              type="text"
              id="emailSubject"
              name="emailSubject"
              required
              maxLength={200}
              placeholder="[URGENT] Validation paie sous 24h"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="emailFromName"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
            >
              Nom expéditeur
            </label>
            <input
              type="text"
              id="emailFromName"
              name="emailFromName"
              maxLength={100}
              placeholder="Service Paie"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="emailFromAddr"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Email expéditeur (domaine fictif lookalike conseillé)
          </label>
          <input
            type="text"
            id="emailFromAddr"
            name="emailFromAddr"
            required
            maxLength={100}
            placeholder="paie@entreprise-paie-urgente.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm font-mono"
          />
        </div>

        <div>
          <label
            htmlFor="emailHtml"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Corps HTML
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Utilise{" "}
            <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">
              {"{firstName}"}
            </code>{" "}
            pour le prénom du destinataire et{" "}
            <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">
              {"{trackingUrl}"}
            </code>{" "}
            pour le lien piégé tracké. HTML inline simple (table, p, a,
            strong). Pas de script, pas d'iframe.
          </p>
          <textarea
            id="emailHtml"
            name="emailHtml"
            required
            rows={10}
            onChange={(e) => setPreviewHtml(e.target.value)}
            placeholder={`<div style="font-family:Arial,sans-serif;padding:20px">\n  <p>Bonjour {firstName},</p>\n  <p>...</p>\n  <p><a href="{trackingUrl}">Valider maintenant</a></p>\n</div>`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-xs font-mono"
          />
        </div>

        <div>
          <label
            htmlFor="markers"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Signaux pédagogiques (1 par ligne, max 10)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Indices concrets que l'apprenant aurait pu repérer (affichés
            sur la landing post-clic).
          </p>
          <textarea
            id="markers"
            name="markers"
            rows={4}
            placeholder={`Domaine "entreprise-paie-urgente.com" suspect (devrait être @ton-entreprise.fr)\nUrgence + délai 24h = pression sociale\nLien direct sans vérification possible`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Création..." : "Créer le template"}
        </button>
      </form>

      {previewHtml.trim().length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">
            Aperçu (placeholders bruts, rendu sandbox isolé)
          </p>
          <iframe
            srcDoc={previewHtml}
            sandbox=""
            title="Aperçu HTML"
            className="w-full min-h-[200px] rounded-lg border border-gray-300 dark:border-slate-700 bg-white"
          />
        </div>
      )}

      {state && state.ok && (
        <div
          role="status"
          className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4"
        >
          <p className="font-bold text-emerald-900 dark:text-emerald-200">
            ✅ Template créé
          </p>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
            Slug : <code className="font-mono">{state.slug}</code>. Disponible dans
            le sélecteur de campagne /admin/phishing.
          </p>
        </div>
      )}

      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4"
        >
          <p className="font-bold text-red-900 dark:text-red-200">
            ❌ Création échouée
          </p>
          <p className="text-sm text-red-800 dark:text-red-300 mt-1 font-mono">
            {explainError(state.error)}
          </p>
        </div>
      )}
    </div>
  );
}

function explainError(code: string): string {
  switch (code) {
    case "missing_required_fields":
      return "Champs obligatoires manquants (nom, sujet, expéditeur, corps HTML).";
    case "slug_already_exists":
      return "Ce slug existe déjà pour ton tenant. Modifie le champ slug ou laisse vide pour génération auto.";
    case "unauthorized":
    case "forbidden":
      return "Tu n'as pas les droits pour gérer les templates.";
    case "db_error":
      return "Erreur base de données. Réessaie ou contacte le support.";
    default:
      return code;
  }
}
