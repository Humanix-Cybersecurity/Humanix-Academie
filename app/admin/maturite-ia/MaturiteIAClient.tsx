"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// MaturiteIAClient - questionnaire interactif client-side.
//
// Persistance localStorage : tant qu'on n'a pas de migration BDD, l'admin
// peut sauvegarder son auto-evaluation localement. Cle :
// "humanix:maturite-ia:answers". Reset possible.
//
// Calcul : 8 axes * 12.5 = 100. Reponse "non-applicable" = 12.5 (neutre),
// "non" = 0, "partiel" = 6.25, "oui" = 12.5.

import { useEffect, useState } from "react";

type Answer = "" | "no" | "partial" | "yes" | "na";

type Question = {
  id: string;
  axis: string;
  text: string;
  why: string;
};

const QUESTIONS: Question[] = [
  {
    id: "charte",
    axis: "Gouvernance",
    text: "Votre organisation a-t-elle une charte écrite encadrant l'usage de l'IA générative ?",
    why: "Sans charte, chaque collaborateur arbitre seul ses propres règles. AI Act + RGPD article 32 imposent une politique formalisée.",
  },
  {
    id: "formation",
    axis: "Compétences",
    text: "Vos équipes ont-elles été formées à l'IA générative (hallucinations, biais, prompt design) dans les 12 derniers mois ?",
    why: "Sans formation, vos utilisateurs subissent les biais des LLMs sans les voir. Étude MIT 2025 : -23 % de capacité de rappel sans IA après 6 mois d'usage sans formation.",
  },
  {
    id: "shadow-ai",
    axis: "Visibilité",
    text: "Connaissez-vous précisément quels outils IA sont utilisés par vos collaborateurs (y compris en personnel) ?",
    why: "Le shadow AI fait fuiter des données vers ChatGPT, Claude, Copilot personnels. Visibilité = pré-requis du contrôle.",
  },
  {
    id: "donnees-sensibles",
    axis: "Sécurité",
    text: "Avez-vous une politique claire interdisant l'envoi de données sensibles (clients, financières, RH) aux IAs publiques ?",
    why: "Une fois envoyé dans ChatGPT, c'est dans les serveurs OpenAI (et potentiellement dans l'entraînement). Récupération impossible.",
  },
  {
    id: "supervision",
    axis: "Supervision",
    text: "Vos workflows utilisant l'IA garantissent-ils une décision humaine finale sur les actes engageants (recrutement, scoring, sanctions) ?",
    why: "AI Act EU article 14 : supervision humaine effective obligatoire sur les systèmes IA à haut risque. Sans elle, vous êtes hors-la-loi 2026.",
  },
  {
    id: "deepfake",
    axis: "Sécurité",
    text: "Vos procédures de paiement et d'autorisation interne résistent-elles à un appel téléphonique avec voix clonée IA ?",
    why: "L'arnaque au président par deepfake vocal est en explosion (+340 % CESIN 2025). Un mot de passe interne + rappel sur ligne habituelle = défense efficace.",
  },
  {
    id: "ai-act",
    axis: "Conformité",
    text: "Avez-vous identifié si votre organisation utilise des systèmes IA classés &laquo; haut risque &raquo; selon l'AI Act EU ?",
    why: "RH, scoring crédit, gestion infrastructure critique, biométrie → haut risque. Obligations légales 2026-2027 selon le calendrier AI Act.",
  },
  {
    id: "audit",
    axis: "Gouvernance",
    text: "Pouvez-vous, en cas d'incident lié à l'IA, retracer qui a utilisé quoi, quand, avec quel résultat ?",
    why: "Sans traçabilité, vous ne pouvez ni prouver la conformité (audit) ni identifier la cause racine d'un incident.",
  },
];

const STORAGE_KEY = "humanix:maturite-ia:answers";
const BENCHMARK_PME = 42; // Mediane PME francaise (hardcoded V1, cf. page.tsx footer)

function scoreFor(answer: Answer): number {
  switch (answer) {
    case "yes":
    case "na":
      return 12.5;
    case "partial":
      return 6.25;
    case "no":
      return 0;
    default:
      return 0;
  }
}

function planActionFor(score: number, answers: Record<string, Answer>): string[] {
  const actions: string[] = [];
  if (answers.charte === "no") {
    actions.push("📜 Rédiger une charte IA d'entreprise (template fourni dans la saison Maîtrise IA, épisode 12).");
  }
  if (answers.formation === "no" || answers.formation === "partial") {
    actions.push("🎓 Déployer la saison &laquo; Maîtrise IA &raquo; (12 épisodes, 5 min chacun) à toutes vos équipes.");
  }
  if (answers["shadow-ai"] === "no") {
    actions.push("🌑 Lancer un audit Shadow AI : sondage anonyme + monitoring DLP sur les exports vers IAs publiques.");
  }
  if (answers["donnees-sensibles"] === "no" || answers["donnees-sensibles"] === "partial") {
    actions.push("🔒 Formaliser une politique &laquo; données interdites en prompt &raquo; et la communiquer (épisode 04).");
  }
  if (answers.supervision === "no") {
    actions.push("👁️ Recenser tous les workflows IA &laquo; haut risque &raquo; et y intégrer un point de validation humaine.");
  }
  if (answers.deepfake === "no") {
    actions.push("🎭 Mettre en place un mot de passe interne pour valider les ordres de paiement par téléphone (épisode 06).");
  }
  if (answers["ai-act"] === "no") {
    actions.push("⚖️ Cartographier vos systèmes IA selon les 4 niveaux de risque AI Act (épisode 11).");
  }
  if (answers.audit === "no") {
    actions.push("📜 Activer un audit log centralisé sur les usages IA (Humanix le fait nativement pour l'usage Hex Chat interne).");
  }
  if (actions.length === 0) {
    actions.push("✨ Excellent niveau ! Maintenez l'effort : audit trimestriel de la charte + revue annuelle des outils déployés.");
  }
  return actions;
}

