"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// QuickSetupWizard - parcours en 4 ecrans pour activer un nouveau tenant en
// moins de 5 minutes.
//
// Ecrans :
//   1. Profil tenant : taille / secteur / niveau cyber actuel
//   2. Suggestions : moteur applique automatiquement les saisons
//      pertinentes ; affichage des modules actives + obligatoires.
//   3. Equipe : import CSV simple ou invitation manuelle (ou skip si on
//      veut juste explorer la plateforme avant d'inviter).
//   4. Rituel : jour de notification hebdomadaire + activation simulation
//      phishing oui/non.
//
// L'etat est local (useState) ; chaque ecran appelle une server action a
// la validation du "Suivant". L'admin peut revenir en arriere mais les
// actions deja appliquees (saisons activees, users invites) restent.
// =============================================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  setupApplyProfile,
  setupInviteUsers,
  setupConfigureRituel,
  setupComplete,
} from "@/app/admin/setup/actions";
import {
  SIZE_LABELS,
  SECTOR_LABELS,
  MATURITY_LABELS,
  type SetupProfile,
  type TenantSize,
  type TenantSector,
  type CyberMaturity,
} from "@/lib/setup-wizard";

type Step = 1 | 2 | 3 | 4 | 5;

export default function QuickSetupWizard() {
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();

  // Etape 1 : profil
  const [size, setSize] = useState<TenantSize | null>(null);
  const [sector, setSector] = useState<TenantSector | null>(null);
  const [maturity, setMaturity] = useState<CyberMaturity | null>(null);

  // Etape 2 : resultat des suggestions
  const [suggestion, setSuggestion] = useState<{
    activated: number;
    mandatory: number;
    rationale: string;
    activatedTitles: string[];
  } | null>(null);

  // Etape 3 : invitations bulk
  const [emailsRaw, setEmailsRaw] = useState("");
  const [invitedCount, setInvitedCount] = useState<number | null>(null);

  // Etape 4 : rituel
  const [weekday, setWeekday] = useState(1); // lundi
  const [enablePhishingDemo, setEnablePhishingDemo] = useState(false);

  const profileComplete = size && sector && maturity;

  const goNext = () => setStep((s) => Math.min(5, s + 1) as Step);
  const goBack = () => setStep((s) => Math.max(1, s - 1) as Step);

  // --- Ecran 1 -> 2 : applique le profil ---
  const submitProfile = () => {
    if (!profileComplete) return;
    const profile: SetupProfile = {
      size: size!,
      sector: sector!,
      maturity: maturity!,
    };
    startTransition(async () => {
      const r = await setupApplyProfile(profile);
      setSuggestion({
        activated: r.activated,
        mandatory: r.mandatory,
        rationale: r.rationale,
        activatedTitles: r.activatedTitles,
      });
      goNext();
    });
  };

  // --- Ecran 3 : envoi invitations ---
  const submitInvitations = (skip = false) => {
    if (skip) {
      setInvitedCount(0);
      goNext();
      return;
    }
    const emails = emailsRaw
      .split(/[\n,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        // Format support : "email", "email,nom" ou "email,nom,service"
        const [email, name, service] = line.split(",").map((p) => p.trim());
        return { email, name, service };
      });
    if (emails.length === 0) {
      submitInvitations(true);
      return;
    }
    startTransition(async () => {
      const r = await setupInviteUsers(emails);
      setInvitedCount(r.count);
      goNext();
    });
  };

  // --- Ecran 4 : rituel + finalisation ---
  const submitRituel = () => {
    startTransition(async () => {
      await setupConfigureRituel(weekday, enablePhishingDemo);
      await setupComplete();
      goNext();
    });
  };

  return (
    <div className="space-y-6">
      <Stepper current={step} total={4} />

      {step === 1 && (
        <Card title="Parlons de votre organisation" icon="🏢">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
            Trois questions rapides. On utilise vos reponses pour activer
            automatiquement les modules qui ont du sens pour vous.
          </p>

          <Field label="Taille de l'organisation">
            <div className="grid sm:grid-cols-2 gap-2">
              {(
                Object.keys(SIZE_LABELS) as TenantSize[]
              ).map((s) => (
                <Choice
                  key={s}
                  selected={size === s}
                  onClick={() => setSize(s)}
                  label={SIZE_LABELS[s]}
                />
              ))}
            </div>
          </Field>

          <Field label="Secteur d'activite">
            <div className="grid sm:grid-cols-2 gap-2">
              {(
                Object.keys(SECTOR_LABELS) as TenantSector[]
              ).map((s) => (
                <Choice
                  key={s}
                  selected={sector === s}
                  onClick={() => setSector(s)}
                  label={`${SECTOR_LABELS[s].emoji}  ${SECTOR_LABELS[s].label}`}
                />
              ))}
            </div>
          </Field>

          <Field label="Maturite cyber actuelle">
            <div className="space-y-2">
              {(
                Object.keys(MATURITY_LABELS) as CyberMaturity[]
              ).map((m) => (
                <Choice
                  key={m}
                  selected={maturity === m}
                  onClick={() => setMaturity(m)}
                  label={MATURITY_LABELS[m].label}
                  helper={MATURITY_LABELS[m].helper}
                />
              ))}
            </div>
          </Field>

          <div className="flex justify-end mt-6">
            <PrimaryButton
              onClick={submitProfile}
              disabled={!profileComplete || pending}
            >
              Suivant →
            </PrimaryButton>
          </div>
        </Card>
      )}

      {step === 2 && suggestion && (
        <Card title="Voici votre programme suggere" icon="🎯">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
            Sur la base de votre profil, nous avons active{" "}
            <strong className="text-primary-500">
              {suggestion.activated} modules
            </strong>{" "}
            dont{" "}
            <strong className="text-red-600">
              {suggestion.mandatory} obligatoire
              {suggestion.mandatory > 1 ? "s" : ""}
            </strong>{" "}
            (les fondations : phishing, mots de passe). Selection :{" "}
            {suggestion.rationale}.
          </p>

          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 p-4 max-h-64 overflow-y-auto">
            <ul className="space-y-1.5 text-sm">
              {suggestion.activatedTitles.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-accent-50/40 dark:bg-accent-900/10 border border-accent-200/40 p-3 mt-4 text-xs text-gray-600 dark:text-gray-300">
            💡 Vous pourrez ajuster cette selection a tout moment depuis{" "}
            <Link
              href="/admin/modules"
              className="text-accent-600 hover:underline font-medium"
            >
              /admin/modules
            </Link>{" "}
            (filtres, bulk actions, etc.).
          </div>

          <div className="flex justify-between mt-6">
            <GhostButton onClick={goBack} disabled={pending}>
              ← Retour
            </GhostButton>
            <PrimaryButton onClick={goNext} disabled={pending}>
              Suivant →
            </PrimaryButton>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Inviter votre equipe" icon="👥">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
            Saisissez un ou plusieurs emails (un par ligne, ou separe par
            virgule). Format optionnel :{" "}
            <code className="text-xs bg-gray-100 dark:bg-slate-800 px-1 rounded">
              email,nom,service
            </code>
            .
          </p>

          <textarea
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            placeholder={"alice@entreprise.fr\nbob@entreprise.fr,Bob Dupont,RH"}
            rows={6}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />

          <p className="text-xs text-gray-500 mt-2">
            Vous pouvez sauter cette etape - on vous laissera inviter plus
            tard depuis{" "}
            <Link
              href="/admin/utilisateurs"
              className="text-accent-600 hover:underline"
            >
              /admin/utilisateurs
            </Link>
            .
          </p>

          <div className="flex justify-between mt-6 gap-2">
            <GhostButton onClick={goBack} disabled={pending}>
              ← Retour
            </GhostButton>
            <div className="flex gap-2">
              <GhostButton
                onClick={() => submitInvitations(true)}
                disabled={pending}
              >
                Sauter
              </GhostButton>
              <PrimaryButton
                onClick={() => submitInvitations(false)}
                disabled={pending || emailsRaw.trim().length === 0}
              >
                {emailsRaw.trim().length === 0
                  ? "Saisir des emails"
                  : "Inviter →"}
              </PrimaryButton>
            </div>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card title="Votre rituel hebdomadaire" icon="📅">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
            Vos collaborateurs recevront une fois par semaine un rappel
            pour leur module. Choisissez le jour qui s'integre le mieux
            dans leur semaine.
          </p>

          {invitedCount !== null && invitedCount > 0 && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-4">
              ✓ {invitedCount} collaborateur{invitedCount > 1 ? "s" : ""}{" "}
              invite{invitedCount > 1 ? "s" : ""} a l'etape precedente.
            </p>
          )}

          <Field label="Jour de notification">
            <div className="grid grid-cols-5 gap-2">
              {[
                { v: 1, label: "Lun" },
                { v: 2, label: "Mar" },
                { v: 3, label: "Mer" },
                { v: 4, label: "Jeu" },
                { v: 5, label: "Ven" },
              ].map((d) => (
                <Choice
                  key={d.v}
                  selected={weekday === d.v}
                  onClick={() => setWeekday(d.v)}
                  label={d.label}
                />
              ))}
            </div>
          </Field>

          <Field label="Phishing simule">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-accent-500 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePhishingDemo}
                onChange={(e) => setEnablePhishingDemo(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
              />
              <div>
                <p className="text-sm font-medium">
                  Lancer une simulation de phishing dans 7 jours
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email factice envoye a votre equipe pour mesurer le taux de
                  clic, sans sanction. Ideal pour avoir une baseline.
                </p>
              </div>
            </label>
          </Field>

          <div className="flex justify-between mt-6">
            <GhostButton onClick={goBack} disabled={pending}>
              ← Retour
            </GhostButton>
            <PrimaryButton onClick={submitRituel} disabled={pending}>
              Terminer le setup →
            </PrimaryButton>
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card title="Tout est pret !" icon="🎉">
          <p className="text-base text-gray-700 dark:text-gray-200 mb-5">
            Bravo, votre programme est lance.
            {invitedCount && invitedCount > 0
              ? ` ${invitedCount} collaborateur${invitedCount > 1 ? "s ont" : " a"} ete invite${invitedCount > 1 ? "s" : ""}, `
              : " "}
            les fondamentaux sont actives, le rituel est cale.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <Link
              href="/admin"
              className="rounded-xl border-2 border-accent-500 bg-accent-50/40 dark:bg-accent-900/15 p-4 hover:bg-accent-50 transition"
            >
              <p className="font-bold text-primary-500 mb-1">📊 Tableau de bord</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Etat cyber de l'organisation, KPIs, suivi equipe.
              </p>
            </Link>
            <Link
              href="/admin/modules"
              className="rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-accent-500 transition"
            >
              <p className="font-bold text-primary-500 mb-1">📚 Modules</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Ajuster les saisons activees, ajouter des obligatoires.
              </p>
            </Link>
            <Link
              href="/admin/utilisateurs"
              className="rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-accent-500 transition"
            >
              <p className="font-bold text-primary-500 mb-1">👥 Utilisateurs</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Inviter d'autres collaborateurs, gerer les groupes.
              </p>
            </Link>
            <Link
              href="/profil/securite"
              className="rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-accent-500 transition"
            >
              <p className="font-bold text-primary-500 mb-1">🔒 Activer la 2FA</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Securiser votre compte admin (recommande).
              </p>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// Sous-composants UI
// =============================================================================

function Stepper({ current, total }: { current: Step; total: number }) {
  return (
    <ol className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const state =
          current > n ? "done" : current === n ? "current" : "todo";
        return (
          <li key={n} className="flex-1 flex items-center gap-2">
            <span
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                state === "done"
                  ? "bg-emerald-500 text-white"
                  : state === "current"
                    ? "bg-accent-500 text-white ring-4 ring-accent-100 dark:ring-accent-900/30"
                    : "bg-gray-200 dark:bg-slate-700 text-gray-500"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            {n < total && (
              <span
                className={`flex-1 h-0.5 ${
                  current > n
                    ? "bg-emerald-500"
                    : "bg-gray-200 dark:bg-slate-700"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <header className="flex items-center gap-3 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
        <span className="text-3xl" aria-hidden="true">
          {icon}
        </span>
        <h2 className="font-display font-extrabold text-primary-500 dark:text-accent-300 text-xl">
          {title}
        </h2>
      </header>
      {children}
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function Choice({
  selected,
  onClick,
  label,
  helper,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  helper?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border-2 transition ${
        selected
          ? "border-accent-500 bg-accent-50/40 dark:bg-accent-900/15"
          : "border-gray-200 dark:border-slate-700 hover:border-accent-300 dark:hover:border-accent-600 bg-white dark:bg-slate-900"
      }`}
    >
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label}
      </p>
      {helper && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {helper}
        </p>
      )}
    </button>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function GhostButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
