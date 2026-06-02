// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";
//
// Formulaire client pour generer un scenario red team via Mistral.
// Affiche le brouillon recu en preview + bouton "copier le HTML".

import { useActionState, useState, useTransition } from "react";
import { generateRedTeamAction } from "./actions";
import { saveRedTeamAsTemplate } from "../templates/actions";
import type { RedTeamResult } from "@/lib/ai/phishing-redteam";

export default function RedTeamForm() {
  const [state, formAction, isPending] = useActionState<
    RedTeamResult | null,
    FormData
  >(async (_prev, formData) => {
    return await generateRedTeamAction(formData);
  }, null);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="sector"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Secteur de ton entreprise
          </label>
          <input
            type="text"
            id="sector"
            name="sector"
            placeholder="PME industrie, cabinet medical, grande distribution..."
            required
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="attackContext"
            className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
          >
            Contexte / attaque visee
          </label>
          <textarea
            id="attackContext"
            name="attackContext"
            placeholder="Ex: 'On a entendu parler de fraude au PDG dans le secteur, avec faux RIB et urgence weekend' OU 'Je veux tester le reflexe RH face a un faux CV avec piece jointe douteuse'"
            required
            maxLength={1000}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Plus tu donnes de contexte, plus Mistral genere un scenario
            pertinent. 100 a 500 chars conseilles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="targetAudience"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
            >
              Cibles a tester
            </label>
            <input
              type="text"
              id="targetAudience"
              name="targetAudience"
              placeholder="Compta, RH, dirigeants, tout le monde..."
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="difficulty"
              className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1"
            >
              Difficulte
            </label>
            <select
              id="difficulty"
              name="difficulty"
              defaultValue="medium"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
            >
              <option value="subtle">Subtle (vraie vigilance requise)</option>
              <option value="medium">Medium (signaux moyens)</option>
              <option value="brutal">Brutal (signaux evidents)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Mistral reflechit (10-20s)..." : "Generer le scenario"}
        </button>
      </form>

      {state && (
        <div className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-6">
          {!state.ok ? (
            <div
              role="alert"
              className="rounded-2xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4"
            >
              <p className="font-bold text-red-900 dark:text-red-200">
                Generation echouee
              </p>
              <p className="text-sm text-red-800 dark:text-red-300 mt-1 font-mono">
                {state.error}
              </p>
              {state.error === "no_api_key" && (
                <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                  La variable d&apos;environnement MISTRAL_API_KEY n&apos;est
                  pas configuree. Ajoute-la dans .env et relance.
                </p>
              )}
            </div>
          ) : (
            <ScenarioPreview scenario={state.scenario} />
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioPreview({
  scenario,
}: {
  scenario: import("@/lib/ai/phishing-redteam").RedTeamScenario;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-300 mb-2">
        ✅ Brouillon genere
      </p>

      <div className="rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header email simule */}
        <div className="bg-gray-50 dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700 text-sm space-y-1">
          <div className="flex gap-2 flex-wrap items-baseline">
            <strong>De :</strong>
            <span className="font-mono text-xs">{scenario.fromName} &lt;{scenario.fromEmail}&gt;</span>
            <button
              type="button"
              onClick={() => copy("from", scenario.fromEmail)}
              className="text-[10px] text-accent-500 underline ml-auto"
            >
              {copied === "from" ? "Copie!" : "Copier"}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap items-baseline">
            <strong>Objet :</strong>
            <span>{scenario.subject}</span>
            <button
              type="button"
              onClick={() => copy("subject", scenario.subject)}
              className="text-[10px] text-accent-500 underline ml-auto"
            >
              {copied === "subject" ? "Copie!" : "Copier"}
            </button>
          </div>
        </div>

        {/* Body rendu via iframe srcDoc pour isolation et rendu fidele.
            Note securite : iframe sandbox sans 'allow-scripts' + srcDoc =
            le HTML est rendu mais ne peut PAS executer JS ni faire de
            requete reseau. Defense en profondeur contre une injection
            Mistral malicieuse. */}
        <iframe
          srcDoc={scenario.bodyHtml}
          sandbox=""
          title="Preview du body email"
          className="w-full min-h-[300px] bg-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-4">
          <p className="text-xs uppercase tracking-widest font-bold text-amber-800 dark:text-amber-300 mb-2">
            🚩 Signaux pedagogiques ({scenario.markers.length})
          </p>
          <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1 list-disc pl-4">
            {scenario.markers.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 p-4">
          <p className="text-xs uppercase tracking-widest font-bold text-cyan-800 dark:text-cyan-300 mb-2">
            🎯 Recommandation cibles
          </p>
          <p className="text-sm text-cyan-900 dark:text-cyan-100">
            {scenario.audienceRecommendation}
          </p>
          <p className="text-xs uppercase tracking-widest font-bold text-cyan-800 dark:text-cyan-300 mt-4 mb-2">
            📚 Objectif pedagogique
          </p>
          <p className="text-sm text-cyan-900 dark:text-cyan-100">
            {scenario.pedagogicalGoal}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <button
          type="button"
          onClick={() => copy("body", scenario.bodyHtml)}
          className="btn-secondary text-sm"
        >
          {copied === "body" ? "HTML copie!" : "Copier le HTML"}
        </button>
        <SaveAsTemplateButton scenario={scenario} />
      </div>

      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-200">
        <strong>Prochaine etape :</strong> utilise le bouton{" "}
        <em>Sauvegarder comme template</em> pour persister ce scenario en
        BDD et le rendre dispo dans le selecteur de campagne sur
        /admin/phishing. Sinon copie le HTML / sujet / sender et utilise-les
        manuellement.
      </div>
    </div>
  );
}

/**
 * Bouton "Sauvegarder comme template" : persiste le scenario IA en BDD via
 * saveRedTeamAsTemplate() pour reutilisation dans le selecteur de campagne.
 */
function SaveAsTemplateButton({
  scenario,
}: {
  scenario: import("@/lib/ai/phishing-redteam").RedTeamScenario;
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "saved"; slug: string }
    | { kind: "error"; msg: string }
    | null
  >(null);

  function save() {
    startTransition(async () => {
      setFeedback(null);
      const fd = new FormData();
      // Le name du scenario est deduit du subject (1eres ~50 chars sans
      // prefixes URGENT/Action)
      const cleanName = scenario.subject
        .replace(/^\[?(URGENT|Action requise|Confidentiel)\]?\s*/i, "")
        .slice(0, 80);
      fd.set("name", cleanName || "Scenario red team");
      fd.set("subject", scenario.subject);
      fd.set("fromEmail", scenario.fromEmail);
      fd.set("fromName", scenario.fromName);
      fd.set("bodyHtml", scenario.bodyHtml);
      fd.set("markersJson", JSON.stringify(scenario.markers));
      const res = await saveRedTeamAsTemplate(fd);
      if (res.ok) {
        setFeedback({ kind: "saved", slug: res.slug });
      } else {
        setFeedback({ kind: "error", msg: res.error });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="text-sm px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition disabled:opacity-50"
      >
        {isPending ? "Sauvegarde..." : "💾 Sauvegarder comme template"}
      </button>
      {feedback?.kind === "saved" && (
        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
          ✅ Sauvegardé (slug: <code>{feedback.slug}</code>)
        </span>
      )}
      {feedback?.kind === "error" && (
        <span className="text-xs text-red-700 dark:text-red-300 font-bold">
          ❌ {feedback.msg}
        </span>
      )}
    </>
  );
}
