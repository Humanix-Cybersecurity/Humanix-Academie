"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Ligne d'un admin externe (via TenantMembership) avec actions
// "modifier role" et "revoquer".

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import {
  revokeExternalAdminMembership,
  updateExternalAdminMembershipRole,
} from "@/app/superadmin/tenants/[id]/admins/actions";
import type { TenantAdminEntry } from "@/lib/tenant-membership";

const ASSIGNABLE_ROLES: Role[] = ["MANAGER", "RSSI", "ADMIN"];

export default function ExternalAdminRow({
  tenantId,
  entry,
  roleLabel,
}: {
  tenantId: string;
  entry: TenantAdminEntry;
  roleLabel: Record<string, { label: string; emoji: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const onChangeRole = (newRole: Role) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateExternalAdminMembershipRole(
        tenantId,
        entry.userId,
        newRole,
      );
      if (!res.ok) {
        setFeedback(`Erreur: ${res.error}`);
      }
    });
  };

  const onRevoke = () => {
    if (
      !confirm(
        `Retirer l'accès admin de ${entry.email} sur ce tenant ? L'user reste membre de son home tenant.`,
      )
    ) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await revokeExternalAdminMembership(tenantId, entry.userId);
      if (!res.ok) {
        setFeedback(`Erreur: ${res.error}`);
      }
    });
  };

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {entry.name ?? entry.email.split("@")[0]}
            {!entry.isActive && (
              <span className="ml-2 text-[10px] text-gray-500 font-normal italic">
                (suspendu dans son tenant home)
              </span>
            )}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {entry.email}
          </p>
          {entry.homeTenantName && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              Home : {entry.homeTenantName}
            </p>
          )}
          {entry.grantedAt && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              Accordé le {entry.grantedAt.toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={entry.effectiveRole}
            onChange={(e) => onChangeRole(e.target.value as Role)}
            disabled={pending}
            aria-label={`Modifier le rôle membership de ${entry.email}`}
            className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r].emoji} {roleLabel[r].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRevoke}
            disabled={pending}
            className="text-xs px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50"
            title="Révoquer le membership"
          >
            Retirer
          </button>
        </div>
      </div>
      {feedback && (
        <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
          {feedback}
        </p>
      )}
    </li>
  );
}
