"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Wizard client de l'audit flash :
//  1. Identite (entreprise, secteur, taille, email)
//  2. 15 questions OUI/NON/Je ne sais pas avec barre de progression
//  3. Soumission via server action -> redirection vers /audit-flash/result/[id]
//
// Accessibilite :
//  - role="radiogroup" pour chaque question
//  - barre de progression aria-valuenow
//  - aria-live polite pour les erreurs
//  - bouton retour disponible

import { useState, useTransition } from "react";
import {
  AUDIT_QUESTIONS,
  AuditQuestion,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from "@/lib/audit-flash/questions";
import {
  SIZE_LABELS,
  SECTOR_LABELS,
  CompanySize,
  Sector,
} from "@/lib/audit-flash/scoring";
import { submitAuditFlash } from "./actions";
import { useRouter } from "next/navigation";

type Identity = {
  email: string;
  contactName: string;
  companyName: string;
  size: CompanySize | "";
  sector: Sector | "";
  consentMarketing: boolean;
};

const INITIAL_IDENTITY: Identity = {
  email: "",
  contactName: "",
  companyName: "",
  size: "",
  sector: "",
  consentMarketing: false,
};

export default function AuditWizard() {
  const router = useRouter();
  const [step, setStep] = useState<number>(0); // 0 = identite, 1..15 = questions
  const [identity, setIdentity] = useState<Identity>(INITIAL_IDENTITY);
  const [answers, setAnswers] = useState<
    Record<string, "yes" | "no" | "unsure">
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalSteps = 1 + AUDIT_QUESTIONS.length; // identite + 15 questions
  const progressPct = Math.round(((step + 1) / totalSteps) * 100);

  const isIdentityValid =
    identity.email.includes("@") &&
    identity.companyName.trim().length >= 2 &&
    identity.size !== "" &&
    identity.sector !== "";

  const currentQuestion: AuditQuestion | null =
    step >= 1 && step <= AUDIT_QUESTIONS.length
      ? AUDIT_QUESTIONS[step - 1]
      : null;

  const allAnswered = AUDIT_QUESTIONS.every((q) => answers[q.id] !== undefined);

  const handleAnswer = (qId: string, value: "yes" | "no" | "unsure") => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    setError(null);
    // Avance auto sauf sur la derniere question
    if (step < totalSteps - 1) {
      setTimeout(() => setStep((s) => s + 1), 200);
    }
  };

  const handleSubmit = () => {
    if (!isIdentityValid) {
      setError("Merci de remplir vos informations entreprise.");
      setStep(0);
      return;
    }
    if (!allAnswered) {
      const firstMissingIdx = AUDIT_QUESTIONS.findIndex(
        (q) => answers[q.id] === undefined,
      );
      setError("Une réponse est manquante.");
      setStep(firstMissingIdx + 1);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitAuditFlash({
        email: identity.email,
        contactName: identity.contactName || null,
        companyName: identity.companyName,
        size: identity.size,
        sector: identity.sector,
        consentMarketing: identity.consentMarketing,
        answers,
      });
      if (!res.ok || !res.submissionId) {
        setError(res.error ?? "Échec de la soumission.");
        return;
      }
      router.push(`/audit-flash/result/${res.submissionId}`);
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Barre de progression */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>
            Étape {step + 1} sur {totalSteps}
          </span>
          <span>{progressPct} %</span>
        </div>
        <div
          className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression de l'audit"
        >
          <div
            className="h-full bg-accent-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          ⚠ {error}
        </div>
      )}

      {/* ==================== STEP 0 : IDENTITE ==================== */}
      {step === 0 && (
        <section
          aria-labelledby="identity-title"
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 sm:p-8"
        >
          <h2
            id="identity-title"
            className="text-2xl font-bold text-primary-500 mb-2"
          >
            Parlons d'abord de votre entreprise
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Ces informations nous permettent d'adapter le rapport et nos
            recommandations à votre contexte.
          </p>

          <div className="space-y-4">
            <Field label="Nom de l'entreprise *" htmlFor="companyName">
              <input
                id="companyName"
                type="text"
                value={identity.companyName}
                onChange={(e) =>
                  setIdentity({ ...identity, companyName: e.target.value })
                }
                className="input"
                placeholder="ACME SAS"
                required
                maxLength={200}
              />
            </Field>

            <Field label="Email professionnel *" htmlFor="email">
              <input
                id="email"
                type="email"
                value={identity.email}
                onChange={(e) =>
                  setIdentity({ ...identity, email: e.target.value })
                }
                className="input"
                placeholder="contact@entreprise.fr"
                required
                maxLength={200}
              />
            </Field>

            <Field label="Votre nom (optionnel)" htmlFor="contactName">
              <input
                id="contactName"
                type="text"
                value={identity.contactName}
                onChange={(e) =>
                  setIdentity({ ...identity, contactName: e.target.value })
                }
                className="input"
                placeholder="Jean Dupont"
                maxLength={120}
              />
            </Field>

            <Field label="Effectif *" htmlFor="size">
              <select
                id="size"
                value={identity.size}
                onChange={(e) =>
                  setIdentity({
                    ...identity,
                    size: e.target.value as CompanySize,
                  })
                }
                className="input"
                required
              >
                <option value="">Sélectionner…</option>
                {(Object.keys(SIZE_LABELS) as CompanySize[]).map((k) => (
                  <option key={k} value={k}>
                    {SIZE_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Secteur d'activité *" htmlFor="sector">
              <select
                id="sector"
                value={identity.sector}
                onChange={(e) =>
                  setIdentity({ ...identity, sector: e.target.value as Sector })
                }
                className="input"
                required
              >
                <option value="">Sélectionner…</option>
                {(Object.keys(SECTOR_LABELS) as Sector[]).map((k) => (
                  <option key={k} value={k}>
                    {SECTOR_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>

            <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 mt-3">
              <input
                type="checkbox"
                checked={identity.consentMarketing}
                onChange={(e) =>
                  setIdentity({
                    ...identity,
                    consentMarketing: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span>
                J'accepte de recevoir occasionnellement des conseils cyber et
                des actualités Humanix (1-2 emails / mois max, désabonnement
                libre).
              </span>
            </label>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🇫🇷 Données hébergées en France · RGPD-compliant
            </p>
            <button
              type="button"
              onClick={() => {
                if (!isIdentityValid) {
                  setError("Merci de remplir tous les champs marqués *.");
                  return;
                }
                setError(null);
                setStep(1);
              }}
              className="btn-primary"
              disabled={!isIdentityValid}
            >
              Démarrer l'audit →
            </button>
          </div>
        </section>
      )}

      {/* ==================== STEPS 1-15 : QUESTIONS ==================== */}
      {currentQuestion && (
        <section
          aria-labelledby={`q-${currentQuestion.id}-title`}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 sm:p-8"
        >
          <p className="text-xs uppercase tracking-wider text-accent-500 font-bold mb-2">
            {CATEGORY_EMOJI[currentQuestion.category]}{" "}
            {CATEGORY_LABELS[currentQuestion.category]}
          </p>
          <h2
            id={`q-${currentQuestion.id}-title`}
            className="text-xl sm:text-2xl font-bold text-primary-500 dark:text-accent-300 mb-3"
          >
            {currentQuestion.text}
          </h2>
          {currentQuestion.hint && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 italic">
              💡 {currentQuestion.hint}
            </p>
          )}

          <div
            role="radiogroup"
            aria-labelledby={`q-${currentQuestion.id}-title`}
            className="space-y-3"
          >
            {(["yes", "no", "unsure"] as const).map((value) => {
              const selected = answers[currentQuestion.id] === value;
              const labels = {
                yes: { icon: "✅", text: "Oui" },
                no: { icon: "❌", text: "Non" },
                unsure: { icon: "🤷", text: "Je ne sais pas" },
              };
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleAnswer(currentQuestion.id, value)}
                  className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                    selected
                      ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                      : "border-gray-200 dark:border-slate-700 hover:border-accent-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {labels[value].icon}
                  </span>
                  <span className="font-medium">{labels[value].text}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="text-sm text-gray-500 hover:text-primary-500"
            >
              ← Précédent
            </button>
            {step === totalSteps - 1 && (
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary"
                disabled={pending || !allAnswered}
              >
                {pending ? "Génération…" : "Voir mon résultat 🎯"}
              </button>
            )}
            {step < totalSteps - 1 && answers[currentQuestion.id] && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="text-sm text-accent-500 hover:text-accent-600 font-medium"
              >
                Suivant →
              </button>
            )}
          </div>
        </section>
      )}

      {/* Mention rassurante en bas */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
        ⏱ Temps estimé : 5 minutes · 🆓 100 % gratuit · 📄 Rapport PDF immédiat
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
