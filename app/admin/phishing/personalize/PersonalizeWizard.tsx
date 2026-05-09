"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Wizard de generation de phishings personnalises :
//   1. Selection des cibles (employes du tenant)
//   2. Configuration : template + difficulte + ton + événement contextuel
//   3. Generation -> resultats avec preview de chaque mail + signaux faibles

import { useState, useTransition } from "react";
import { generatePersonalizedBatch, type GenerateState } from "./actions";
import type { PersonalizedPhishing } from "@/lib/phishing/personalized";

type Employee = {
  id: string;
  name: string | null;
  email: string;
  service: string | null;
};

const TEMPLATES = [
  { value: "fake-microsoft", label: "🪟 Faux Microsoft 365" },
  { value: "fake-fournisseur", label: "🏭 Faux fournisseur (RIB)" },
  { value: "fake-rh", label: "👔 Faux email RH" },
  { value: "fake-banque", label: "🏦 Faux email banque" },
  { value: "fake-livreur", label: "📦 Faux livreur (douane)" },
  { value: "free", label: "🎨 Libre" },
];

const DIFFICULTIES = [
  { value: "easy", label: "🟢 Facile (signaux grossiers)" },
  { value: "medium", label: "🟡 Moyen (signaux modérés)" },
  { value: "hard", label: "🔴 Difficile (signaux subtils)" },
];

const STYLES = [
  { value: "", label: "(automatique)" },
  { value: "urgent", label: "⏰ Urgent" },
  { value: "amical", label: "😊 Amical" },
  { value: "autoritaire", label: "👔 Autoritaire" },
  { value: "discret", label: "🤫 Discret" },
];

