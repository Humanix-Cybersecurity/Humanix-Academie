"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Formulaire SUPERADMIN pour ajouter un admin EXTERNE (membership) sur
// un tenant. Le user cible doit deja exister sur la plateforme — sinon
// utiliser InviteNewTenantAdminForm a la place.

import { useState, useTransition } from "react";
import { addExternalAdminMembership } from "@/app/superadmin/tenants/[id]/admins/actions";

const ERROR_FR: Record<string, string> = {
  unauthorized: "Session expirée, reconnecte-toi.",
  forbidden: "Tu n'as pas les droits SUPERADMIN.",
  tenant_not_found: "Tenant introuvable.",
  user_not_found_neutral:
    "Aucun user trouvé avec cet email (sur la plateforme entière). Utilise « Inviter un nouvel admin » à la place.",
  already_native:
    "Cet user est déjà membre natif de ce tenant. Modifie son rôle via /admin/utilisateurs plutôt qu'un membership externe.",
  already_member: "Ce user a déjà un membership sur ce tenant.",
  invalid_role: "Rôle invalide. Choisis MANAGER, RSSI ou ADMIN.",
  forbidden_role_hierarchy:
    "Tu ne peux pas accorder ce rôle (hiérarchie RBAC).",
  self_membership_forbidden:
    "Tu ne peux pas t'ajouter toi-même un membership via cette interface.",
};

export default function AddExternalAdminForm({
  tenantId,
}: {
  tenantId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const onSubmit = (formData: FormData) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await addExternalAdminMembership(tenantId, formData);
      if (res.ok) {
        setFeedback({
          type: "ok",
          msg: "Admin externe ajouté avec succès. Il peut désormais agir comme admin sur ce tenant.",
        });
      } else {
        setFeedback({
          type: "err",
          msg: ERROR_FR[res.error] ?? "Erreur inconnue.",
        });
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
        <div>
          <label
            htmlFor="ext-email"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email du user
          </label>
          <input
            id="ext-email"
            name="email"
            type="email"
            required
            placeholder="user@example.fr"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
        <div>
          <label
            htmlFor="ext-role"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Rôle
          </label>
          <select
            id="ext-role"
            name="role"
            defaultValue="ADMIN"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="MANAGER">👔 Manager</option>
            <option value="RSSI">🛡️ RSSI</option>
            <option value="ADMIN">⚙️ Admin</option>
          </select>
        </div>
      </div>
      <div>
        <label
          htmlFor="ext-note"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Note (optionnelle, max 200 caractères)
        </label>
        <input
          id="ext-note"
          name="note"
          type="text"
          maxLength={200}
          placeholder="Ex: Accompagnement déploiement Q2 2026"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
      >
        {pending ? "Ajout en cours…" : "+ Ajouter le membership"}
      </button>
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs ${
            feedback.type === "ok"
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.msg}
        </div>
      )}
    </form>
  );
}
