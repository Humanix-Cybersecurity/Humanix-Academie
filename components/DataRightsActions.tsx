"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Composant client pour la section "Droit a l'oubli" sur /profil/donnees.

import { useState, useTransition } from "react";
import { requestSelfErasure } from "@/app/profil/donnees/actions";

export default function DataRightsActions({
  userEmail,
  tenantName,
}: {
  userEmail: string;
  tenantName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await requestSelfErasure(confirm);
      if (res.ok) {
        setDone(true);
        setTimeout(() => {
          window.location.href = "/connexion?erased=1";
        }, 2000);
      } else {
        setError(res.error ?? "Erreur");
      }
    });
  };

  if (done) {
    return (
      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 p-3">
        ✓ Compte effacé. Vous allez être redirigé vers la page de connexion.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
      >
        Demander l'effacement de mon compte
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
        Confirmation : tapez exactement{" "}
        <code className="bg-white/40 dark:bg-slate-800 px-1 rounded">
          EFFACER MON COMPTE
        </code>{" "}
        ci-dessous.
      </p>
      <input
        type="text"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="EFFACER MON COMPTE"
        className="block w-full rounded-lg border-2 border-rose-300 dark:border-rose-700 p-2 text-sm bg-white dark:bg-slate-950"
        autoFocus
      />
      {error && (
        <p
          role="alert"
          className="text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded p-2"
        >
          {error}
        </p>
      )}
      <p className="text-xs text-rose-900 dark:text-rose-200">
        Compte concerné : <strong>{userEmail}</strong> dans{" "}
        <strong>{tenantName}</strong>.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50"
        >
          {pending ? "Effacement…" : "Confirmer l'effacement"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setError(null);
          }}
          className="btn-secondary text-sm"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
