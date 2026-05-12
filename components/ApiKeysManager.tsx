"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useTransition } from "react";
import {
  createApiKey,
  revokeApiKey,
  deleteApiKey,
} from "@/app/admin/api-keys/actions";

type Key = {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export default function ApiKeysManager({ keys }: { keys: Key[] }) {
  const [pending, startTransition] = useTransition();
  const [newlyCreated, setNewlyCreated] = useState<{
    plain: string;
    name: string;
  } | null>(null);

  const onCreate = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const res = await createApiKey(formData);
        setNewlyCreated(res);
        const form = document.querySelector(
          "#new-key-form",
        ) as HTMLFormElement | null;
        form?.reset();
      } catch {
        alert("Création impossible.");
      }
    });
  };

  const onRevoke = (id: string) => {
    if (
      !confirm(
        "Révoquer cette clé ? Les intégrations qui l'utilisent vont cesser de fonctionner.",
      )
    )
      return;
    startTransition(async () => {
      try {
        await revokeApiKey(id);
      } catch {}
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Supprimer définitivement cette clé ?")) return;
    startTransition(async () => {
      try {
        await deleteApiKey(id);
      } catch {}
    });
  };

  return (
    <>
      {newlyCreated && (
        <div className="card mb-6 bg-success/10 border-success">
          <h3 className="font-bold text-success mb-2">
            🎉 Clé "{newlyCreated.name}" créée
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Copie-la maintenant</strong> - elle ne sera plus jamais
            affichée en clair.
          </p>
          <div className="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-sm break-all flex items-center gap-2">
            <span className="flex-1">{newlyCreated.plain}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newlyCreated.plain);
                alert("Copié !");
              }}
              className="text-xs bg-green-700 text-white px-3 py-1 rounded"
            >
              Copier
            </button>
          </div>
          <button
            onClick={() => setNewlyCreated(null)}
            className="text-xs text-gray-500 mt-3 hover:text-warn"
          >
            J'ai bien copié la clé, fermer.
          </button>
        </div>
      )}

      <div className="card mb-6">
        <h3 className="font-bold text-primary-500 mb-4">
          Créer une nouvelle clé
        </h3>
        <form
          id="new-key-form"
          action={onCreate}
          className="grid sm:grid-cols-3 gap-3"
        >
          <input
            name="name"
            type="text"
            required
            placeholder="Ex: Tableau de bord MSP"
            className="rounded-xl border-2 border-gray-200 p-3 focus:border-accent-500 focus:outline-none text-sm"
          />
          <select
            name="expiresInDays"
            className="rounded-xl border-2 border-gray-200 p-3 text-sm bg-white"
          >
            <option value="0">Sans expiration</option>
            <option value="30">Expire dans 30 jours</option>
            <option value="90" selected>
              Expire dans 90 jours
            </option>
            <option value="365">Expire dans 1 an</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="btn-primary text-sm"
          >
            {pending ? "Création…" : "Générer la clé"}
          </button>
        </form>
      </div>

      {keys.length === 0 ? (
        <div className="card text-center py-8 text-gray-500 italic">
          Aucune clé pour l'instant. Crée ta première clé ci-dessus.
        </div>
      ) : (
        <div className="card">
          <table className="w-full text-sm">
            <caption className="sr-only">Cles API actives sur le tenant</caption>
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th scope="col" className="pb-3">
                  Nom
                </th>
                <th scope="col" className="pb-3">
                  Préfixe
                </th>
                <th scope="col" className="pb-3">
                  Statut
                </th>
                <th scope="col" className="pb-3">
                  Dernière utilisation
                </th>
                <th scope="col" className="pb-3">
                  Expire
                </th>
                <th scope="col" className="pb-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{k.name}</td>
                  <td className="py-3 font-mono text-xs">{k.prefix}…</td>
                  <td className="py-3">
                    {k.isActive ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        RÉVOQUÉE
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-xs text-gray-500">
                    {k.lastUsedAt
                      ? new Date(k.lastUsedAt).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="py-3 text-xs text-gray-500">
                    {k.expiresAt
                      ? new Date(k.expiresAt).toLocaleDateString("fr-FR")
                      : "Sans"}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {k.isActive && (
                      <button
                        onClick={() => onRevoke(k.id)}
                        className="text-xs text-amber-600 hover:text-amber-700 mr-2"
                      >
                        Révoquer
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(k.id)}
                      className="text-xs text-gray-500 hover:text-warn"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
