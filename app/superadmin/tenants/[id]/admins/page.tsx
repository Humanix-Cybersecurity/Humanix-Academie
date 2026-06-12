// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /superadmin/tenants/[id]/admins
//
// Console SUPERADMIN pour gerer les admins d'un tenant donne :
//   - Lister les admins NATIFS (membres du tenant avec role >= MANAGER)
//   - Lister les admins EXTERNES (via TenantMembership) - typiquement
//     d'autres SUPERADMIN Humanix qui accompagnent ce client
//   - Inviter un NOUVEAU admin natif (creation + magic link)
//   - Ajouter un admin EXTERNE (recherche par email un user existant
//     sur n'importe quel tenant, cree un TenantMembership)
//   - Retirer un membership externe
//
// Differences avec /admin/utilisateurs :
//   - Pas de RGPD masking (le SUPERADMIN a besoin de l'email complet
//     pour identifier qui il elit comme admin)
//   - Audit obligatoire de chaque action
//   - Le user externe pourra agir sur ce tenant via le sous-domaine
//     correspondant (cf. resolveTenantContext modifie pour reconnaitre
//     les memberships)
//
// Ajoute 2026-05-23 (sprint multi-tenant membership a la demande de Florian).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTenantAdmins } from "@/lib/tenant-membership";
import AddExternalAdminForm from "@/components/superadmin/AddExternalAdminForm";
import InviteNewTenantAdminForm from "@/components/superadmin/InviteNewTenantAdminForm";
import ExternalAdminRow from "@/components/superadmin/ExternalAdminRow";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, { label: string; emoji: string }> = {
  LEARNER: { label: "Apprenant", emoji: "🎓" },
  MANAGER: { label: "Manager", emoji: "👔" },
  RSSI: { label: "RSSI", emoji: "🛡️" },
  ADMIN: { label: "Admin", emoji: "⚙️" },
  SUPERADMIN: { label: "Super-Admin", emoji: "⭐" },
};

export default async function TenantAdminsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    redirect("/connexion");
  }
  const { id } = await params;

  const tenant = await db.tenant.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, plan: true, isActive: true },
  });
  if (!tenant) notFound();

  const admins = await listTenantAdmins(id);
  const natives = admins.filter((a) => a.source === "native");
  const externals = admins.filter((a) => a.source === "external");

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-1">
          <Link
            href="/superadmin/tenants"
            className="hover:text-accent-500 underline"
          >
            Tenants
          </Link>
          <span>›</span>
          <Link
            href={`/superadmin/tenants/${id}`}
            className="hover:text-accent-500 underline"
          >
            {tenant.name}
          </Link>
          <span>›</span>
          <span>Admins</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-primary-500 dark:text-accent-300">
          Admins de {tenant.name}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Gestion des admins natifs (membres du tenant) et externes (membership
          accorde par un SUPERADMIN). Les emails sont affiches en clair pour
          permettre l&apos;identification, chaque action est tracee dans le
          journal d&apos;audit.
        </p>
      </header>

      {/* === Section admins NATIFS === */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-primary-500 dark:text-accent-300">
              Admins natifs ({natives.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Membres du tenant {tenant.name} avec role &gt;= MANAGER.
            </p>
          </div>
          <Link
            href={`/superadmin/tenants/${id}/users`}
            className="text-xs text-accent-500 hover:text-accent-600 underline"
          >
            Voir tous les utilisateurs ↗
          </Link>
        </div>

        {natives.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Aucun admin natif. Utilise &laquo; Inviter un nouvel admin &raquo;
            ci-dessous pour en creer un.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {natives.map((a) => (
              <li
                key={a.userId}
                className="flex items-center justify-between py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {a.name ?? a.email.split("@")[0]}
                    {!a.isActive && (
                      <span className="ml-2 text-[10px] text-gray-500 font-normal italic">
                        (suspendu)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {a.email}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                  <span aria-hidden="true">
                    {ROLE_LABEL[a.effectiveRole].emoji}
                  </span>
                  <span>{ROLE_LABEL[a.effectiveRole].label}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === Section admins EXTERNES (memberships) === */}
      <section className="rounded-2xl border border-accent-200 dark:border-accent-900/40 bg-accent-50/40 dark:bg-accent-950/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-primary-500 dark:text-accent-300">
              Admins externes ({externals.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Users d&apos;autres tenants qui ont un acces admin a celui-ci
              via un TenantMembership.
            </p>
          </div>
        </div>

        {externals.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Aucun admin externe pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-accent-100 dark:divide-accent-900/30">
            {externals.map((a) => (
              <ExternalAdminRow
                key={a.userId}
                tenantId={id}
                entry={a}
                roleLabel={ROLE_LABEL}
              />
            ))}
          </ul>
        )}

        <div className="mt-4 pt-4 border-t border-accent-200 dark:border-accent-900/30">
          <h3 className="text-sm font-bold text-primary-500 dark:text-accent-300 mb-2">
            Ajouter un admin externe
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Le user doit deja exister sur la plateforme (n&apos;importe quel
            tenant). Si l&apos;email est inconnu, utilise &laquo; Inviter un
            nouvel admin &raquo; ci-dessous a la place.
          </p>
          <AddExternalAdminForm tenantId={id} />
        </div>
      </section>

      {/* === Section invitation NOUVEAU admin natif === */}
      <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-5">
        <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
          Inviter un nouvel admin natif
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-3">
          Cree un user dans le tenant {tenant.name} avec le role choisi et
          envoie un magic link. Le user devient membre natif du tenant.
        </p>
        <InviteNewTenantAdminForm tenantId={id} tenantName={tenant.name} />
      </section>

      {/* Notice audit */}
      <p className="text-[11px] text-gray-500 dark:text-gray-500 italic text-center">
        Chaque action (ajout / retrait / changement de role) est journalisee
        dans le journal d&apos;audit avec ton identite SUPERADMIN.
      </p>
    </div>
  );
}
