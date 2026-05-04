"use client";

// =============================================================================
// UsersTable — Table de gestion des collaborateurs (refonte mai 2026).
//
// Modifications vs version précédente :
//   - Suppression de la colonne avatar 1-lettre (visuellement bruyant pour rien)
//   - Actions "Suspendre/Réactiver" et "Supprimer" remplacées par des icônes
//     compactes (Pause/Play + Trash) avec tooltip + aria-label pour a11y
//   - Hover row plus subtil (gray-50 au lieu de primary-50)
// =============================================================================

import { useTransition, useState } from "react";
import type { Role } from "@prisma/client";
import {
  toggleUserActive,
  changeUserRole,
  deleteUser,
} from "@/app/admin/actions";

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
    if (
      !confirm(
        `Supprimer définitivement ${u.name} ? Toutes ses données seront effacées (RGPD).`,
      )
    ) {
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
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher par nom, email ou service…"
          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:border-accent-500 focus:outline-none transition text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Collaborateur
              </th>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Rôle
              </th>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Service
              </th>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Progression
              </th>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Statut
              </th>
              <th
                scope="col"
                className="pb-2.5 font-medium text-xs text-right pr-2"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const pct =
                u.totalEpisodes === 0
                  ? 0
                  : Math.round((u.completed / u.totalEpisodes) * 100);
              const isBusy = busy === u.id;
              return (
                <tr
                  key={u.id}
                  className={`border-b border-gray-100 dark:border-slate-800/60 last:border-0 transition ${
                    isBusy
                      ? "animate-pulse bg-gray-50 dark:bg-slate-800/40"
                      : "hover:bg-gray-50/60 dark:hover:bg-slate-800/30"
                  } ${!u.isActive ? "opacity-60" : ""}`}
                >
                  {/* Collaborateur — sans avatar 1-lettre, juste nom + email */}
                  <td className="py-3 pr-3 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {u.name}
                      {u.isCurrent && (
                        <span className="ml-2 text-xs text-accent-500 font-bold">
                          (toi)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {u.email}
                    </p>
                  </td>

                  {/* Rôle */}
                  <td className="py-3 pr-3">
                    <select
                      value={u.role}
                      onChange={(e) => onChangeRole(u, e.target.value as Role)}
                      disabled={pending || u.isCurrent}
                      aria-label={`Rôle de ${u.name}`}
                      className="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 disabled:opacity-50 bg-white dark:bg-slate-950"
                    >
                      {Object.entries(ROLE_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.emoji} {v.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Service */}
                  <td className="py-3 pr-3 text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                    {u.service ?? "—"}
                  </td>

                  {/* Progression */}
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 lg:w-20 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-accent-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {u.completed}/{u.totalEpisodes}
                      </span>
                      <span className="text-xs text-accent-600 font-bold tabular-nums">
                        {u.xp}XP
                      </span>
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="py-3 pr-3">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        <span aria-hidden="true">✓</span>
                        <span>Actif</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                        <span aria-hidden="true">⏸</span>
                        <span>Suspendu</span>
                      </span>
                    )}
                  </td>

                  {/* Actions — icônes compactes au lieu de boutons texte */}
                  <td className="py-3 pl-2 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <IconButton
                        onClick={() => onToggleActive(u)}
                        disabled={pending || u.isCurrent}
                        title={
                          u.isActive
                            ? "Suspendre l'utilisateur"
                            : "Réactiver l'utilisateur"
                        }
                        aria-label={
                          u.isActive
                            ? `Suspendre ${u.name}`
                            : `Réactiver ${u.name}`
                        }
                        variant="default"
                      >
                        {u.isActive ? <PauseIcon /> : <PlayIcon />}
                      </IconButton>
                      <IconButton
                        onClick={() => onDelete(u)}
                        disabled={pending || u.isCurrent}
                        title="Supprimer définitivement (RGPD)"
                        aria-label={`Supprimer ${u.name}`}
                        variant="danger"
                      >
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8 italic text-sm">
            Aucun utilisateur trouvé
          </p>
        )}
      </div>
    </>
  );
}

// =============================================================================
// Sous-composants
// =============================================================================

function IconButton({
  children,
  onClick,
  disabled,
  title,
  "aria-label": ariaLabel,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  "aria-label": string;
  variant?: "default" | "danger";
}) {
  const variantClass =
    variant === "danger"
      ? "text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
      : "text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:hover:text-accent-300";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 ${variantClass}`}
    >
      {children}
    </button>
  );
}

// SVG inline pour ne pas ajouter de dépendance lucide-react.
function PauseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="4" y="3" width="3" height="10" rx="1" />
      <rect x="9" y="3" width="3" height="10" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5 3v10l8-5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 4h11M5.5 4V2.5h5V4M4 4l1 9.5h6L12 4M6.5 7v4M9.5 7v4" />
    </svg>
  );
}
