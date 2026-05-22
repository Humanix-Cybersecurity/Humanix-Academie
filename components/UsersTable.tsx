"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// UsersTable - Table de gestion des collaborateurs.
//   - Colonnes : nom/email, role (avec RSSI), service, groupes, 2FA, statut.
//   - Actions : suspendre, supprimer, forcer 2FA, deverrouiller, reset 2FA,
//               assigner aux groupes (drawer).
//
// REFONTE 2026-05-22 (Florian) :
//
//   1. HIERARCHIE RBAC cote UI : on ne montre la dropdown de role que si
//      l'utilisateur courant a un rang strictement superieur a la cible. Les
//      options sont aussi filtrees (un ADMIN ne voit pas SUPERADMIN dans
//      les choix). Cf. lib/role-hierarchy.ts pour la logique cote server.
//
//      Avant : un MANAGER voyait la dropdown role sur un ADMIN et cliquait
//      → server throw forbidden → alert "Action impossible" (mauvaise UX +
//      illusion de pouvoir).
//
//   2. MENU ACTIONS via REACT PORTAL : avant, le menu absolute etait dans
//      un <td> au sein d'un parent overflow-x-auto → le dropdown etait
//      TRONQUE (signale "UX en cacahuette"). On utilise createPortal +
//      position calculee au click (getBoundingClientRect) pour le rendre
//      hors de la table, z-50, sans contrainte de clipping.
// =============================================================================

import { useTransition, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Role } from "@prisma/client";
import {
  toggleUserActive,
  changeUserRole,
  deleteUser,
  forceUserMfa,
  unlockUser,
  adminResetUserMfa,
  setUserGroups,
} from "@/app/admin/actions";
import {
  canModifyRoleOf,
  getAssignableRoles,
} from "@/lib/role-hierarchy";

type GroupOpt = {
  id: string;
  name: string;
  emoji: string;
  color: string | null;
};

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
  mfaEnabled: boolean;
  mfaForced: boolean;
  isLocked: boolean;
  hasPassword: boolean;
  groupIds: string[];
  groupBadges: GroupOpt[];
};

const ROLE_LABEL: Record<string, { label: string; emoji: string }> = {
  LEARNER: { label: "Apprenant", emoji: "🎓" },
  MANAGER: { label: "Manager", emoji: "👔" },
  RSSI: { label: "RSSI", emoji: "🛡️" },
  ADMIN: { label: "Admin", emoji: "⚙️" },
  SUPERADMIN: { label: "Super-Admin", emoji: "⭐" },
};

