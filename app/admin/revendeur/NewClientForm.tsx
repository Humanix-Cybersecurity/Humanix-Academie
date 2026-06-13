// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-sm" disabled={pending}>
      {pending ? "Création…" : "Créer le client"}
    </button>
  );
}

export default function NewClientForm({
  rootDomain,
  resellerName,
}: {
  rootDomain: string;
  resellerName: string;
}) {
  const [showBrand, setShowBrand] = useState(false);

  return (
    <form action={createClient} className="space-y-5">
      {/* Identité */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="rc-name"
            className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1"
          >
            Nom du client *
          </label>
          <input
            id="rc-name"
            name="name"
            required
            maxLength={120}
            placeholder="ACME Industries"
            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="rc-plan"
            className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1"
          >
            Plan
          </label>
          <select
            id="rc-plan"
            name="plan"
            defaultValue="pro"
            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Admin client */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="rc-admin-email"
            className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1"
          >
            Email administrateur
          </label>
          <input
            id="rc-admin-email"
            name="adminEmail"
            type="email"
            placeholder="admin@acme.fr"
            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Reçoit un lien d&apos;activation. Laissez vide pour inviter plus tard.
          </p>
        </div>
        <div>
          <label
            htmlFor="rc-admin-name"
            className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1"
          >
            Nom de l&apos;administrateur
          </label>
          <input
            id="rc-admin-name"
            name="adminName"
            maxLength={120}
            placeholder="Marie Dupont"
            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Marque blanche (repliée par défaut) */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-800 p-4">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={showBrand}
            onChange={(e) => setShowBrand(e.target.checked)}
            className="h-4 w-4"
          />
          Personnaliser la marque de ce client
        </label>
        {!showBrand && (
          <p className="mt-2 text-xs text-gray-500">
            Sinon, le client hérite automatiquement de la marque de{" "}
            <strong>{resellerName}</strong>.
          </p>
        )}

        {showBrand && (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="rc-subdomain"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1"
              >
                Sous-domaine
              </label>
              <div className="flex items-center">
                <input
                  id="rc-subdomain"
                  name="subdomain"
                  pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
                  placeholder="acme"
                  className="w-40 rounded-l-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
                />
                <span className="rounded-r-lg border border-l-0 border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-sm text-gray-500 font-mono">
                  .{rootDomain}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="rc-brand-name"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1"
              >
                Nom de marque
              </label>
              <input
                id="rc-brand-name"
                name="brandName"
                maxLength={120}
                placeholder="ACME Académie"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="rc-primary"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1"
                >
                  Couleur primaire
                </label>
                <input
                  id="rc-primary"
                  name="primaryColor"
                  type="color"
                  defaultValue="#0B3D91"
                  className="h-10 w-20 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label
                  htmlFor="rc-accent"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1"
                >
                  Couleur d&apos;accent
                </label>
                <input
                  id="rc-accent"
                  name="accentColor"
                  type="color"
                  defaultValue="#00A3A1"
                  className="h-10 w-20 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Le logo se règle ensuite depuis la fiche du client.
            </p>
          </div>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
