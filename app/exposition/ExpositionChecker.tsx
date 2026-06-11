// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";
//
// Checker d'exposition — tier gratuit. Tout est ÉPHÉMÈRE (state React, rien
// n'est persisté). Le check mot de passe tourne 100% dans le navigateur.

import { useState, useTransition } from "react";
import Link from "next/link";
import { checkPasswordPwned } from "@/lib/exposure/pwned-passwords";
import {
  computeExposureScore,
  verdictLabel,
  type ExposureInput,
} from "@/lib/exposure/exposure-score";
import { deriveRemediationPlan } from "@/lib/exposure/remediation";
import { saveRemediationPlan } from "./actions";

// Parcours auto-OSINT guidé en 4 phases : CHERCHER -> LIMITER -> SUPPRIMER ->
// PROTÉGER. L'utilisateur EXÉCUTE lui-même chaque action ; Humanix ne lance
// AUCUNE recherche et ne collecte RIEN (contrainte #4 zéro-PII). Les liens
// pointent vers les vrais formulaires officiels (déréférencement, CNIL…).
type OsintStep = { text: string; link?: { label: string; href: string } };
type OsintPhase = {
  id: string;
  title: string;
  emoji: string;
  intro?: string;
  steps: OsintStep[];
};

const OSINT_PHASES: OsintPhase[] = [
  {
    id: "chercher",
    title: "1. Te chercher (comme le ferait un inconnu)",
    emoji: "🔎",
    intro: "En navigation privée, pour voir ce que tout le monde voit.",
    steps: [
      { text: "Ton nom complet entre guillemets + variantes (nom de jeune fille, surnom)." },
      { text: "Ton email et ton pseudo habituel — ils relient tes comptes entre eux." },
      { text: "Ton numéro de téléphone entre guillemets." },
      {
        text: "Recherche d'images : les photos où tu es identifié (toi et tes proches).",
        link: { label: "Google Images", href: "https://images.google.com" },
      },
      { text: "Annuaires et data brokers : ton nom sur Pappers, pages blanches, 118712." },
    ],
  },
  {
    id: "limiter",
    title: "2. Limiter la casse (verrouiller)",
    emoji: "🔒",
    steps: [
      { text: "Passe tes profils réseaux sociaux en privé (vérifie « qui voit quoi »)." },
      { text: "Retire date de naissance, adresse et téléphone des profils publics." },
      { text: "Ferme ou supprime les vieux comptes oubliés (forums, anciens réseaux)." },
      { text: "Désactive la géolocalisation (EXIF) de tes photos avant publication." },
    ],
  },
  {
    id: "supprimer",
    title: "3. Demander la suppression / le déréférencement",
    emoji: "🧹",
    intro: "C'est ton droit : effacement (RGPD art. 17) et déréférencement.",
    steps: [
      { text: "Contenu sur un site : écris au responsable (mentions légales) en invoquant le droit à l'effacement RGPD." },
      {
        text: "Faire disparaître un résultat de recherche Google sur ton nom (déréférencement).",
        link: { label: "Formulaire Google", href: "https://reportcontent.google.com/forms/rtbf" },
      },
      {
        text: "Même démarche côté Bing.",
        link: { label: "Formulaire Bing", href: "https://www.bing.com/webmaster/tools/eu-privacy-request" },
      },
      {
        text: "Refus ou pas de réponse sous 1 mois ? Dépose une plainte en ligne à la CNIL.",
        link: { label: "Plainte CNIL", href: "https://www.cnil.fr/fr/plaintes" },
      },
    ],
  },
  {
    id: "proteger",
    title: "4. Protéger ton image dans la durée",
    emoji: "🛡️",
    steps: [
      {
        text: "Crée une alerte sur ton nom pour être prévenu des nouvelles publications.",
        link: { label: "Google Alerts", href: "https://www.google.com/alerts" },
      },
      { text: "Refais cet audit tous les 6 mois : les sources réapparaissent." },
      { text: "Avant de publier : « est-ce que je voudrais que mon employeur voie ça dans 10 ans ? »." },
      {
        text: "Pour aller plus loin : la saison « OSINT : ce que les autres savent de toi ».",
        link: { label: "Voir la saison", href: "/apprendre/osint-particuliers" },
      },
    ],
  },
];

const OSINT_TOTAL_STEPS = OSINT_PHASES.reduce((n, p) => n + p.steps.length, 0);

type PwdState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "done"; pwned: boolean; count: number }
  | { kind: "error" };

type EmailBreach = {
  title: string;
  organization: string | null;
  incidentDate: string;
  dataTypes: string | null;
  severity: string;
  sourceUrl: string;
};
type EmailState =
  | { kind: "idle" }
  | { kind: "otp_sent" }
  | { kind: "verifying" }
  | {
      kind: "done";
      isPersonalDomain: boolean;
      breachCount: number;
      sensitiveDataPresent: boolean;
      breaches: EmailBreach[];
    }
  | { kind: "error"; msg: string };

