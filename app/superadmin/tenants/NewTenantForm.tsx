// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useFormStatus } from "react-dom";
import { creerTenant } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-sm" disabled={pending}>
      {pending ? "Création…" : "Créer le tenant"}
    </button>
  );
}

const CHAMP =
  "w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm";
const LIBELLE =
  "block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1";

export default function NewTenantForm({
  defaults,
  erreur,
}: {
  defaults: {
    org: string;
    email: string;
    adminName: string;
    plan: "pro" | "enterprise";
    revendeur: boolean;
  };
  erreur: string | null;
}) {
  return (
    <form action={creerTenant} className="space-y-5">
      {erreur && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/15 p-3 text-sm text-rose-900 dark:text-rose-200"
        >
          {erreur}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nt-org" className={LIBELLE}>
            Organisation *
          </label>
          <input
            id="nt-org"
            name="org"
            required
            minLength={2}
            maxLength={120}
            defaultValue={defaults.org}
            placeholder="Alsace Micro Services"
            className={CHAMP}
          />
        </div>
        <div>
          <label htmlFor="nt-plan" className={LIBELLE}>
            Plan
          </label>
          <select
            id="nt-plan"
            name="plan"
            defaultValue={defaults.plan}
            className={CHAMP}
          >
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Starter est réservé aux comptes gratuits du tenant Communauté.
          </p>
        </div>
        <div>
          <label htmlFor="nt-email" className={LIBELLE}>
            E-mail de l&apos;admin *
          </label>
          <input
            id="nt-email"
            name="email"
            type="email"
            required
            maxLength={254}
            defaultValue={defaults.email}
            placeholder="prenom@entreprise.fr"
            className={CHAMP}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Un compte gratuit existant sur le tenant Communauté devient
            l&apos;admin du nouveau tenant, avec sa progression.
          </p>
        </div>
        <div>
          <label htmlFor="nt-admin-name" className={LIBELLE}>
            Nom de l&apos;admin
          </label>
          <input
            id="nt-admin-name"
            name="adminName"
            maxLength={120}
            defaultValue={defaults.adminName}
            placeholder="Nicolas"
            className={CHAMP}
          />
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="revendeur"
            defaultChecked={defaults.revendeur}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Statut revendeur</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Peut créer des espaces clients en marque blanche depuis
              /admin/revendeur. Nécessite le plan Enterprise pour être actif.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="invitation"
            defaultChecked
            className="mt-1"
          />
          <span>
            <span className="font-semibold">
              Envoyer le lien de connexion à l&apos;admin
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Un lien magique valable quelques jours. Sinon, invitez-le plus
              tard depuis l&apos;onglet Admins du tenant.
            </span>
          </span>
        </label>
      </div>

      <SubmitButton />
    </form>
  );
}