function maturityLevel(score: number): { label: string; color: string; emoji: string } {
  if (score >= 80) return { label: "Référence", color: "emerald", emoji: "🏆" };
  if (score >= 60) return { label: "Mature", color: "cyan", emoji: "✅" };
  if (score >= 40) return { label: "En progression", color: "amber", emoji: "📈" };
  if (score >= 20) return { label: "Débutant", color: "orange", emoji: "🌱" };
  return { label: "Critique", color: "rose", emoji: "🚨" };
}

export default function MaturiteIAClient() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [mounted, setMounted] = useState(false);

  // Hydrate depuis localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Persiste a chaque changement
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, mounted]);

  const score = QUESTIONS.reduce(
    (acc, q) => acc + scoreFor(answers[q.id] ?? ""),
    0,
  );
  const answeredCount = QUESTIONS.filter((q) => answers[q.id]).length;
  const level = maturityLevel(score);
  const actions = answeredCount === QUESTIONS.length ? planActionFor(score, answers) : [];

  function setAnswer(id: string, val: Answer) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function reset() {
    if (confirm("Réinitialiser toutes vos réponses ?")) {
      setAnswers({});
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  function exportJson() {
    const data = {
      timestamp: new Date().toISOString(),
      score,
      level: level.label,
      answers,
      benchmark: { medianePMEFrancaise: BENCHMARK_PME },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `humanix-maturite-ia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!mounted) {
    return <div className="text-gray-500 text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-8">
      {/* === Score live + comparaison === */}
      <section
        className={`rounded-2xl border-2 border-${level.color}-300 dark:border-${level.color}-700 bg-${level.color}-50/40 dark:bg-${level.color}-900/20 p-6`}
      >
        <div className="grid sm:grid-cols-3 gap-4 items-center">
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-1">
              Votre score
            </p>
            <p className="text-5xl font-extrabold tabular-nums text-primary-500 dark:text-accent-300">
              {score.toFixed(0)}
              <span className="text-2xl text-gray-400">/100</span>
            </p>
            <p className="mt-2 text-sm font-bold">
              <span aria-hidden="true">{level.emoji}</span> {level.label}
            </p>
          </div>
          <div className="text-center text-sm">
            <p className="text-gray-500 dark:text-gray-400 mb-1">vs PME française médiane</p>
            <p className="text-3xl font-extrabold tabular-nums text-gray-600 dark:text-gray-300">
              {BENCHMARK_PME}<span className="text-base text-gray-400">/100</span>
            </p>
            <p
              className={`text-xs font-bold mt-1 ${
                score >= BENCHMARK_PME
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {score >= BENCHMARK_PME
                ? `+${(score - BENCHMARK_PME).toFixed(0)} pts au-dessus`
                : `${(score - BENCHMARK_PME).toFixed(0)} pts en dessous`}
            </p>
          </div>
          <div className="text-center sm:text-right text-sm">
            <p className="text-gray-500 dark:text-gray-400 mb-1">Progression</p>
            <p className="text-2xl font-bold tabular-nums">
              {answeredCount}<span className="text-base text-gray-400">/{QUESTIONS.length}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              questions répondues
            </p>
          </div>
        </div>
      </section>

      {/* === Questionnaire 8 axes === */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300">
          Évaluation par axe (8 questions)
        </h2>
        {QUESTIONS.map((q, i) => (
          <article
            key={q.id}
            className="rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">
                Q{String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-xs uppercase tracking-widest font-bold text-accent-500">
                {q.axis}
              </span>
            </div>
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">
              {q.text}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-4">
              {q.why}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { value: "yes", label: "Oui", color: "emerald" },
                  { value: "partial", label: "Partiellement", color: "amber" },
                  { value: "no", label: "Non", color: "rose" },
                  { value: "na", label: "Non applicable", color: "gray" },
                ] as { value: Answer; label: string; color: string }[]
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-center gap-2 cursor-pointer rounded-xl border-2 p-2 transition text-sm ${
                    answers[q.id] === opt.value
                      ? `border-${opt.color}-500 bg-${opt.color}-50 dark:bg-${opt.color}-900/20 font-bold`
                      : "border-gray-200 dark:border-slate-700 hover:border-accent-500"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.value}
                    checked={answers[q.id] === opt.value}
                    onChange={() => setAnswer(q.id, opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </article>
        ))}
      </section>

      {/* === Plan d'action === */}
      {actions.length > 0 && (
        <section
          aria-labelledby="plan-title"
          className="rounded-2xl border-2 border-accent-300 dark:border-accent-700 bg-accent-50/40 dark:bg-accent-900/20 p-6"
        >
          <h2
            id="plan-title"
            className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-3"
          >
            Votre plan d&apos;action priorisé
          </h2>
          <ul className="space-y-3">
            {actions.map((a, idx) => (
              <li
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl p-3 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: a }}
              />
            ))}
          </ul>
        </section>
      )}

      {/* === Actions de gestion === */}
      <section className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJson}
            disabled={answeredCount === 0}
            className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Exporter (JSON)
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={answeredCount === 0}
            className="text-sm text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed px-3 py-2"
          >
            Réinitialiser
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Réponses sauvegardées localement à chaque clic.
        </p>
      </section>
    </div>
  );
}