export default function PersonalizeWizard({
  employees,
  isUsingMistralLive,
}: {
  employees: Employee[];
  isUsingMistralLive: boolean;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState<string>("fake-microsoft");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [attackerStyle, setAttackerStyle] = useState<string>("");
  const [recentEvent, setRecentEvent] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<GenerateState | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === employees.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(employees.map((e) => e.id)));
  };

  const handleGenerate = () => {
    setState(null);
    setProgressMsg("Préparation du batch…");
    setStep(3);

    // Simulation timer cote client : ~1.5s par employe
    const ids = Array.from(selectedIds);
    const total = ids.length;
    let counter = 0;
    const tick = setInterval(() => {
      counter += 1;
      if (counter <= total) {
        setProgressMsg(`Génération ${counter} / ${total}…`);
      }
    }, 1500);

    startTransition(async () => {
      const res = await generatePersonalizedBatch({
        targetIds: ids,
        template,
        difficulty,
        attackerStyle: attackerStyle || undefined,
        recentEvent: recentEvent || undefined,
      });
      clearInterval(tick);
      setState(res);
      setProgressMsg("");
    });
  };

  // ============== STEP 1 : SELECTION DES CIBLES ==============
  if (step === 1) {
    return (
      <section aria-labelledby="step1-title" className="card">
        <header className="mb-4">
          <h2
            id="step1-title"
            className="text-xl font-bold text-primary-500 dark:text-accent-300"
          >
            1. Sélectionnez les employés à cibler
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {selectedIds.size} sur {employees.length} sélectionné(s) - max 50
            par batch.
          </p>
        </header>

        <div className="mb-4">
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm text-accent-600 dark:text-accent-300 hover:underline"
          >
            {selectedIds.size === employees.length
              ? "Tout désélectionner"
              : "Tout sélectionner"}
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
          {employees.length === 0 && (
            <p className="p-4 text-sm text-gray-500 italic">
              Aucun employé actif. Importez des utilisateurs depuis l'écran «
              Utilisateurs ».
            </p>
          )}
          {employees.map((e) => {
            const selected = selectedIds.has(e.id);
            return (
              <label
                key={e.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(e.id)}
                  className="w-5 h-5 accent-accent-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{e.name ?? e.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {e.email} {e.service ? `· ${e.service}` : ""}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={selectedIds.size === 0 || selectedIds.size > 50}
            className="btn-primary disabled:opacity-50"
          >
            Suivant → Configuration
          </button>
        </div>
      </section>
    );
  }

  // ============== STEP 2 : CONFIGURATION ==============
  if (step === 2) {
    return (
      <section aria-labelledby="step2-title" className="card">
        <header className="mb-4">
          <h2
            id="step2-title"
            className="text-xl font-bold text-primary-500 dark:text-accent-300"
          >
            2. Configurez la campagne
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {selectedIds.size} employé(s) ciblé(s). L'IA va générer un mail
            unique pour chacun.
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="template"
              className="block text-sm font-medium mb-1"
            >
              Template de phishing *
            </label>
            <select
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="input"
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="difficulty"
              className="block text-sm font-medium mb-1"
            >
              Niveau de difficulté *
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="input"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="attackerStyle"
              className="block text-sm font-medium mb-1"
            >
              Ton de l'attaquant (optionnel)
            </label>
            <select
              id="attackerStyle"
              value={attackerStyle}
              onChange={(e) => setAttackerStyle(e.target.value)}
              className="input"
            >
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="recentEvent"
              className="block text-sm font-medium mb-1"
            >
              Évènement contextuel récent (optionnel, augmente la crédibilité)
            </label>
            <input
              id="recentEvent"
              type="text"
              value={recentEvent}
              onChange={(e) => setRecentEvent(e.target.value)}
              maxLength={200}
              className="input"
              placeholder='Ex : "CSE du 15 mai", "Séminaire à Lyon", "Lancement du nouveau CRM"'
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ⚠ Pas de noms propres réels ni d'emails - l'IA refuse les PII.
            </p>
          </div>

          {!isUsingMistralLive && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-3 rounded text-sm">
              <p className="font-bold text-amber-800 dark:text-amber-200">
                Mode démo actif
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                Les contenus générés seront des fixtures pré-écrites (pas
                d'appel Mistral réel). Configurez MISTRAL_API_KEY pour activer
                la génération IA en production.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="btn-secondary"
          >
            ← Retour
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pending}
            className="btn-primary"
          >
            {pending
              ? "Génération…"
              : `🚀 Générer ${selectedIds.size} mail(s) personnalisé(s)`}
          </button>
        </div>
      </section>
    );
  }

  // ============== STEP 3 : RESULTATS ==============
  return (
    <section aria-labelledby="step3-title">
      <header className="mb-4">
        <h2
          id="step3-title"
          className="text-xl font-bold text-primary-500 dark:text-accent-300"
        >
          3. Résultats
        </h2>
        {pending && (
          <div className="mt-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm">
            ⏳ {progressMsg || "En cours…"} - Patience, l'IA prend ~1-2 sec par
            mail.
          </div>
        )}
        {state?.ok === false && (
          <div className="mt-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            ⚠ {state.error}
          </div>
        )}
        {state?.ok && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            ✅ {state.results?.length} mail(s) généré(s).{" "}
            {state.errorDetails && state.errorDetails.length > 0
              ? `${state.errorDetails.length} erreur(s).`
              : ""}
          </p>
        )}
      </header>

      {state?.results && (
        <div className="space-y-4">
          {state.results.map((r) => (
            <PhishingPreview key={r.targetId} item={r} />
          ))}
        </div>
      )}

      {state?.errorDetails && state.errorDetails.length > 0 && (
        <details className="mt-6 card border-red-200">
          <summary className="cursor-pointer font-bold text-red-700">
            ⚠ Voir les {state.errorDetails.length} erreur(s)
          </summary>
          <ul className="mt-3 space-y-1 text-sm">
            {state.errorDetails.map((e, idx) => (
              <li key={idx}>
                <strong>{e.email}</strong> - {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setStep(1);
            setState(null);
            setSelectedIds(new Set());
          }}
          className="btn-secondary"
        >
          ↻ Nouveau batch
        </button>
        <a href="/admin/phishing" className="btn-secondary">
          Voir les campagnes phishing classiques
        </a>
      </div>
    </section>
  );
}

function PhishingPreview({ item }: { item: PersonalizedPhishing }) {
  const [showHtml, setShowHtml] = useState(false);
  return (
    <article className="card">
      <header className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase font-bold text-accent-500">Cible</p>
          <p className="font-bold">
            {item.targetEmail}
            {item.targetService ? ` · ${item.targetService}` : ""}
          </p>
        </div>
        <code className="text-xs text-gray-400">{item.promptHash}</code>
      </header>

      <div className="mb-3 text-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          De : <strong>{item.generated.fromName}</strong> &lt;
          {item.generated.fromEmail}&gt;
        </p>
        <p className="font-bold mt-1">{item.generated.subject}</p>
      </div>

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setShowHtml(!showHtml)}
          className="text-xs text-accent-500 hover:underline"
        >
          {showHtml ? "Voir version texte" : "Voir version HTML"}
        </button>
      </div>

      {showHtml ? (
        <div
          className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white text-gray-900 text-sm"
          // eslint-disable-next-line react/no-danger -- contenu sanitize cote serveur
          dangerouslySetInnerHTML={{ __html: item.generated.bodyHtml }}
        />
      ) : (
        <pre className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800 text-sm whitespace-pre-wrap font-sans">
          {item.generated.bodyText}
        </pre>
      )}

      <details className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
        <summary className="cursor-pointer text-sm font-bold text-primary-500 dark:text-accent-300">
          🚩 {item.generated.redFlags.length} signaux faibles à débriefer
        </summary>
        <ul className="mt-2 list-disc list-inside text-sm space-y-1 text-gray-700 dark:text-gray-200">
          {item.generated.redFlags.map((rf, idx) => (
            <li key={idx}>{rf}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
