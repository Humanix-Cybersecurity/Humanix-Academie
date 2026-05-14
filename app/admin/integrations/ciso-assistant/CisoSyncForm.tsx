"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Client component qui orchestre :
//   1. Form de configuration (server action saveConnection)
//   2. Bouton "Tester la connexion" (server action testConnection)
//   3. Bouton "Supprimer la connexion" (server action deleteConnection)
//   4. Selector framework + bouton "Synchroniser" (server action startSync)
//   5. Affiche le <CisoSyncTerminal> apres clic sur "Synchroniser"
//
// L'etat est minimal : tout est cote serveur (DB), on rerend la page via
// revalidatePath() apres chaque action. Seul le runId actif de la sync en
// cours est state local, pour pouvoir afficher le terminal SSE.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveConnection,
  testConnection,
  deleteConnection,
  startSync,
} from "./actions";
import CisoSyncTerminal from "./CisoSyncTerminal";

type ExistingConnection = {
  baseUrl: string;
  username: string;
  folderName: string;
  ownerEmail: string | null;
  verifySSL: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestError: string | null;
};

export default function CisoSyncForm({
  existing,
  frameworks,
  testStatusLabels,
}: {
  existing: ExistingConnection | null;
  frameworks: string[];
  testStatusLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    kind: "ok" | "err";
    text: string;
    detail?: string;
  } | null>(null);
  const [framework, setFramework] = useState(frameworks[0]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const onSave = async (formData: FormData) => {
    setToast(null);
    try {
      await saveConnection(formData);
      setToast({ kind: "ok", text: "Connexion enregistrée." });
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ kind: "err", text: msg });
    }
  };

  const onTest = () => {
    setToast(null);
    startTransition(async () => {
      try {
        const result = await testConnection();
        setToast({
          kind: result.ok ? "ok" : "err",
          text: result.message,
          detail: result.detail,
        });
        router.refresh();
      } catch (err) {
        setToast({
          kind: "err",
          text: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  const onDelete = () => {
    if (!confirm("Supprimer la connexion CISO Assistant ?")) return;
    startTransition(async () => {
      try {
        await deleteConnection();
        setToast({ kind: "ok", text: "Connexion supprimée." });
        router.refresh();
      } catch (err) {
        setToast({
          kind: "err",
          text: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  const onSync = () => {
    setToast(null);
    setActiveRunId(null);
    const fd = new FormData();
    fd.set("framework", framework);
    startTransition(async () => {
      try {
        const { runId } = await startSync(fd);
        setActiveRunId(runId);
      } catch (err) {
        setToast({
          kind: "err",
          text: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ============ Form configuration ============ */}
      <section className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Configuration de la connexion
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Renseignez l'URL et un compte CISO Assistant ayant les droits de
          créer un folder et des evidences. Le password est chiffré AES-256-GCM
          en base.
        </p>

        <form action={onSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                URL de base
              </span>
              <input
                type="url"
                name="baseUrl"
                required
                defaultValue={existing?.baseUrl ?? ""}
                placeholder="https://ciso.client.fr"
                className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Utilisateur (email)
              </span>
              <input
                type="email"
                name="username"
                required
                defaultValue={existing?.username ?? ""}
                placeholder="connecteur@client.fr"
                className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mot de passe
              </span>
              <input
                type="password"
                name="password"
                placeholder={
                  existing ? "(inchangé si laissé vide)" : "Mot de passe"
                }
                className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nom du folder côté CISO Assistant
              </span>
              <input
                type="text"
                name="folderName"
                defaultValue={existing?.folderName ?? "Humanix Académie"}
                className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email du responsable désigné <span className="text-gray-400">(optionnel — RSSI ou DPO du tenant)</span>
              </span>
              <input
                type="email"
                name="ownerEmail"
                defaultValue={existing?.ownerEmail ?? ""}
                placeholder="rssi@client.fr"
                className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
              />
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                Embedded dans la description de chaque evidence — exigence audit ISO 27001 §7.5 (informations documentées).
              </span>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              name="verifySSL"
              defaultChecked={existing?.verifySSL ?? true}
              className="rounded border-gray-300 dark:border-slate-600 text-primary-500"
            />
            Vérifier le certificat SSL (décocher uniquement en dev local avec cert auto-signé)
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition"
            >
              Enregistrer
            </button>
            {existing && (
              <>
                <button
                  type="button"
                  onClick={onTest}
                  disabled={pending}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-800 dark:text-gray-200 text-sm font-medium transition"
                >
                  Tester la connexion
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  Supprimer la connexion
                </button>
              </>
            )}
          </div>
        </form>

        {existing?.lastTestedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Dernier test : {new Date(existing.lastTestedAt).toLocaleString("fr-FR")} —{" "}
            <span
              className={
                existing.lastTestStatus === "ok"
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : "text-red-600 dark:text-red-400 font-medium"
              }
            >
              {testStatusLabels[existing.lastTestStatus ?? ""] ??
                existing.lastTestStatus}
            </span>
            {existing.lastTestError && (
              <span className="block text-red-500 dark:text-red-400 mt-0.5 font-mono">
                {existing.lastTestError}
              </span>
            )}
          </p>
        )}

        {toast && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              toast.kind === "ok"
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="font-medium">{toast.text}</div>
            {toast.detail && (
              <div className="font-mono text-xs mt-1 opacity-80">{toast.detail}</div>
            )}
          </div>
        )}
      </section>

      {/* ============ Bouton Synchroniser ============ */}
      {existing && existing.lastTestStatus === "ok" && (
        <section className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Synchroniser un framework
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choisissez un référentiel et lancez la sync. Le déroulement s'affiche en live.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Framework
              </span>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
              >
                {frameworks.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onSync}
              disabled={pending || activeRunId !== null}
              className="px-5 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-sm font-bold shadow-sm transition"
            >
              {pending ? "Démarrage…" : "Synchroniser maintenant"}
            </button>
          </div>
        </section>
      )}

      {/* ============ Terminal SSE live ============ */}
      {activeRunId && (
        <section className="space-y-2">
          <CisoSyncTerminal
            runId={activeRunId}
            onDone={() => {
              router.refresh(); // rafraichit le tableau historique
              // On garde activeRunId pour que le user puisse voir le log final.
            }}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setActiveRunId(null)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
            >
              Fermer le terminal
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
