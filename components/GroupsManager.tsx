"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/groupes : CRUD client des groupes metier.

import { useState, useTransition } from "react";
import {
  createGroup,
  updateGroup,
  deleteGroup,
} from "@/app/admin/actions";

type G = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  color: string | null;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  memberCount: number;
};

const EMOJI_PRESETS = [
  "🏷️",
  "💼",
  "🧮",
  "👥",
  "💻",
  "⚙️",
  "🎯",
  "🛒",
  "🛡️",
  "📞",
  "🏭",
  "🧑‍🔧",
  "🩺",
  "📚",
  "🎨",
];

export default function GroupsManager({ groups }: { groups: G[] }) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createGroup(fd);
        setCreating(false);
      } catch (err: any) {
        setError(err?.message ?? "erreur");
      }
    });
  };

  const onUpdate = (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateGroup(id, fd);
        setEditingId(null);
      } catch (err: any) {
        setError(err?.message ?? "erreur");
      }
    });
  };

  const onDelete = (g: G) => {
    if (g.isSystem) {
      alert(
        "Ce groupe système ne peut pas être supprimé. Vous pouvez le désactiver à la place.",
      );
      return;
    }
    if (g.memberCount > 0) {
      if (
        !confirm(
          `${g.memberCount} utilisateur(s) sont assignés à ce groupe. Confirmer la suppression ?`,
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`Supprimer le groupe « ${g.name} » ?`)) return;
    }
    startTransition(async () => {
      try {
        await deleteGroup(g.id);
      } catch (err: any) {
        setError(err?.message ?? "erreur");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3"
        >
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {groups.length} groupe(s)
        </p>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn-primary text-sm"
          >
            + Nouveau groupe
          </button>
        )}
      </div>

      {creating && (
        <form
          onSubmit={onCreate}
          className="border-2 border-accent-300 dark:border-accent-700 bg-accent-50/40 dark:bg-accent-950/30 rounded-xl p-4 space-y-3"
        >
          <GroupFormFields />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              Créer
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="btn-secondary text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Groupes d'utilisateurs du tenant</caption>
          <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
            <tr>
              <th className="pb-2 font-medium text-xs">Groupe</th>
              <th className="pb-2 font-medium text-xs">Slug</th>
              <th className="pb-2 font-medium text-xs">Membres</th>
              <th className="pb-2 font-medium text-xs">Statut</th>
              <th className="pb-2 font-medium text-xs text-right pr-2">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <ExistingRow
                key={g.id}
                g={g}
                editing={editingId === g.id}
                onEdit={() => setEditingId(g.id)}
                onCancel={() => setEditingId(null)}
                onUpdate={(e) => onUpdate(g.id, e)}
                onDelete={() => onDelete(g)}
                pending={pending}
              />
            ))}
            {groups.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-gray-500 italic"
                >
                  Aucun groupe pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExistingRow({
  g,
  editing,
  onEdit,
  onCancel,
  onUpdate,
  onDelete,
  pending,
}: {
  g: G;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onUpdate: (e: React.FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  if (editing) {
    return (
      <tr>
        <td colSpan={5} className="py-3">
          <form
            onSubmit={onUpdate}
            className="border-2 border-accent-300 dark:border-accent-700 bg-accent-50/40 dark:bg-accent-950/30 rounded-xl p-4 space-y-3"
          >
            <GroupFormFields defaults={g} />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="btn-primary text-sm"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary text-sm"
              >
                Annuler
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-gray-100 dark:border-slate-800/60 last:border-0">
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="text-lg w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: g.color ? g.color + "20" : "#f3f4f6",
              color: g.color ?? undefined,
            }}
          >
            {g.emoji}
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {g.name}
              {g.isSystem && (
                <span className="ml-2 text-[9px] uppercase tracking-wide text-gray-500">
                  Système
                </span>
              )}
            </p>
            {g.description && (
              <p className="text-xs text-gray-500 max-w-md truncate">
                {g.description}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 pr-3 text-xs text-gray-500 font-mono">{g.slug}</td>
      <td className="py-3 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
        {g.memberCount}
      </td>
      <td className="py-3 pr-3">
        {g.isActive ? (
          <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
            Actif
          </span>
        ) : (
          <span className="text-xs bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
            Inactif
          </span>
        )}
      </td>
      <td className="py-3 pl-2 text-right whitespace-nowrap">
        <div className="inline-flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            Modifier
          </button>
          {!g.isSystem && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs px-2 py-1 rounded text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              Supprimer
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function GroupFormFields({ defaults }: { defaults?: G }) {
  return (
    <>
      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">
            Nom du groupe *
          </label>
          <input
            name="name"
            required
            defaultValue={defaults?.name}
            placeholder="Comptabilité, RH, Direction…"
            className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Couleur</label>
          <input
            type="color"
            name="color"
            defaultValue={defaults?.color ?? "#0B3D91"}
            className="block w-12 h-9 rounded border border-gray-200"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Emoji</label>
        <div className="flex flex-wrap gap-1">
          {EMOJI_PRESETS.map((e) => (
            <label key={e} className="cursor-pointer">
              <input
                type="radio"
                name="emoji"
                value={e}
                defaultChecked={
                  defaults ? defaults.emoji === e : e === "🏷️"
                }
                className="sr-only peer"
              />
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 border-transparent peer-checked:border-accent-500 hover:bg-gray-100 dark:hover:bg-slate-800 text-lg">
                {e}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={defaults?.description ?? ""}
          rows={2}
          placeholder="Optionnel : à quoi sert ce groupe."
          className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2 text-sm"
        />
      </div>
      {defaults && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaults.isActive}
          />
          <span>Groupe actif (utilisable pour le ciblage)</span>
        </label>
      )}
    </>
  );
}
