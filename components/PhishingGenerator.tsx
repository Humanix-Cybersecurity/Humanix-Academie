"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// UI du générateur de phishing IA. Formulaire → server action → preview avec
// onglets (HTML rendu / texte / signaux faibles).

import { useState, useTransition } from "react";
import { generatePhishingAction } from "@/app/admin/phishing/generer/actions";
import type { GeneratePhishingArgs } from "@/lib/ai/mistral";

type Generated = {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  redFlags: string[];
  fromName: string;
  fromEmail: string;
};

const TEMPLATES = [
  { id: "fake-microsoft", label: "Faux Microsoft 365", emoji: "🪟" },
  { id: "fake-fournisseur", label: "Faux fournisseur (RIB)", emoji: "🧾" },
  { id: "fake-rh", label: "Faux RH (paie)", emoji: "👥" },
  { id: "fake-banque", label: "Fausse banque", emoji: "🏦" },
  { id: "fake-livreur", label: "Faux livreur (colis)", emoji: "📦" },
  { id: "free", label: "Libre (par contexte)", emoji: "✏️" },
] as const;

const SERVICES = [
  "Direction",
  "Compta",
  "RH",
  "IT",
  "Commercial",
  "Production",
  "Achats",
  "Marketing",
];

export default function PhishingGenerator() {
  const [form, setForm] = useState<GeneratePhishingArgs>({
    template: "fake-microsoft",
    service: "Compta",
    context: "",
    difficulty: "medium",
  });
  const [result, setResult] = useState<Generated | null>(null);
  const [tab, setTab] = useState<"preview" | "text" | "redflags">("preview");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generatePhishingAction(form);
      if (res.ok) {
        setResult(res.data);
        setTab("preview");
      } else {
        setError(res.error);
      }
    });
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => alert(`${label} copié dans le presse-papier ✓`),
      () => alert("Échec de la copie"),
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Formulaire */}
      <div className="card space-y-4">
        <h2 className="text-xl font-bold text-primary-500">Paramètrès</h2>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Template
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, template: t.id }))}
                className={`text-sm p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                  form.template === t.id
                    ? "border-accent-500 bg-accent-50 dark:bg-accent-900/30 font-bold"
                    : "border-gray-200 dark:border-slate-700 hover:border-accent-300"
                }`}
                aria-pressed={form.template === t.id}
              >
                <span className="text-xl" aria-hidden="true">
                  {t.emoji}
                </span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="phish-service"
            className="block text-xs font-bold uppercase text-gray-500 mb-1"
          >
            Service cible
          </label>
          <select
            id="phish-service"
            value={form.service}
            onChange={(e) =>
              setForm((f) => ({ ...f, service: e.target.value }))
            }
            className="input w-full"
          >
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Niveau de difficulté
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                className={`text-sm p-2 rounded-xl border-2 transition-all ${
                  form.difficulty === d
                    ? "border-accent-500 bg-accent-50 dark:bg-accent-900/30 font-bold"
                    : "border-gray-200 dark:border-slate-700 hover:border-accent-300"
                }`}
                aria-pressed={form.difficulty === d}
              >
                {d === "easy"
                  ? "Facile"
                  : d === "medium"
                    ? "Moyen"
                    : "Difficile"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Difficile = signaux très subtils, quasi-indétectables.
          </p>
        </div>

        <div>
          <label
            htmlFor="phish-context"
            className="block text-xs font-bold uppercase text-gray-500 mb-1"
          >
            Contexte additionnel (optionnel)
          </label>
          <textarea
            id="phish-context"
            value={form.context ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, context: e.target.value.slice(0, 200) }))
            }
            placeholder="Ex : période de clôture annuelle, tension sur les délais fournisseurs"
            maxLength={200}
            rows={3}
            className="input w-full resize-y"
            aria-describedby="phish-context-help"
          />
          <p id="phish-context-help" className="text-[10px] text-gray-500 mt-1">
            Pas de noms propres ou d'emails réels. Max 200 caractères.
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="btn-primary w-full"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin">🤖</span> Génération en cours…
            </span>
          ) : (
            <>🪄 Générer le mail</>
          )}
        </button>

        {error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3"
          >
            <strong>Erreur :</strong> {error}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="card">
        <h2 className="text-xl font-bold text-primary-500 mb-4">Aperçu</h2>

        {!result ? (
          <div className="text-center text-sm text-gray-500 py-16">
            <p className="text-5xl mb-3 opacity-40" aria-hidden="true">
              📧
            </p>
            <p>Le mail apparaîtra ici une fois généré.</p>
          </div>
        ) : (
          <div>
            {/* Tabs */}
            <div
              role="tablist"
              className="flex gap-1 mb-4 border-b border-gray-200 dark:border-slate-700"
            >
              {(["preview", "text", "redflags"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 ${
                    tab === t
                      ? "border-accent-500 text-primary-500"
                      : "border-transparent text-gray-500 hover:text-primary-500"
                  }`}
                >
                  {t === "preview"
                    ? "Aperçu HTML"
                    : t === "text"
                      ? "Texte brut"
                      : "Signaux faibles"}
                </button>
              ))}
            </div>

            {/* Headers */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 mb-3 text-xs space-y-1">
              <p>
                <strong>De :</strong>{" "}
                <span className="font-mono text-red-600 dark:text-red-300">
                  {result.fromName} &lt;{result.fromEmail}&gt;
                </span>
              </p>
              <p>
                <strong>Sujet :</strong> {result.subject}
              </p>
            </div>

            {/* Tab content */}
            {tab === "preview" && (
              <div
                className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 max-h-[400px] overflow-y-auto text-sm"
                // Le HTML est sanitizé côté serveur (lib/ai/mistral.ts > sanitizeHtml)
                dangerouslySetInnerHTML={{ __html: result.bodyHtml }}
              />
            )}
            {tab === "text" && (
              <pre className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-xs whitespace-pre-wrap max-h-[400px] overflow-y-auto font-mono">
                {result.bodyText}
              </pre>
            )}
            {tab === "redflags" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  À débriefer après simulation : ce que les apprenants doivent
                  apprendre à repérer.
                </p>
                <ul className="space-y-2">
                  {result.redFlags.map((rf, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs"
                    >
                      <span
                        className="text-amber-600 mt-0.5"
                        aria-hidden="true"
                      >
                        ⚠️
                      </span>
                      <span className="text-amber-900 dark:text-amber-200">
                        {rf}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => copyToClipboard(result.subject, "Sujet")}
                className="btn-secondary text-xs"
              >
                📋 Copier le sujet
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(result.bodyText, "Texte")}
                className="btn-secondary text-xs"
              >
                📋 Copier le texte
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(result.bodyHtml, "HTML")}
                className="btn-secondary text-xs"
              >
                📋 Copier le HTML
              </button>
              <button
                type="button"
                onClick={onGenerate}
                disabled={pending}
                className="btn-secondary text-xs"
              >
                🔄 Re-générer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
