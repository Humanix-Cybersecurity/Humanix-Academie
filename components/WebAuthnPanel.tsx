"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Section "Cles de securite (FIDO2 / WebAuthn)" pour /profil/securite.
//
// Permet d'enroller une nouvelle cle (Thales et-Fusion, YubiKey, passkey
// iCloud / 1Password, etc.) et de gerer les cles existantes.
//
// L'enrolement passe par les routes /api/webauthn/register/{options,verify}
// et utilise @simplewebauthn/browser pour le pont avec navigator.credentials.

import { useState, useTransition } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  renameWebauthnCredential,
  deleteWebauthnCredential,
} from "@/app/profil/securite/webauthn-actions";

export type WebAuthnCredentialItem = {
  id: string;
  deviceName: string;
  transports: string | null;
  backedUp: boolean;
  userVerified: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export default function WebAuthnPanel({
  credentials,
  isSuperAdmin,
}: {
  credentials: WebAuthnCredentialItem[];
  isSuperAdmin: boolean;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onEnroll = async () => {
    setError(null);
    setSuccess(null);
    setEnrolling(true);
    try {
      const optsRes = await fetch("/api/webauthn/register/options", {
        method: "POST",
      });
      if (!optsRes.ok) {
        const data = await optsRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible d'initier l'enrôlement.");
      }
      const options = await optsRes.json();
      // startRegistration ouvre la dialogue navigateur (insertion + touch)
      const attResponse = await startRegistration(options);

      const verifyRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          response: attResponse,
          deviceName: deviceName.trim() || "Clé de sécurité",
        }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok || !data.ok) {
        throw new Error(data.error ?? "Vérification échouée.");
      }
      setSuccess("Clé enregistrée avec succès.");
      setDeviceName("");
      // Reload pour afficher la nouvelle clé dans la liste
      setTimeout(() => window.location.reload(), 800);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Erreur. Vérifiez que votre clé est branchée et déverrouillée.";
      // Cas particulier : l'utilisateur a annulé la dialog navigateur
      if (msg.includes("operation either timed out") || msg.includes("AbortError") || msg.includes("NotAllowedError")) {
        setError("Annulé. Réessayez en touchant la clé.");
      } else {
        setError(msg);
      }
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
      <header>
        <h2 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 flex items-center gap-2">
          🔑 Clés de sécurité (FIDO2)
          {credentials.length > 0 && (
            <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
              {credentials.length} active{credentials.length > 1 ? "s" : ""}
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Compatible avec Thales et-Fusion, YubiKey, Titan, Feitian et toutes
          les passkeys (iCloud Keychain, 1Password, Bitwarden…).
        </p>
        {isSuperAdmin && credentials.length === 0 && (
          <p className="mt-2 text-xs bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 rounded-lg p-2">
            ⚠ Votre rôle SUPERADMIN exige au moins une clé de sécurité pour
            accéder à la console super-admin.
          </p>
        )}
        {isSuperAdmin && credentials.length === 1 && (
          <p className="mt-2 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 rounded-lg p-2">
            💡 Recommandation : enregistrez une 2e clé de secours et stockez-la
            dans un coffre. Une clé perdue + aucun backup = lockout définitif.
          </p>
        )}
      </header>

      {error && (
        <p
          role="alert"
          className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-2"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="text-sm bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-2"
        >
          ✓ {success}
        </p>
      )}

      {credentials.length > 0 && (
        <ul className="space-y-2">
          {credentials.map((c) => (
            <CredentialRow key={c.id} cred={c} />
          ))}
        </ul>
      )}

      <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
        <p className="text-sm font-bold">Ajouter une clé</p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            maxLength={100}
            placeholder="Nom (ex: Thales et-Fusion bureau)"
            className="flex-1 min-w-0 rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-950"
          />
          <button
            type="button"
            onClick={onEnroll}
            disabled={enrolling}
            className="btn-primary text-sm whitespace-nowrap"
          >
            {enrolling ? "Insérez et touchez…" : "Enrôler ma clé"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Branchez votre clé puis cliquez « Enrôler ma clé ». Une dialogue
          navigateur vous demandera de toucher le capteur ou saisir le PIN
          de la clé.
        </p>
      </div>
    </section>
  );
}

function CredentialRow({ cred }: { cred: WebAuthnCredentialItem }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cred.deviceName);
  const [error, setError] = useState<string | null>(null);

  const onRename = () => {
    setError(null);
    startTransition(async () => {
      try {
        await renameWebauthnCredential(cred.id, name);
        setEditing(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onDelete = () => {
    if (!confirm(`Supprimer définitivement « ${cred.deviceName} » ?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteWebauthnCredential(cred.id);
        window.location.reload();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erreur";
        if (msg.includes("cannot_delete_last_key_for_superadmin")) {
          setError(
            "Impossible : vous devez garder au moins une clé active en tant que SUPERADMIN.",
          );
        } else {
          setError(msg);
        }
      }
    });
  };

  return (
    <li className="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded border border-gray-200 dark:border-slate-700 p-1 text-sm font-bold bg-white dark:bg-slate-950"
              autoFocus
            />
          ) : (
            <p className="font-bold text-gray-900 dark:text-gray-100 break-all">
              {cred.deviceName}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Enregistrée {new Date(cred.createdAt).toLocaleDateString("fr-FR")}
            {cred.lastUsedAt &&
              ` · dernière utilisation ${new Date(cred.lastUsedAt).toLocaleDateString("fr-FR")}`}
          </p>
          <div className="flex gap-1 mt-1 flex-wrap text-[10px]">
            {cred.transports?.split(",").filter(Boolean).map((t) => (
              <span
                key={t}
                className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono"
              >
                {t}
              </span>
            ))}
            {cred.userVerified && (
              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                PIN/biométrie
              </span>
            )}
            {cred.backedUp && (
              <span className="bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                synchronisée
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <button
                type="button"
                onClick={onRename}
                disabled={pending}
                className="text-xs px-2 py-1 rounded bg-accent-500 text-white hover:bg-accent-600"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(cred.deviceName);
                }}
                className="text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Renommer
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="text-xs px-2 py-1 rounded text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded p-2 mt-2"
        >
          {error}
        </p>
      )}
    </li>
  );
}
