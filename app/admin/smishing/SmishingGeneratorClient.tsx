"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Client : formulaire de generation + preview du SMS + bouton "Copier le SMS".
// L'envoi reel est a la charge du client via son provider SMS (OVH, Octopush
// etc.) ou en forfait sur mesure (cf. bandeau pricing sur la page parente).

import { useState } from "react";

type SmishingScript = {
  smsBody: string;
  spoofedSender: string;
  attackerPersona: string;
  redFlags: string[];
  goodReflex: string;
};

const TEMPLATES: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  {
    value: "fake-livreur",
    label: "Faux livreur",
    description: "Frais de re-livraison Chronopost / La Poste",
  },
  {
    value: "fake-banque",
    label: "Fausse banque",
    description: "Tentative de paiement suspecte, validation via lien",
  },
  {
    value: "fake-impots",
    label: "Faux impôts / ANTS",
    description: "Trop-perçu remboursable, demande IBAN",
  },
  {
    value: "fake-2fa",
    label: "Faux SMS de 2FA",
    description: "Distraction code 2FA + appel support en parallèle",
  },
  {
    value: "fake-president",
    label: "Fraude au président (SMS)",
    description: "Bascule WhatsApp, opération confidentielle urgente",
  },
];

const DIFFICULTIES = [
  { value: "easy", label: "Facile (signaux grossiers)" },
  { value: "medium", label: "Moyen (signaux modérés)" },
  { value: "hard", label: "Difficile (signaux subtils)" },
];

export default function SmishingGeneratorClient() {
  const [template, setTemplate] = useState("fake-livreur");
  const [service, setService] = useState("Compta");
  const [difficulty, setDifficulty] = useState("medium");
  const [context, setContext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<SmishingScript | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setScript(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/smishing/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template, service, difficulty, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur de génération.");
        return;
      }
      setScript(data.script);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Erreur. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setPending(false);
    }
  };

  const copySms = () => {
    if (!script) return;
    navigator.clipboard.writeText(script.smsBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Formulaire */}
      <form
        onSubmit={onSubmit}
        className="card space-y-4"
        aria-labelledby="smishing-form-title"
      >
        <h2
          id="smishing-form-title"
          className="font-bold text-primary-500 dark:text-accent-300"
        >
          Paramètrès du scénario
        </h2>

        <div>
          <label
            htmlFor="smishing-template"
            className="block text-sm font-medium mb-1"
          >
            Template
          </label>
          <select
            id="smishing-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-950"
          >
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {TEMPLATES.find((t) => t.value === template)?.description}
          </p>
        </div>

        <div>
          <label
            htmlFor="smishing-service"
            className="block text-sm font-medium mb-1"
          >
            Service / public cible
          </label>
          <input
            id="smishing-service"
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            maxLength={50}
            className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-950"
            placeholder="Compta, RH, Direction, IT, Atelier…"
          />
        </div>

        <div>
          <label
            htmlFor="smishing-difficulty"
            className="block text-sm font-medium mb-1"
          >
            Difficulté
          </label>
          <select
            id="smishing-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-950"
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
            htmlFor="smishing-context"
            className="block text-sm font-medium mb-1"
          >
            Contexte additionnel (optionnel)
          </label>
          <textarea
            id="smishing-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Ex: campagne de fin d'année, période fiscale, audit imminent…"
            className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-950"
          />
          <p className="text-xs text-gray-500 mt-1">
            Pas de données personnelles (email, téléphone, SIRET) - détecté et
            refusé automatiquement.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="btn-primary w-full text-sm"
        >
          {pending ? "Génération…" : "Générer le SMS"}
        </button>

        {error && (
          <p
            role="alert"
            className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded p-2"
          >
            {error}
          </p>
        )}
      </form>

      {/* Preview */}
      <section
        aria-labelledby="smishing-preview-title"
        className="card space-y-4 bg-gray-50 dark:bg-slate-900"
      >
        <h2
          id="smishing-preview-title"
          className="font-bold text-primary-500 dark:text-accent-300"
        >
          SMS généré
        </h2>

        {!script ? (
          <p className="text-sm italic text-gray-500">
            Le SMS apparaîtra ici après génération.
          </p>
        ) : (
          <>
            {/* Mockup phone */}
            <div className="bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-4 max-w-sm mx-auto shadow-sm">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">
                De : {script.spoofedSender}
              </p>
              <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 break-words">
                {script.smsBody}
              </p>
            </div>

            <button
              type="button"
              onClick={copySms}
              className="btn-secondary text-sm w-full"
            >
              {copied ? "✓ Copié !" : "📋 Copier le SMS"}
            </button>
            <p className="text-xs text-gray-500 italic text-center">
              Collez-le dans votre outil d'envoi SMS habituel (OVH, Octopush,
              Brevo…). L'envoi n'est pas inclus dans Humanix.
            </p>

            <div>
              <h3 className="font-bold text-sm mb-1">
                Persona attaquant
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {script.attackerPersona}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-1">
                Signaux faibles à débriefer ({script.redFlags.length})
              </h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-0.5">
                {script.redFlags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-lg p-3">
              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 mb-1">
                ✓ Le bon réflexe
              </h3>
              <p className="text-sm text-emerald-900 dark:text-emerald-100">
                {script.goodReflex}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
