"use client";

import { useTransition, useState } from "react";
import type { Role } from "@prisma/client";
import { toggleUserActive, changeUserRole, deleteUser } from "@/app/admin/actions";

type U = {
  id: string;
  name: string;
  email: string;
  role: Role;
  service: string | null;
  isActive: boolean;
  isCurrent: boolean;
  coins: number;
  completed: number;
  totalEpisodes: number;
  xp: number;
  lastActivity: string | null;
};

const ROLE_LABEL: Record<string, { label: string; emoji: string }> = {
  LEARNER: { label: "Apprenant", emoji: "🎓" },
  MANAGER: { label: "Manager", emoji: "👔" },
  ADMIN: { label: "Admin", emoji: "🛡️" },
  SUPERADMIN: { label: "Super-Admin", emoji: "⚙️" },
};

export default function UsersTable({ users }: { users: U[] }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = users.filter((u) => {
    if (!filter) return true;
    const t = filter.toLowerCase();
    return (
      u.name.toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t) ||
      (u.service ?? "").toLowerCase().includes(t)
    );
  });

  const onToggleActive = (u: U) => {
    if (u.isCurrent) {
      alert("Impossible de désactiver ton propre compte.");
      return;
    }
    setBusy(u.id);
    startTransition(async () => {
      try {
        await toggleUserActive(u.id, !u.isActive);
      } catch {
        alert("Action impossible.");
      }
      setBusy(null);
    });
  };

  const onChangeRole = (u: U, role: Role) => {
    if (u.isCurrent) {
      alert("Impossible de modifier ton propre rôle.");
      return;
    }
    setBusy(u.id);
    startTransition(async () => {
      try {
        await changeUserRole(u.id, role);
      } catch {
        alert("Action impossible.");
      }
      setBusy(null);
    });
  };

  const onDelete = (u: U) => {
    if (u.isCurrent) {
      alert("Impossible de supprimer ton propre compte.");
      return;
    }
    if (!confirm(`Supprimer définitivement ${u.name} ? Toutes ses données seront effacées (RGPD).`)) {
      return;
    }
    setBusy(u.id);
    startTransition(async () => {
      try {
        await deleteUser(u.id);
      } catch {
        alert("Suppression impossible.");
      }
      setBusy(null);
    });
  };

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher par nom, email ou service…"
          className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-accent-500 focus:outline-none transition text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th scope="col" className="pb-3 font-medium">Collaborateur</th>
              <th scope="col" className="pb-3 font-medium">Rôle</th>
              <th scope="col" className="pb-3 font-medium">Service</th>
              <th scope="col" className="pb-3 font-medium">Progression</th>
              <th scope="col" className="pb-3 font-medium">Statut</th>
              <th scope="col" className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const pct = u.totalEpisodes === 0 ? 0 : Math.round((u.completed / u.totalEpisodes) * 100);
              const isBusy = busy === u.id;
              return (
                <tr
                  key={u.id}
                  className={`border-b last:border-0 transition ${
                    isBusy ? "animate-pulse bg-gray-50" : "hover:bg-primary-50/50"
                  } ${!u.isActive ? "opacity-60" : ""}`}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-500 font-bold flex items-center justify-center text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">
                          {u.name}
                          {u.isCurrent && (
                            <span className="ml-2 text-xs text-accent-500 font-bold">(toi)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <select
                      value={u.role}
                      onChange={(e) => onChangeRole(u, e.target.value as Role)}
                      disabled={pending || u.isCurrent}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 disabled:opacity-50 bg-white"
                    >
                      {Object.entries(ROLE_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.emoji} {v.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-gray-600">{u.service ?? "—"}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {u.completed}/{u.totalEpisodes}
                      </span>
                      <span className="text-xs text-accent-600 font-bold">{u.xp}XP</span>
                    </div>
                  </td>
                  <td className="py-3">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 px-2 py-1 rounded-full font-bold">
                        <span aria-hidden="true">✓</span>
                        <span>ACTIF</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200 px-2 py-1 rounded-full font-bold">
                        <span aria-hidden="true">⏸</span>
                        <span>SUSPENDU</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onToggleActive(u)}
                      disabled={pending || u.isCurrent}
                      className="text-xs text-gray-500 hover:text-primary-500 mr-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {u.isActive ? "Suspendre" : "Réactiver"}
                    </button>
                    <button
                      onClick={() => onDelete(u)}
                      disabled={pending || u.isCurrent}
                      className="text-xs text-gray-500 hover:text-warn disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8 italic text-sm">Aucun utilisateur trouvé</p>
        )}
      </div>
    </>
  );
}
