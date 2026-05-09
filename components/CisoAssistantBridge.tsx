"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Composant client pour la page /integrations/ciso-assistant.
// Gere : onglets framework, copie 1-clic des snippets, preview JSON live.
// A11y : aria-selected sur tabs, focus visible, prefers-reduced-motion.

import { useEffect, useMemo, useState } from "react";
import {
  FRAMEWORKS,
  SUPPORTED_FRAMEWORKS,
  type FrameworkRef,
} from "@/lib/mapping-grc";

type Snippet = { id: "curl" | "python" | "node"; label: string; code: string };

const SNIPPET_TEMPLATES = (framework: FrameworkRef): Snippet[] => [
  {
    id: "curl",
    label: "curl",
    code: `curl -H "Authorization: Bearer hxa_VOTRE_CLE_API" \\
  "https://academie.humanix-cybersecurity.fr/api/v1/evidence-export?framework=${framework}&format=ciso-assistant-v1"`,
  },
  {
    id: "python",
    label: "Python",
    code: `import requests, os

r = requests.get(
    "https://academie.humanix-cybersecurity.fr/api/v1/evidence-export",
    params={"framework": "${framework}", "format": "ciso-assistant-v1"},
    headers={"Authorization": f"Bearer {os.environ['HUMANIX_API_KEY']}"},
    timeout=30,
)
bundle = r.json()
print(f"{bundle['summary']['compliant']}/{bundle['summary']['total_controls']} controles compliant")`,
  },
  {
    id: "node",
    label: "Node.js",
    code: `const res = await fetch(
  \`https://academie.humanix-cybersecurity.fr/api/v1/evidence-export?framework=${framework}\`,
  { headers: { Authorization: \`Bearer \${process.env.HUMANIX_API_KEY}\` } }
);
const bundle = await res.json();
console.log(\`\${bundle.summary.compliant}/\${bundle.summary.total_controls} compliant\`);`,
  },
];

const FRAMEWORK_LABELS: Record<FrameworkRef, { short: string; emoji: string }> =
  {
    "ISO27001:2022": { short: "ISO 27001", emoji: "🌍" },
    NIS2: { short: "NIS2", emoji: "🇪🇺" },
    RGPD: { short: "RGPD", emoji: "📋" },
    "ANSSI-HG": { short: "ANSSI HG", emoji: "🇫🇷" },
    "NIST-CSF": { short: "NIST CSF", emoji: "🇺🇸" },
    SAPIN2: { short: "Sapin II", emoji: "⚖️" },
  };

