// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/audit - journal d'audit du tenant.
// Reservé aux roles ADMIN/RSSI/SUPERADMIN. Affiche les actions sensibles
// du tenant (login, gestion users, billing, RGPD).
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAuditLogs } from "@/lib/audit-query";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

const SEVERITY_CLASS: Record<string, string> = {
  INFO: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300",
  NOTICE: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  WARNING: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  CRITICAL: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const OUTCOME_CLASS: Record<string, string> = {
  SUCCESS: "text-emerald-700 dark:text-emerald-300",
  FAILURE: "text-rose-700 dark:text-rose-300",
  DENIED: "text-amber-700 dark:text-amber-300",
};

export default async function AdminAuditPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  const { items } = await listAuditLogs({ tenantId, limit: 200 });

  return (
    <>
      <AdminPageHeader
        title="Journal d'audit"
        description="Traçabilité des actions sensibles (RGPD art. 5.2 - accountability, NIS2, ISO 27001 A.12.4)."
      />

      <div className="space-y-4 min-w-0">
        <article className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-900/15 p-4">
          <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm flex items-center gap-2">
            ℹ️ À propos de ce journal
          </h3>
          <p className="text-xs text-blue-900/80 dark:text-blue-200/80 mt-2 leading-relaxed">
            Toutes les actions sensibles de votre organisation sont enregistrées
            ici (connexions, modifications de comptes, paiements, exports
            RGPD…). Les entrées sont append-only (jamais modifiées). Conservation
            recommandée 13 mois (politique CNIL).
          </p>
          <p className="text-xs text-blue-900/80 dark:text-blue-200/80 mt-2">
            <a
              href="/admin/audit/export"
              className="underline font-medium"
            >
              📥 Exporter en CSV
            </a>{" "}
            (200 dernières entrées, format compatible Excel)
          </p>
        </article>

        <AdminSection
          title={`${items.length} entrée(s) récentes`}
          description="Triées par date décroissante."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Journal d'audit des actions sensibles tracees pour conformité
                RGPD / NIS2 / ISO 27001, triees par date decroissante : date,
                severite, action, issue (succès/echec), acteur et cible
              </caption>
              <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Sév.</th>
                  <th className="px-2 py-2 font-medium">Action</th>
                  <th className="px-2 py-2 font-medium">Issue</th>
                  <th className="px-2 py-2 font-medium">Acteur</th>
                  <th className="px-2 py-2 font-medium">Cible</th>
                  <th className="px-2 py-2 font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 dark:border-slate-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-2 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300 font-mono">
                      {row.createdAt.toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SEVERITY_CLASS[row.severity]}`}
                      >
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {row.action}
                    </td>
                    <td className={`px-2 py-2 font-bold ${OUTCOME_CLASS[row.outcome]}`}>
                      {row.outcome}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {row.actorEmail ? (
                        <>
                          <span>{row.actorEmail}</span>
                          {row.actorRole && (
                            <span className="text-[10px] text-gray-500 ml-1">
                              [{row.actorRole}]
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-500 italic">système</span>
                      )}
                    </td>
                    <td className="px-2 py-2 max-w-[200px] truncate text-gray-600 dark:text-gray-300">
                      {row.targetLabel ?? row.targetId ?? "—"}
                    </td>
                    <td className="px-2 py-2 max-w-[280px] truncate text-gray-500 dark:text-gray-400">
                      {row.message ?? ""}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-8 italic text-gray-500"
                    >
                      Aucune entrée pour ce tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </>
  );
}
