// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /superadmin/tenants/[id]/users
//
// Liste des utilisateurs d'un tenant, avec emails et noms MASQUES (RGPD
// art. 5.1.c minimisation). Le SUPERADMIN voit assez pour identifier en
// cas d'incident ("le user f***n@h***ix.fr a signale un probleme") mais
// pas assez pour constituer un fichier nominatif exploitable.
//
// Chaque visite est tracee dans AuditLog (action TENANT_USERS_VIEWED).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { maskEmail, maskName } from "@/lib/rgpd-mask";

export const dynamic = "force-dynamic";

export default async function TenantUsersPage({
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
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      isActive: true,
    },
  });
  if (!tenant) notFound();

  const users = await db.user.findMany({
    where: { tenantId: id },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      emailVerified: true,
      mfaEnabled: true,
      lastLoginAt: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  // Audit : tracer l'acces SUPERADMIN aux donnees utilisateurs cross-tenant
  await auditLog({
    action: AuditActions.TENANT_USERS_VIEWED,
    actor: {
      userId: session.user.id,
      email: session.user.email as string | undefined,
      role: "SUPERADMIN",
    },
    tenantId: id,
    target: { type: "tenant", id, label: tenant.name },
    message: `${users.length} users consultes (emails masques)`,
    metadata: { count: users.length },
  });

  // Compteurs par role pour le badge resume
  const byRole: Record<string, number> = {};
  for (const u of users) {
    byRole[u.role] = (byRole[u.role] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/superadmin/tenants/${id}`}
          className="text-xs text-gray-500 hover:text-accent-500"
        >
          ← Retour au tenant
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mt-2">
          Utilisateurs · {tenant.name}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {users.length} utilisateur{users.length > 1 ? "s" : ""} ·{" "}
          {Object.entries(byRole)
            .map(([role, count]) => `${count} ${role.toLowerCase()}`)
            .join(" · ")}
        </p>
      </header>

      {/* Bandeau RGPD : explique le masquage */}
      <div
        role="note"
        className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/10 p-4 text-sm text-amber-900 dark:text-amber-200"
      >
        <p className="font-bold mb-1">🔒 Affichage RGPD-aware</p>
        <p>
          Les emails et noms sont <strong>masqués</strong> (RGPD art. 5.1.c
          minimisation). Tu vois assez pour identifier en cas d&apos;incident,
          pas assez pour constituer un fichier nominatif. Cet accès est tracé
          dans le journal d&apos;audit.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-bold">
                Email
              </th>
              <th scope="col" className="px-4 py-3 text-left font-bold">
                Nom
              </th>
              <th scope="col" className="px-4 py-3 text-left font-bold">
                Rôle
              </th>
              <th scope="col" className="px-4 py-3 text-left font-bold">
                Statut
              </th>
              <th scope="col" className="px-4 py-3 text-left font-bold">
                MFA
              </th>
              <th scope="col" className="px-4 py-3 text-left font-bold">
                Dernière connexion
              </th>
              <th scope="col" className="px-4 py-3 text-left font-bold">
                Créé le
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-mono text-xs">{maskEmail(u.email)}</td>
                <td className="px-4 py-3">{maskName(u.name) || "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
                      u.role === "SUPERADMIN"
                        ? "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200"
                        : u.role === "ADMIN" || u.role === "RSSI"
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200"
                          : u.role === "MANAGER"
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="text-emerald-700 dark:text-emerald-300 text-xs">
                      ✓ actif
                    </span>
                  ) : (
                    <span className="text-rose-700 dark:text-rose-300 text-xs">
                      ✗ inactif
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {u.mfaEnabled ? "🔐" : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleDateString("fr-FR")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Aucun utilisateur dans ce tenant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