export default function CisoAssistantBridge() {
  const [framework, setFramework] = useState<FrameworkRef>("ISO27001:2022");
  const [snippetTab, setSnippetTab] = useState<Snippet["id"]>("curl");
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fw = FRAMEWORKS[framework];
  const snippets = useMemo(() => SNIPPET_TEMPLATES(framework), [framework]);
  const currentSnippet =
    snippets.find((s) => s.id === snippetTab) ?? snippets[0];

  const filteredControls = fw.controls.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.ref.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.category ?? "").toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(null), 1800);
      return () => clearTimeout(t);
    }
  }, [copied]);

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied("error");
    }
  }

  return (
    <div className="space-y-10">
      {/* ============================================================
          BLOC 1 - Selecteur de framework
          ============================================================ */}
      <section aria-labelledby="framework-selector-title">
        <h2
          id="framework-selector-title"
          className="text-xl font-extrabold text-primary-500 mb-3"
        >
          1. Choisissez votre referentiel
        </h2>
        <div
          role="tablist"
          aria-label="Referentiels de conformite supportes"
          className="flex flex-wrap gap-2"
        >
          {SUPPORTED_FRAMEWORKS.map((ref) => {
            const meta = FRAMEWORK_LABELS[ref];
            const selected = framework === ref;
            return (
              <button
                key={ref}
                role="tab"
                aria-selected={selected}
                aria-controls={`framework-panel-${ref}`}
                id={`framework-tab-${ref}`}
                onClick={() => setFramework(ref)}
                className={`px-4 py-2 rounded-full font-semibold text-sm transition-all border-2 ${
                  selected
                    ? "bg-primary-500 text-white border-primary-500 shadow-md"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:border-primary-500"
                }`}
              >
                <span aria-hidden="true" className="mr-1">
                  {meta.emoji}
                </span>
                {meta.short}
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          BLOC 2 - Snippet copiable
          ============================================================ */}
      <section
        id={`framework-panel-${framework}`}
        role="tabpanel"
        aria-labelledby={`framework-tab-${framework}`}
        className="card"
      >
        <h2 className="text-xl font-extrabold text-primary-500 mb-3">
          2. Recuperez vos preuves en une requete
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Une cle API tenant suffit. Generez-la depuis{" "}
          <code className="text-xs bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
            /admin/api-keys
          </code>{" "}
          (plan Pro ou superieur).
        </p>

        <div
          role="tablist"
          aria-label="Langage du snippet"
          className="flex gap-1 mb-3 border-b border-gray-200 dark:border-slate-700"
        >
          {snippets.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={snippetTab === s.id}
              onClick={() => setSnippetTab(s.id)}
              className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 -mb-px ${
                snippetTab === s.id
                  ? "border-accent-500 text-accent-500"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-primary-500"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <pre
            className="bg-slate-900 dark:bg-black text-slate-100 p-4 pr-24 rounded-xl text-xs sm:text-sm overflow-x-auto"
            aria-label={`Exemple de code ${currentSnippet.label}`}
          >
            <code>{currentSnippet.code}</code>
          </pre>
          <button
            onClick={() =>
              copyToClipboard(currentSnippet.code, currentSnippet.id)
            }
            className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500"
            aria-label={`Copier le snippet ${currentSnippet.label}`}
          >
            {copied === currentSnippet.id ? "✓ Copie" : "Copier"}
          </button>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {copied === currentSnippet.id
            ? "Snippet copie dans le presse-papiers"
            : ""}
        </div>
      </section>

      {/* ============================================================
          BLOC 3 - Tableau de mapping filtrable
          ============================================================ */}
      <section aria-labelledby="mapping-table-title">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
          <h2
            id="mapping-table-title"
            className="text-xl font-extrabold text-primary-500"
          >
            3. Mapping {fw.title}
          </h2>
          <label className="text-sm">
            <span className="sr-only">Filtrer les controles</span>
            <input
              type="search"
              placeholder="Filtrer (ref, nom, categorie)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 max-w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Mapping des controles {fw.title} vers les donnees Humanix
            </caption>
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-left">
                <th scope="col" className="p-3 font-bold">
                  Ref
                </th>
                <th scope="col" className="p-3 font-bold">
                  Controle
                </th>
                <th scope="col" className="p-3 font-bold">
                  Categorie
                </th>
                <th scope="col" className="p-3 font-bold">
                  Donnees Humanix
                </th>
                <th scope="col" className="p-3 font-bold text-right">
                  Couverture
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredControls.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    Aucun controle ne correspond a votre filtre.
                  </td>
                </tr>
              )}
              {filteredControls.map((c) => {
                const isCore = (c.thresholdCompliant ?? 0) > 0;
                return (
                  <tr
                    key={c.ref}
                    className="border-t border-gray-100 dark:border-slate-700 hover:bg-primary-50/30 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-3 font-mono text-xs whitespace-nowrap">
                      {c.ref}
                    </td>
                    <td className="p-3 font-semibold">{c.name}</td>
                    <td className="p-3 text-gray-500 text-xs">{c.category}</td>
                    <td className="p-3">
                      <ul className="space-y-1">
                        {c.artifacts.map((a, i) => (
                          <li key={i} className="text-xs">
                            <span
                              className="inline-block w-2 h-2 rounded-full bg-accent-500 mr-1.5 align-middle"
                              aria-hidden="true"
                            />
                            {a.label}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3 text-right">
                      {isCore ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-bold px-2 py-1 rounded-full">
                          ★ Coeur
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded-full">
                          Documentaire
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {fw.outOfScope.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-primary-500 font-semibold">
              Hors scope assume ({fw.outOfScope.length} controles)
            </summary>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-gray-600 dark:text-gray-400 text-xs">
              {fw.outOfScope.map((o) => (
                <li key={o.ref}>
                  <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">
                    {o.ref}
                  </code>{" "}
                  - {o.reason}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
