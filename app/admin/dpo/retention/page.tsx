// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/dpo/retention - configuration de la rétention automatique des
// données personnelles (RGPD art. 5.1.e).
//
// Sert aux ADMIN / RSSI / SUPERADMIN à :
//   - Définir Tenant.dataRetentionDays (30 - 3650 jours, ou désactivé).
//   - Visualiser ce qui SERAIT purgé au prochain run (preview).
//   - Lancer une purge immédiate (bouton "Exécuter maintenant").
//   - Lire l'historique des purges récentes (AuditLog).
//
// Le cron quotidien /api/cron/data-retention-purge applique automatiquement
// la même logique sur tous les tenants ayant dataRetentionDays != null.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import {
  previewPurge,
  RETENTION_MAX_DAYS,
  RETENTION_MIN_DAYS,
  RETENTION_RECOMMENDED_DAYS,
} from "@/lib/data-retention";
import { saveRetentionConfig, runPurgeNow } from "./actions";

export const dynamic = "force-dynamic";

export default async function RetentionPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  const [tenant, preview, recentPurges] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        dataRetentionDays: true,
        dataRetentionLastRunAt: true,
      },
    }),
    previewPurge(tenantId),
    db.auditLog.findMany({
      where: { tenantId, action: "DATA_RETENTION_PURGED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        createdAt: true,
        actorEmail: true,
        message: true,
        metadata: true,
      },
    }),
  ]);

  const enabled = tenant?.dataRetentionDays != null;
  const currentValue = tenant?.dataRetentionDays ?? "";
  const lastRun = tenant?.dataRetentionLastRunAt;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/dpo"
        className="text-xs uppercase tracking-widest font-bold text-accent-500 hover:underline inline-block"
      >
        ← Espace DPO
      </Link>
      <AdminPageHeader
        icon="🗓"
        title="Rétention des données"
        description="Limitation de conservation RGPD (article 5.1.e). Configure pendant combien de temps les données personnelles sont gardées avant anonymisation / purge."
      />

      {/* === Statut === */}
      <AdminSection title="Statut">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`text-xs uppercase tracking-widest font-extrabold px-3 py-1 rounded-full ${
              enabled
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {enabled
              ? `Activée · ${tenant?.dataRetentionDays} jours`
              : "Désactivée"}
          </span>
          {lastRun && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Dernier passage :{" "}
              <strong className="text-gray-700 dark:text-gray-200">
                {lastRun.toLocaleString("fr-FR")}
              </strong>
            </span>
          )}
        </div>
      </AdminSection>

      {/* === Configuration === */}
      <AdminSection
        title="Configuration"
        description={`Saisis une durée entre ${RETENTION_MIN_DAYS} et ${RETENTION_MAX_DAYS} jours. Recommandé pour la formation cyber B2B : ${RETENTION_RECOMMENDED_DAYS} jours (2 ans). Vide ou 0 pour désactiver la purge automatique.`}
      >
        <form action={saveRetentionConfig} className="space-y-3 max-w-md">
          <div>
            <label
              htmlFor="retentionDays"
              className="block text-sm font-bold mb-1 text-gray-800 dark:text-gray-100"
            >
              Durée de rétention (jours)
            </label>
            <input
              id="retentionDays"
              name="retentionDays"
              type="number"
              min={RETENTION_MIN_DAYS}
              max={RETENTION_MAX_DAYS}
              defaultValue={currentValue}
              placeholder={`Ex : ${RETENTION_RECOMMENDED_DAYS}`}
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm focus:border-accent-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Au-delà de cette durée, les utilisateurs inactifs sont
              anonymisés et les events / audit logs non-critiques supprimés.
            </p>
          </div>
          <button type="submit" className="btn-primary text-sm">
            Enregistrer
          </button>
        </form>
      </AdminSection>

      {/* === Preview === */}
      <AdminSection
        title="Preview du prochain run"
        description={
          enabled
            ? `Snapshot de ce qui serait purgé maintenant (cutoff : ${preview.cutoff.toLocaleString("fr-FR")}).`
            : "Active la rétention ci-dessus pour voir un preview."
        }
      >
        <div className="grid sm:grid-cols-3 gap-3">
          <PreviewCard
            label="Événements telemetry"
            value={preview.eventsToDelete}
            help="DELETE > seuil (perte non recoverable)"
            disabled={!enabled}
          />
          <PreviewCard
            label="Logs d'audit"
            value={preview.auditLogsToDelete}
            help="DELETE hors actions critiques (TENANT_*, BILLING_*, USER_DELETED, etc. conservées)"
            disabled={!enabled}
          />
          <PreviewCard
            label="Utilisateurs à anonymiser"
            value={preview.usersToAnonymize}
            help="Email/nom/IP vidés, ID conservé pour intégrité FK"
            disabled={!enabled}
          />
        </div>

        {enabled && (
          <form action={runPurgeNow} className="mt-5">
            <button
              type="submit"
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              <span aria-hidden="true">▶</span>
              <span>Exécuter la purge maintenant</span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ⚠️ Action irréversible. Le cron quotidien fait la même chose
              automatiquement, ce bouton sert au déclenchement immédiat.
            </p>
          </form>
        )}
      </AdminSection>

      {/* === Historique === */}
      <AdminSection
        title="Historique des purges"
        description="10 dernières exécutions (manuelles + cron)."
      >
        {recentPurges.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Aucune purge enregistrée pour ce tenant.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Origine</th>
                  <th className="py-2 pr-3">Events</th>
                  <th className="py-2 pr-3">Audit logs</th>
                  <th className="py-2">Users anonymisés</th>
                </tr>
              </thead>
              <tbody>
                {recentPurges.map((p, i) => {
                  const meta =
                    (p.metadata as Record<string, unknown> | null) ?? null;
                  const events = (meta?.eventsDeleted as number) ?? 0;
                  const audit = (meta?.auditLogsDeleted as number) ?? 0;
                  const users = (meta?.usersAnonymized as number) ?? 0;
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-100 dark:border-slate-800/50"
                    >
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {p.createdAt.toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500 dark:text-gray-400">
                        {p.actorEmail?.startsWith("system:")
                          ? "Cron"
                          : "Manuel"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{events}</td>
                      <td className="py-2 pr-3 tabular-nums">{audit}</td>
                      <td className="py-2 tabular-nums">{users}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        ℹ️ Les purges sont tracées dans le{" "}
        <Link href="/admin/audit" className="underline">
          journal d'audit
        </Link>{" "}
        (action <code>DATA_RETENTION_PURGED</code>).
      </p>
    </div>
  );
}

function PreviewCard({
  label,
  value,
  help,
  disabled,
}: {
  label: string;
  value: number;
  help: string;
  disabled: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 ${
        disabled
          ? "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 opacity-60"
          : value > 0
            ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20"
            : "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-900/20"
      }`}
    >
      <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>
      <p className="font-display text-3xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums">
        {disabled ? "—" : value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
        {help}
      </p>
    </div>
  );
}