// Beacon métrique non-identifiant (best-effort, fire-and-forget).
function beacon(checkType: "password" | "phone", bucket: "exposed" | "clean") {
  void fetch("/api/exposition/metric", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checkType, bucket }),
  }).catch(() => {});
}

export default function ExpositionChecker() {
  // --- Password ---
  const [password, setPassword] = useState("");
  const [pwd, setPwd] = useState<PwdState>({ kind: "idle" });

  // --- Email ---
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailState, setEmailState] = useState<EmailState>({ kind: "idle" });
  const [emailPending, startEmail] = useTransition();

  // --- Plan de remédiation (toggles locaux) + sauvegarde opt-in ---
  const [planDone, setPlanDone] = useState<Set<string>>(new Set());
  const [osintDone, setOsintDone] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "need_account" | "error"
  >("idle");
  const [savePending, startSave] = useTransition();

  async function runPasswordCheck() {
    if (!password) return;
    setPwd({ kind: "checking" });
    const res = await checkPasswordPwned(password);
    if (!res.ok) {
      setPwd({ kind: "error" });
      return;
    }
    setPwd({ kind: "done", pwned: res.pwned, count: res.count });
    beacon("password", res.pwned ? "exposed" : "clean");
  }

  function requestOtp() {
    startEmail(async () => {
      const r = await fetch("/api/exposition/email/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (r.ok) setEmailState({ kind: "otp_sent" });
      else setEmailState({ kind: "error", msg: "Email invalide ou envoi impossible." });
    });
  }

  function verifyOtp() {
    setEmailState({ kind: "verifying" });
    startEmail(async () => {
      const r = await fetch("/api/exposition/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        setEmailState({ kind: "error", msg: "Code incorrect ou expiré. Réessaie." });
        return;
      }
      const result = data.result;
      setEmailState({
        kind: "done",
        isPersonalDomain: !!result?.isPersonalDomain,
        breachCount: result?.breachCount ?? 0,
        sensitiveDataPresent: !!result?.sensitiveDataPresent,
        breaches: result?.breaches ?? [],
      });
    });
  }

  // --- Score agrégé (calculé localement à partir des résultats) ---
  const scoreInput: ExposureInput | null =
    pwd.kind === "done" || emailState.kind === "done"
      ? {
          passwordPwned: pwd.kind === "done" ? pwd.pwned : false,
          passwordCount: pwd.kind === "done" ? pwd.count : 0,
          domainBreaches:
            emailState.kind === "done" ? emailState.breachCount : 0,
          sensitiveDataInBreaches:
            emailState.kind === "done" ? emailState.sensitiveDataPresent : false,
          phoneFlagged: false,
        }
      : null;
  const score = scoreInput ? computeExposureScore(scoreInput) : null;
  const plan = scoreInput ? deriveRemediationPlan(scoreInput) : [];

  function togglePlan(key: string) {
    setPlanDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleOsint(key: string) {
    setOsintDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function savePlan() {
    if (!score) return;
    setSaveState("saving");
    startSave(async () => {
      const res = await saveRemediationPlan(
        plan.map((p) => ({
          key: p.key,
          label: p.label,
          done: planDone.has(p.key),
          sourceUrl: p.sourceUrl,
        })),
        score.score,
      );
      if (res.ok) setSaveState("saved");
      else if (res.error === "not_authenticated") setSaveState("need_account");
      else setSaveState("error");
    });
  }

  return (
    <div className="space-y-6">
      {/* ===== CHECK MOT DE PASSE ===== */}
      <section
        aria-labelledby="pwd-title"
        className="card border border-gray-200 dark:border-slate-700"
      >
        <h2 id="pwd-title" className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
          🔑 Mon mot de passe a-t-il fuité ?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Vérification exacte. Ton mot de passe <strong>ne quitte jamais</strong>
          {" "}ce navigateur (k-anonymity).
        </p>
        <label htmlFor="exp-pwd" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
          Mot de passe à tester
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="password"
            id="exp-pwd"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            placeholder="Saisis un mot de passe"
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={runPasswordCheck}
            disabled={!password || pwd.kind === "checking"}
            className="btn-primary disabled:opacity-50"
          >
            {pwd.kind === "checking" ? "Vérification…" : "Vérifier"}
          </button>
        </div>

        <div aria-live="polite" className="mt-4">
          {pwd.kind === "done" && pwd.pwned && (
            <div className="rounded-xl border-2 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 p-4">
              <p className="font-bold text-rose-900 dark:text-rose-200">
                ⚠️ Compromis — vu {pwd.count.toLocaleString("fr-FR")} fois dans des fuites
              </p>
              <p className="text-sm text-rose-800 dark:text-rose-300 mt-1">
                Change-le partout où tu l'utilises, avec un mot de passe
                <strong> unique</strong> à chaque endroit. C'est le facteur de
                risque le plus grave (credential stuffing).
              </p>
            </div>
          )}
          {pwd.kind === "done" && !pwd.pwned && (
            <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                ✅ Jamais vu dans les fuites connues
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                Bon point. Garde-le unique à ce service et active la double
                authentification quand c'est possible.
              </p>
            </div>
          )}
          {pwd.kind === "error" && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Service de vérification momentanément indisponible. Réessaie plus tard.
            </p>
          )}
        </div>
      </section>

      {/* ===== CHECK EMAIL (OTP gate) ===== */}
      <section
        aria-labelledby="email-title"
        className="card border border-gray-200 dark:border-slate-700"
      >
        <h2 id="email-title" className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
          📧 Mon organisation est-elle dans une fuite ?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          On vérifie que c'est bien ton email (anti-doxxing), puis on cherche si
          l'organisation derrière ton domaine apparaît dans l'observatoire des
          fuites souverain.
        </p>

        {(emailState.kind === "idle" || emailState.kind === "error") && (
          <>
            <label htmlFor="exp-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Ton adresse email
            </label>
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                id="exp-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@entreprise.fr"
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={requestOtp}
                disabled={!email || emailPending}
                className="btn-primary disabled:opacity-50"
              >
                {emailPending ? "Envoi…" : "Recevoir un code"}
              </button>
            </div>
            {emailState.kind === "error" && (
              <p className="text-sm text-rose-700 dark:text-rose-400 mt-2" role="alert">
                {emailState.msg}
              </p>
            )}
          </>
        )}

        {emailState.kind === "otp_sent" && (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
              Un code à 6 chiffres a été envoyé à <strong>{email}</strong>.
              Saisis-le (valable 10 minutes).
            </p>
            <label htmlFor="exp-otp" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Code de vérification
            </label>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                inputMode="numeric"
                id="exp-otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-40 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={verifyOtp}
                disabled={otp.length !== 6 || emailPending}
                className="btn-primary disabled:opacity-50"
              >
                Vérifier
              </button>
            </div>
          </>
        )}

        {emailState.kind === "verifying" && (
          <p className="text-sm text-gray-600 dark:text-gray-300">Vérification…</p>
        )}

        <div aria-live="polite">
          {emailState.kind === "done" && emailState.isPersonalDomain && (
            <div className="rounded-xl border-2 border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 p-4">
              <p className="font-bold text-cyan-900 dark:text-cyan-200">
                Adresse personnelle détectée
              </p>
              <p className="text-sm text-cyan-800 dark:text-cyan-300 mt-1">
                Notre observatoire référence les fuites d'<strong>organisations</strong>,
                pas les boîtes mail personnelles. Pour un email perso, le signal
                fiable, c'est le <strong>check de tes mots de passe</strong> ci-dessus.
              </p>
            </div>
          )}
          {emailState.kind === "done" && !emailState.isPersonalDomain && emailState.breachCount > 0 && (
            <div className="rounded-xl border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30 p-4 mt-1">
              <p className="font-bold text-orange-900 dark:text-orange-200">
                ⚠️ {emailState.breachCount} fuite(s) publique(s) liée(s) à ton domaine
              </p>
              <ul className="text-sm text-orange-900 dark:text-orange-100 mt-2 space-y-1 list-disc pl-5">
                {emailState.breaches.slice(0, 5).map((b, i) => (
                  <li key={i}>
                    <a href={b.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      {b.title}
                    </a>{" "}
                    <span className="text-xs opacity-80">
                      ({new Date(b.incidentDate).toLocaleDateString("fr-FR")})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {emailState.kind === "done" && !emailState.isPersonalDomain && emailState.breachCount === 0 && (
            <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4 mt-1">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                ✅ Aucune fuite connue liée à ton domaine
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                Dans notre observatoire souverain. Reste vigilant : l'absence de
                fuite connue n'est pas une garantie absolue.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ===== SCORE AGRÉGÉ ===== */}
      {score && (
        <section
          aria-labelledby="score-title"
          className="card border-2 border-primary-200 dark:border-accent-900/40 bg-gradient-to-br from-primary-50 to-white dark:from-slate-900 dark:to-slate-950"
        >
          <h2 id="score-title" className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
            Ton score d'exposition
          </h2>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-4xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
              {score.score}
              <span className="text-base font-medium text-gray-400">/100</span>
            </span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {verdictLabel(score.verdict).label}
            </span>
          </div>
          {score.factors.length > 0 ? (
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc pl-5">
              {score.factors.map((f, i) => (
                <li key={i}>
                  {f.label} <span className="text-xs text-gray-500">(+{f.points})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Aucun facteur d'exposition détecté pour l'instant. Continue tes vérifications.
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
            Score calculé localement, non conservé. Barème {score.version}.
          </p>
        </section>
      )}

      {/* ===== PLAN DE REMÉDIATION ===== */}
      {plan.length > 0 && (
        <section
          aria-labelledby="plan-title"
          className="card border border-gray-200 dark:border-slate-700"
        >
          <h2 id="plan-title" className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
            Ton plan de remédiation
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Priorisé selon ton exposition. Chaque action renvoie à une source
            officielle et à un micro-module pour aller plus loin.
          </p>
          <ol className="space-y-3">
            {plan.map((item) => (
              <li
                key={item.key}
                className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3"
              >
                <input
                  type="checkbox"
                  id={`plan-${item.key}`}
                  checked={planDone.has(item.key)}
                  onChange={() => togglePlan(item.key)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <div className="min-w-0">
                  <label
                    htmlFor={`plan-${item.key}`}
                    className="font-semibold text-gray-800 dark:text-gray-100 cursor-pointer"
                  >
                    <span
                      className={`inline-block mr-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        item.priority === 1
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                          : item.priority === 2
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300"
                      }`}
                    >
                      {item.priority === 1 ? "Urgent" : item.priority === 2 ? "Important" : "Bonne pratique"}
                    </span>
                    {item.label}
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.why}</p>
                  <p className="text-xs mt-1 flex gap-3 flex-wrap">
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent-600 dark:text-accent-300 underline">
                      Guide {item.sourceLabel}
                    </a>
                    <Link href={`/apprendre/${item.episodeSlug}`} className="text-primary-600 dark:text-accent-300 underline">
                      Micro-module →
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Sauvegarde opt-in */}
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={savePlan}
              disabled={savePending || saveState === "saved"}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {saveState === "saved" ? "✅ Plan sauvegardé" : savePending ? "Sauvegarde…" : "💾 Sauvegarder mon plan"}
            </button>
            {saveState === "need_account" && (
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">
                Pour sauvegarder ton plan et débloquer des badges,{" "}
                <Link href="/inscription" className="text-accent-600 dark:text-accent-300 underline font-semibold">
                  crée un compte gratuit
                </Link>{" "}
                (tier Communauté). Sinon, ton plan reste affiché ici sans être conservé.
              </p>
            )}
            {saveState === "error" && (
              <p className="text-sm text-rose-700 dark:text-rose-400 mt-2" role="alert">
                Sauvegarde impossible pour le moment. Réessaie plus tard.
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
              La sauvegarde ne conserve que les actions du plan (pas tes
              mots de passe, pas le détail des fuites).
            </p>
          </div>
        </section>
      )}

      {/* ===== AUTO-OSINT GUIDÉ ===== */}
      <section
        aria-labelledby="osint-title"
        className="card border border-gray-200 dark:border-slate-700"
      >
        <h2 id="osint-title" className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
          🔎 Auto-OSINT guidé
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Chercher, limiter, faire supprimer, protéger. <strong>Tu exécutes, on
          guide</strong> : Humanix ne lance aucune recherche et ne collecte
          rien. Coche au fur et à mesure (suivi local, jamais envoyé).
        </p>

        <div className="space-y-5">
          {OSINT_PHASES.map((phase) => (
            <div key={phase.id}>
              <p className="font-display font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span aria-hidden="true">{phase.emoji}</span>
                {phase.title}
              </p>
              {phase.intro && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2">
                  {phase.intro}
                </p>
              )}
              <ul className="space-y-2 mt-2">
                {phase.steps.map((step, i) => {
                  const key = `${phase.id}:${i}`;
                  const isExternal = step.link?.href.startsWith("http");
                  return (
                    <li key={key} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`osint-${key}`}
                        checked={osintDone.has(key)}
                        onChange={() => toggleOsint(key)}
                        className="mt-1 h-4 w-4 shrink-0"
                      />
                      <label
                        htmlFor={`osint-${key}`}
                        className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
                      >
                        {step.text}
                        {step.link &&
                          (isExternal ? (
                            <a
                              href={step.link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 underline text-primary-600 dark:text-accent-300 whitespace-nowrap"
                            >
                              {step.link.label} ↗
                            </a>
                          ) : (
                            <Link
                              href={step.link.href}
                              className="ml-1 underline text-primary-600 dark:text-accent-300 whitespace-nowrap"
                            >
                              {step.link.label} →
                            </Link>
                          ))}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {osintDone.size}/{OSINT_TOTAL_STEPS} actions effectuées.{" "}
          <Link
            href="/apprendre/exposition-numerique/07-reduire-son-empreinte"
            className="underline text-primary-600 dark:text-accent-300"
          >
            Plan complet pour réduire mon empreinte →
          </Link>
        </p>
      </section>
    </div>
  );
}