export default function UsersTable({
  users,
  allGroups,
  currentUserRole,
}: {
  users: U[];
  allGroups: GroupOpt[];
  /**
   * Role de l'utilisateur actuellement connecte. Utilise pour filtrer
   * les options de role assignable + cacher les actions sur les users
   * de rang >= au sien. Cf. lib/role-hierarchy.ts.
   */
  currentUserRole: Role;
}) {
  const assignableRoles = getAssignableRoles(currentUserRole);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [groupDrawer, setGroupDrawer] = useState<U | null>(null);

  const filtered = users.filter((u) => {
    if (filterGroup && !u.groupIds.includes(filterGroup)) return false;
    if (!filter) return true;
    const t = filter.toLowerCase();
    return (
      u.name.toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t) ||
      (u.service ?? "").toLowerCase().includes(t) ||
      u.groupBadges.some((g) => g.name.toLowerCase().includes(t))
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

  const onForceMfa = (u: U) => {
    setBusy(u.id);
    startTransition(async () => {
      try {
        await forceUserMfa(u.id, !u.mfaForced);
      } catch {
        alert("Action impossible.");
      }
      setBusy(null);
    });
  };

  const onUnlock = (u: U) => {
    setBusy(u.id);
    startTransition(async () => {
      try {
        await unlockUser(u.id);
      } catch {
        alert("Action impossible.");
      }
      setBusy(null);
    });
  };

  const onResetMfa = (u: U) => {
    if (
      !confirm(
        `Réinitialiser la 2FA de ${u.name} ? Le secret et les codes de secours seront effacés ; l'utilisateur devra reconfigurer.`,
      )
    ) {
      return;
    }
    setBusy(u.id);
    startTransition(async () => {
      try {
        await adminResetUserMfa(u.id);
      } catch {
        alert("Action impossible.");
      }
      setBusy(null);
    });
  };

  const onSaveGroups = (userId: string, groupIds: string[]) => {
    setBusy(userId);
    startTransition(async () => {
      try {
        await setUserGroups(userId, groupIds);
        setGroupDrawer(null);
      } catch {
        alert("Action impossible.");
      }
      setBusy(null);
    });
  };

  return (
    <>
      <div className="mb-4 grid sm:grid-cols-[1fr_auto] gap-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher par nom, email, service ou groupe…"
          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:border-accent-500 focus:outline-none transition text-sm"
        />
        {allGroups.length > 0 && (
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            aria-label="Filtrer par groupe"
          >
            <option value="">Tous les groupes</option>
            {allGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Utilisateurs du tenant</caption>
          <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Collaborateur
              </th>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Rôle
              </th>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Groupes
              </th>
              <th scope="col" className="pb-2.5 font-medium text-xs">
                Sécurité
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

                  <td className="py-3 pr-3">
                    {canModifyRoleOf(currentUserRole, u.role) &&
                    !u.isCurrent ? (
                      <select
                        value={u.role}
                        onChange={(e) =>
                          onChangeRole(u, e.target.value as Role)
                        }
                        disabled={pending}
                        aria-label={`Rôle de ${u.name}`}
                        className="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 disabled:opacity-50 bg-white dark:bg-slate-950"
                      >
                        {assignableRoles.map((k) => (
                          <option key={k} value={k}>
                            {ROLE_LABEL[k].emoji} {ROLE_LABEL[k].label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      // Lecture seule : soit la cible est de rang >= au notre
                      // (un ADMIN ne peut pas modifier un autre ADMIN), soit
                      // c'est notre propre compte (auto-modification interdite).
                      <span
                        className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg font-medium"
                        title={
                          u.isCurrent
                            ? "Tu ne peux pas modifier ton propre rôle"
                            : `Tu n'as pas les droits pour modifier un ${ROLE_LABEL[u.role].label}`
                        }
                      >
                        <span aria-hidden="true">
                          {ROLE_LABEL[u.role].emoji}
                        </span>
                        <span>{ROLE_LABEL[u.role].label}</span>
                        <span
                          aria-hidden="true"
                          className="text-gray-400 dark:text-gray-500 ml-1"
                        >
                          🔒
                        </span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 pr-3 max-w-[200px]">
                    <div className="flex items-center gap-1 flex-wrap">
                      {u.groupBadges.length === 0 && (
                        <span className="text-xs text-gray-500 italic">
                          aucun
                        </span>
                      )}
                      {u.groupBadges.slice(0, 3).map((g) => (
                        <span
                          key={g.id}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: g.color ? g.color + "22" : "#f3f4f6",
                            color: g.color ?? "#374151",
                          }}
                          title={g.name}
                        >
                          <span aria-hidden="true">{g.emoji}</span>
                          <span className="truncate max-w-[80px]">
                            {g.name}
                          </span>
                        </span>
                      ))}
                      {u.groupBadges.length > 3 && (
                        <span className="text-[10px] text-gray-500">
                          +{u.groupBadges.length - 3}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setGroupDrawer(u)}
                        className="text-[10px] underline text-accent-700 ml-1"
                      >
                        Modifier
                      </button>
                    </div>
                  </td>

                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold w-fit ${
                          u.mfaEnabled
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : u.mfaForced
                              ? "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {u.mfaEnabled
                          ? "🛡️ 2FA"
                          : u.mfaForced
                            ? "⏳ 2FA forcée"
                            : "🛡️ off"}
                      </span>
                      {u.isLocked && (
                        <span className="text-[10px] text-rose-700 font-bold">
                          🔒 verrouillé
                        </span>
                      )}
                      {!u.hasPassword && (
                        <span className="text-[10px] text-gray-500 italic">
                          sans mdp
                        </span>
                      )}
                    </div>
                  </td>

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
                    </div>
                  </td>

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

                  <td className="py-3 pl-2 text-right whitespace-nowrap">
                    <UserMenu
                      u={u}
                      pending={pending}
                      canAct={
                        canModifyRoleOf(currentUserRole, u.role) && !u.isCurrent
                      }
                      onToggleActive={() => onToggleActive(u)}
                      onForceMfa={() => onForceMfa(u)}
                      onUnlock={() => onUnlock(u)}
                      onResetMfa={() => onResetMfa(u)}
                      onDelete={() => onDelete(u)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8 italic text-sm">
            Aucun utilisateur trouvé
          </p>
        )}
      </div>

      {groupDrawer && (
        <GroupDrawer
          user={groupDrawer}
          allGroups={allGroups}
          onCancel={() => setGroupDrawer(null)}
          onSave={(ids) => onSaveGroups(groupDrawer.id, ids)}
          pending={pending}
        />
      )}
    </>
  );
}

/**
 * Menu Actions par-ligne, rendu via React Portal pour echapper au
 * overflow-x-auto du wrapper de table (sinon le dropdown etait tronque a
 * droite, signale "UX en cacahuette" par Florian le 22/05/2026).
 *
 * Position calculee au click via getBoundingClientRect du bouton trigger,
 * ancree top-right du bouton. z-50 pour passer au-dessus des autres
 * elements de la page.
 *
 * Si `canAct=false` (hierarchie RBAC bloque ou auto-modification), on
 * affiche un bouton disabled avec un tooltip explicatif plutot que de
 * cacher completement — l'admin comprend pourquoi il ne peut pas agir.
 */
function UserMenu({
  u,
  pending,
  canAct,
  onToggleActive,
  onForceMfa,
  onUnlock,
  onResetMfa,
  onDelete,
}: {
  u: U;
  pending: boolean;
  canAct: boolean;
  onToggleActive: () => void;
  onForceMfa: () => void;
  onUnlock: () => void;
  onResetMfa: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // createPortal n'existe pas cote SSR — on attend le mount client.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calcul de la position au moment de l'ouverture. On utilise window
  // coords (position: fixed) pour ne pas dependre du contexte d'overflow.
  // Recompute au scroll/resize pour suivre le bouton.
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        top: rect.bottom + 4, // 4px sous le bouton
        right: window.innerWidth - rect.right, // ancre par la droite
      });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Fermeture au clavier (Escape).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const disabledTitle = !canAct
    ? u.isCurrent
      ? "Tu ne peux pas modifier ton propre compte"
      : `Tu n'as pas les droits pour modifier un ${ROLE_LABEL[u.role].label}`
    : undefined;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending || !canAct}
        title={disabledTitle}
        className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          canAct
            ? `Actions sur ${u.name}`
            : `Actions non disponibles sur ${u.name}`
        }
      >
        Actions ⌄
      </button>
      {open &&
        mounted &&
        pos &&
        createPortal(
          <>
            {/* Backdrop transparent pour fermer au clic externe */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              style={{ top: pos.top, right: pos.right }}
              className="fixed w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 text-sm overflow-hidden"
            >
              <MenuItem
                onClick={() => {
                  setOpen(false);
                  onToggleActive();
                }}
              >
                {u.isActive ? "⏸ Suspendre" : "▶ Réactiver"}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setOpen(false);
                  onForceMfa();
                }}
              >
                {u.mfaForced ? "🛡️ Ne plus forcer la 2FA" : "🛡️ Forcer la 2FA"}
              </MenuItem>
              {u.isLocked && (
                <MenuItem
                  onClick={() => {
                    setOpen(false);
                    onUnlock();
                  }}
                >
                  🔓 Déverrouiller
                </MenuItem>
              )}
              {u.mfaEnabled && (
                <MenuItem
                  onClick={() => {
                    setOpen(false);
                    onResetMfa();
                  }}
                >
                  🔄 Réinitialiser la 2FA
                </MenuItem>
              )}
              <div className="border-t border-gray-100 dark:border-slate-800" />
              <MenuItem
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                danger
              >
                🗑 Supprimer (RGPD)
              </MenuItem>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full text-left px-3 py-2 disabled:opacity-30 disabled:cursor-not-allowed ${
        danger
          ? "text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function GroupDrawer({
  user,
  allGroups,
  onCancel,
  onSave,
  pending,
}: {
  user: U;
  allGroups: GroupOpt[];
  onCancel: () => void;
  onSave: (ids: string[]) => void;
  pending: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(user.groupIds),
  );
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Groupes de ${user.name}`}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-950 shadow-2xl overflow-y-auto"
      >
        <header className="sticky top-0 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-primary-500 dark:text-accent-300">
              Groupes de {user.name}
            </h3>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </header>
        <div className="p-4 space-y-2">
          {allGroups.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              Aucun groupe disponible. Créez-en un dans /admin/groupes.
            </p>
          )}
          {allGroups.map((g) => (
            <label
              key={g.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(g.id)}
                onChange={() => toggle(g.id)}
              />
              <span
                className="text-lg w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: g.color ? g.color + "20" : "#f3f4f6",
                  color: g.color ?? undefined,
                }}
              >
                {g.emoji}
              </span>
              <span className="text-sm font-medium">{g.name}</span>
            </label>
          ))}
        </div>
        <footer className="sticky bottom-0 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 p-4 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onSave(Array.from(selected))}
            className="btn-primary text-sm flex-1"
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
        </footer>
      </div>
    </>
  );
}
