"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Client component : formulaire de generation + preview du script + bouton
// "Ecouter avec Piper TTS". Tout passe par l'endpoint /api/admin/vishing/generate
// (server-side : auth, plan-gating, rate limit, anti-PII).

import { useState } from "react";

type VishingScript = {
  openingLine: string;
  body: string;
  callToAction: string;
  attackerPersona: string;
  spoofedCallerId: string;
  redFlags: string[];
  ttsScript: string;
};

const TEMPLATES: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  {
    value: "fake-support-it",
    label: "Faux support IT",
    description: "Ton presse, demande d'identifiant + code SMS",
  },
  {
    value: "fake-banque",
    label: "Faux conseiller bancaire",
    description: "Pretexte fraude + demande OTP",
  },
  {
    value: "fake-direction",
    label: "Fraude au President",
    description: "Direction urgente + virement confidentiel",
  },
  {
    value: "fake-fournisseur",
    label: "Faux fournisseur",
    description: "Changement de RIB en urgence",
  },
  {
    value: "fake-cnil",
    label: "Faux contrôle CNIL/ANSSI",
    description: "Pretexte controle reglementaire",
  },
  {
    value: "free",
    label: "Scenario libre",
    description: "Decrivez le scenario voulu en contexte",
  },
];

const DIFFICULTIES = [
  { value: "easy", label: "Facile (signaux gros)" },
  { value: "medium", label: "Moyen (signaux moderes)" },
  { value: "hard", label: "Difficile (signaux subtils)" },
];

export default function VishingGeneratorClient() {
  const [template, setTemplate] = useState("fake-support-it");
  const [service, setService] = useState("Compta");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<VishingScript | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setScript(null);
    setAudioUrl(null);
    setTtsError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vishing/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          template,
          service,
          difficulty,
          context: context.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.message ||
            data?.error ||
            `Erreur HTTP ${res.status}. Reessayez plus tard.`,
        );
        return;
      }
      setScript(data.script as VishingScript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleTts() {
    if (!script) return;
    setTtsError(null);
    setTtsLoading(true);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    try {
      const res = await fetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: script.ttsScript }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data as { error?: string }).error ?? `Erreur TTS HTTP ${res.status}`;
        if (msg === "tts_server_disabled") {
          setTtsError(
            "Piper TTS non configure cote serveur. Ajoutez TTS_SERVER_URL dans .env pour activer la lecture audio.",
          );
        } else {
          setTtsError(`TTS indisponible : ${msg}`);
        }
        return;
      }
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err) {
      setTtsError(err instanceof Error ? err.message : "Erreur reseau TTS");
    } finally {
      setTtsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleGenerate} className="card space-y-4">
        <h2 className="font-bold text-primary-500 mb-1">
          Configurer le scenario
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Template
            </span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:border-accent-500 focus:ring-accent-500"
              disabled={loading}
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500 mt-1 block">
              {TEMPLATES.find((t) => t.value === template)?.description}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Service cible
            </span>
            <input
              type="text"
              value={service}
              onChange={(e) => setService(e.target.value)}
              maxLength={50}
              required
              placeholder="Compta, RH, IT, Direction..."
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:border-accent-500 focus:ring-accent-500"
              disabled={loading}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Difficulte
            </span>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as typeof difficulty)
              }
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:border-accent-500 focus:ring-accent-500"
              disabled={loading}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Contexte (optionnel, max 200 chars)
            </span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Ex : campagne post-incident phishing reussi"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:border-accent-500 focus:ring-accent-500"
              disabled={loading}
            />
            <span className="text-xs text-gray-500">
              Pas de PII (email, telephone, SIREN/SIRET, nom propre reel).
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !service.trim()}
          className="btn-primary"
        >
          {loading ? "Generation en cours..." : "🎙️ Generer le script de vishing"}
        </button>

        {error && (
          <div
            role="alert"
            className="text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md border border-red-200 dark:border-red-800"
          >
            {error}
          </div>
        )}
      </form>

      {script && (
        <div className="card space-y-4">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-bold text-primary-500">
                Script genere - formation interne uniquement
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Persona attaquant : {script.attackerPersona} · Numero affiche :{" "}
                <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800">
                  {script.spoofedCallerId}
                </code>
              </p>
            </div>
            <button
              type="button"
              onClick={handleTts}
              disabled={ttsLoading}
              className="btn-secondary text-sm whitespace-nowrap"
            >
              {ttsLoading
                ? "Synthese..."
                : "🔊 Ecouter avec Piper TTS (souverain FR)"}
            </button>
          </header>

          <div className="space-y-3">
            <Block label="🎙 Phrase d'ouverture" text={script.openingLine} />
            <Block label="💬 Corps de la conversation" text={script.body} />
            <Block label="⚡ Pression / Call-to-action" text={script.callToAction} />
          </div>

          {script.redFlags.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <h3 className="font-bold text-green-800 dark:text-green-200 mb-2 text-sm">
                Signaux faibles a debriefer apres la simulation
              </h3>
              <ul className="text-sm space-y-1 list-disc list-inside text-green-900 dark:text-green-100">
                {script.redFlags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {audioUrl && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                🔒 Synthese realisee localement par Piper TTS. Aucun audio n'a
                quitte l'infrastructure souveraine.
              </p>
              <audio
                controls
                src={audioUrl}
                aria-label="Lecture audio du script de vishing"
                className="w-full"
              />
            </div>
          )}

          {ttsError && (
            <div
              role="alert"
              className="text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-3 rounded-md border border-amber-200 dark:border-amber-800"
            >
              {ttsError}
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
            ⚠ Ce script est genere a des fins pedagogiques. Toute utilisation
            malveillante est strictement interdite et engage la responsabilite
            de l'utilisateur.
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l-2 border-accent-500 pl-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm whitespace-pre-line text-gray-800 dark:text-gray-200">
        {text}
      </p>
    </div>
  );
}
