// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Formulaire client pour la config SMTP. Gere :
//   - state local (host, port, secure, username, password, fromEmail, ...)
//   - submit -> PUT /api/admin/smtp/config
//   - test connexion -> POST /api/admin/smtp/test
//   - delete config -> DELETE /api/admin/smtp/config

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ConfigShape = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string | null;
  isVerified: boolean | null;
  lastVerifiedAt: Date | null;
  lastError: string | null;
  notes: string | null;
  updatedAt: Date;
} | null;

type Feedback = { kind: "success" | "error"; message: string } | null;

export default function SmtpConfigForm({ initial }: { initial: ConfigShape }) {
  const router = useRouter();
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(initial?.port ?? 587);
  const [secure, setSecure] = useState(initial?.secure ?? false);
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState(initial?.fromEmail ?? "");
  const [fromName, setFromName] = useState(initial?.fromName ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const isUpdate = !!initial;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setFeedback(null);
    try {
      const body = {
        host,
        port,
        secure,
        username,
        password: password || undefined, // omit si vide en update
        fromEmail,
        fromName: fromName || null,
        notes: notes || null,
      };
      const res = await fetch("/api/admin/smtp/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          kind: "error",
          message:
            data.error === "password_required_on_create"
              ? "Le mot de passe est requis lors de la première configuration."
              : data.error === "invalid_payload"
                ? "Données invalides : vérifie le format de l'email et du port."
                : `Erreur : ${data.error ?? res.status}`,
        });
        return;
      }
      setFeedback({
        kind: "success",
        message:
          "✓ Configuration enregistrée. Pense à tester la connexion.",
      });
      setPassword(""); // vide le champ après save (sécurité visuelle)
      router.refresh();
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Erreur réseau, réessaye.",
      });
    } finally {
      setPending(false);
    }
  };

  const onTest = async () => {
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/smtp/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setFeedback({
          kind: "success",
          message: `✓ Connexion SMTP réussie en ${data.latencyMs} ms.`,
        });
      } else {
        const msgByReason: Record<string, string> = {
          smtp_not_configured: "Aucune configuration SMTP enregistrée.",
          smtp_decrypt_failed:
            "Échec du déchiffrement du mot de passe. Re-saisis-le et sauve.",
          smtp_auth_failed:
            "Authentification refusée. Vérifie ton username/password.",
          smtp_connect_failed:
            "Impossible de joindre le serveur. Vérifie host/port + firewall.",
          smtp_send_failed: "Erreur SMTP générique.",
        };
        setFeedback({
          kind: "error",
          message:
            (msgByReason[data.reason] ?? "Échec du test.") +
            (data.details ? ` Détail : ${data.details}` : ""),
        });
      }
      router.refresh();
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Erreur réseau, réessaye.",
      });
    } finally {
      setPending(false);
    }
  };

  const onDelete = async () => {
    if (
      !confirm(
        "Supprimer la configuration SMTP ? Les phishing simulés ne pourront plus être envoyés tant qu'aucune nouvelle config n'est posée.",
      )
    )
      return;
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/smtp/config", { method: "DELETE" });
      if (res.ok) {
        setFeedback({
          kind: "success",
          message: "✓ Configuration supprimée.",
        });
        // Reset form
        setHost("");
        setPort(587);
        setSecure(false);
        setUsername("");
        setPassword("");
        setFromEmail("");
        setFromName("");
        setNotes("");
        router.refresh();
      } else {
        setFeedback({ kind: "error", message: "Erreur lors de la suppression." });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 p-5 sm:p-6 space-y-5"
      noValidate
    >
      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`rounded-xl p-3 text-sm ${
            feedback.kind === "error"
              ? "bg-amber-50 border border-amber-300 text-amber-900"
              : "bg-emerald-50 border border-emerald-300 text-emerald-900"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Host + Port */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="smtp-host"
            className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1"
          >
            Serveur SMTP <span className="text-warn">*</span>
          </label>
          <input
            id="smtp-host"
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
            placeholder="smtp.example.fr"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="smtp-port"
            className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1"
          >
            Port <span className="text-warn">*</span>
          </label>
          <input
            id="smtp-port"
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value, 10) || 587)}
            required
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:outline-none tabular-nums"
          />
        </div>
      </div>

      {/* Secure (TLS implicite) */}
      <label className="flex items-start gap-3 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
        <input
          type="checkbox"
          checked={secure}
          onChange={(e) => setSecure(e.target.checked)}
          className="mt-1 w-4 h-4"
        />
        <span>
          <strong>SSL/TLS implicite (port 465)</strong>
          <span className="block text-xs text-gray-500 mt-0.5">
            Coche cette case si tu utilises le port 465. Pour le port 587
            standard (STARTTLS), laisse décoché.
          </span>
        </span>
      </label>

      {/* Username + Password */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="smtp-username"
            className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1"
          >
            Username <span className="text-warn">*</span>
          </label>
          <input
            id="smtp-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="off"
            placeholder="phishing@example.fr"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="smtp-password"
            className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1"
          >
            Password{" "}
            {!isUpdate && <span className="text-warn">*</span>}
            {isUpdate && (
              <span className="text-xs font-normal text-gray-500 ml-1">
                (laisse vide pour conserver l&apos;actuel)
              </span>
            )}
          </label>
          <input
            id="smtp-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isUpdate}
            autoComplete="new-password"
            placeholder={isUpdate ? "•••••••••" : ""}
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* From email + From name */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="smtp-from-email"
            className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1"
          >
            From email <span className="text-warn">*</span>
          </label>
          <input
            id="smtp-from-email"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            required
            placeholder="noreply@example.fr"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Doit être autorisé par le SPF/DKIM/DMARC du domaine.
          </p>
        </div>
        <div>
          <label
            htmlFor="smtp-from-name"
            className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1"
          >
            From name <span className="text-xs font-normal text-gray-500">(optionnel)</span>
          </label>
          <input
            id="smtp-from-name"
            type="text"
            value={fromName ?? ""}
            onChange={(e) => setFromName(e.target.value)}
            maxLength={100}
            placeholder="Sécurité Acme"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="smtp-notes"
          className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1"
        >
          Notes <span className="text-xs font-normal text-gray-500">(optionnel)</span>
        </label>
        <textarea
          id="smtp-notes"
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Ex: Compte dédié phishing chez OVH, identifiants dans le coffre 1Password de l'équipe RSSI."
          className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:border-accent-500 focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {pending ? "..." : isUpdate ? "💾 Mettre à jour" : "💾 Enregistrer"}
        </button>
        {isUpdate && (
          <>
            <button
              type="button"
              onClick={onTest}
              disabled={pending}
              className="btn-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              🔌 Tester la connexion
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="text-sm text-warn hover:text-rose-700 hover:underline ml-auto"
            >
              Supprimer la configuration
            </button>
          </>
        )}
      </div>
    </form>
  );
}
