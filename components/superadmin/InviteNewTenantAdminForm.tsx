"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Formulaire SUPERADMIN pour inviter un NOUVEL admin natif d'un tenant.
// Cree le user + envoie magic link via Scaleway TEM.
//
// Si l'email existe deja sur la plateforme, on retourne already_exists et
// on oriente vers AddExternalAdminForm (membership) plutot que de creer
// un doublon.

import { useState, useTransition } from "react";
import { inviteNewTenantAdmin } from "@/app/superadmin/tenants/[id]/admins/actions";

const ERROR_FR: Record<string, string> = {
  unauthorized: "Session expirée, reconnecte-toi.",
  forbidden: "Tu n'as pas les droits SUPERADMIN.",
  tenant_not_found: "Tenant introuvable.",
  invalid_email: "Email invalide.",
  invalid_role: "Rôle invalide. Choisis MANAGER, RSSI ou ADMIN.",
  forbidden_role_hierarchy:
    "Tu ne peux pas accorder ce rôle (hiérarchie RBAC).",
  already_exists:
    "Cet email existe déjà sur la plateforme. Utilise « Ajouter un admin externe » avec un membership plutôt que de créer un doublon.",
  email_send_failed:
    "User créé mais l'email n'a pas pu partir. Renvoie l'invitation via /admin/utilisateurs.",
};

export default function InviteNewTenantAdminForm({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const onSubmit = (formData: FormData) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await inviteNewTenantAdmin(tenantId, formData);
      if (res.ok) {
        setFeedback({
          type: "ok",
          msg: `Nouvel admin natif créé pour ${tenantName}. Un magic link a été envoyé à son adresse.`,
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="new-email"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email
          </label>
          <input
            id="new-email"
            name="email"
            type="email"
            required
            placeholder="prenom.nom@entreprise.fr"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
        <div>
          <label
            htmlFor="new-role"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Rôle
          </label>
          <select
            id="new-role"
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
          htmlFor="new-name"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Nom complet (optionnel)
        </label>
        <input
          id="new-name"
          name="name"
          type="text"
          maxLength={100}
          placeholder="Prénom Nom"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
      >
        {pending ? "Création + envoi du magic link…" : "✉️ Créer + inviter"}
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
