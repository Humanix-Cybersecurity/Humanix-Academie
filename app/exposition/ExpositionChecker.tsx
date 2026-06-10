// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";
//
// Checker d'exposition — tier gratuit. Tout est ÉPHÉMÈRE (state React, rien
// n'est persisté). Le check mot de passe tourne 100% dans le navigateur.

import { useState, useTransition } from "react";
import { checkPasswordPwned } from "@/lib/exposure/pwned-passwords";
import {
  computeExposureScore,
  verdictLabel,
  type ExposureInput,
} from "@/lib/exposure/exposure-score";

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
    </div>
  );
}
