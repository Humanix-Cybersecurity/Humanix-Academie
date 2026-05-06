// SPDX-License-Identifier: AGPL-3.0-or-later
// /superadmin/tenants/[id] — fiche detaillee d'un tenant.
// Sert au support / commercial pour diagnostiquer rapidement un client.
import Link from "next/link";
import { notFound } from "next/navigation";
import { computeTenantHealth } from "@/lib/tenant-health";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const SIGNAL_BG: Record<string, string> = {
  ok: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200",
  warn: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200",
  error: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200",
};

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const health = await computeTenantHealth(id);
  if (!health) notFound();

  // Liste des admins du tenant pour le support (qui contacter)
  const admins = await db.user.findMany({
    where: {
      tenantId: id,
      role: { in: ["ADMIN", "RSSI", "SUPERADMIN"] },
    },
    orderBy: { createdAt: "asc" },
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
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/superadmin/tenants"
            className="text-xs text-gray-500 hover:text-accent-500"
          >
            ← Tous les tenants
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mt-2">
            {health.tenantName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            <span className="font-mono">{health.tenantSlug}</span> · plan{" "}
            <span className="font-bold">{health.plan}</span> · créé le{" "}
            {health.createdAt.toLocaleDateString("fr-FR")}
          </p>
        </div>
      </header>

      {/* Bandeau signal */}
      <div className={`rounded-2xl border-2 p-4 ${SIGNAL_BG[health.signal]}`}>
        <p className="font-bold flex items-center gap-2">
          {health.signal === "ok" && "✓"}
          {health.signal === "warn" && "⚠"}
          {health.signal === "error" && "✗"}
          {health.signal === "ok" && " Tenant en bonne santé"}
          {health.signal === "warn" && " Points de vigilance"}
          {health.signal === "error" && " Tenant en alerte"}
        </p>
        {health.issues.length > 0 && (
          <ul className="mt-2 text-sm space-y-0.5">
            {health.issues.map((iss, idx) => (
              <li key={idx}>• {iss}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Indicateurs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat
          title="Utilisateurs"
          value={`${health.activeUsers} actifs / ${health.totalUsers} total`}
        />
        <Stat title="Administrateurs" value={`${health.adminCount}`} />
        <Stat title="Groupes définis" value={`${health.groupCount}`} />
        <Check label="Au moins 1 admin actif" ok={health.adminActif} />
        <Check label="Email admin vérifié" ok={health.adminVerified} />
        <Check label="2FA admin activée" ok={health.admin2FA} />
        <Check label="Au moins 1 user actif" ok={health.hasUsers} />
        <Check
          label="Au moins 1 progression terminée"
          ok={health.hasProgress}
        />
        <Check
          label="Aucun mismatch de plan"
          ok={health.planMismatches.length === 0}
        />
      </section>

      {/* Administrateurs du tenant */}
      <section>
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-3">
          Administrateurs du tenant
        </h2>
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2 text-xs">Email / Nom</th>
                <th className="px-4 py-2 text-xs">Rôle</th>
                <th className="px-4 py-2 text-xs">Email vérifié</th>
                <th className="px-4 py-2 text-xs">2FA</th>
                <th className="px-4 py-2 text-xs">Statut</th>
                <th className="px-4 py-2 text-xs">Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-gray-100 dark:border-slate-800/60 last:border-0"
                >
                  <td className="px-4 py-2">
                    <p className="font-semibold">{a.name ?? a.email.split("@")[0]}</p>
                    <p className="text-xs text-gray-500">{a.email}</p>
                  </td>
                  <td className="px-4 py-2 text-xs">{a.role}</td>
                  <td className="px-4 py-2">
                    {a.emailVerified ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {a.mfaEnabled ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {a.isActive ? "actif" : "suspendu"}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {a.lastLoginAt
                      ? a.lastLoginAt.toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 italic text-rose-700 dark:text-rose-300">
                    Aucun administrateur. Le tenant est inutilisable en l'état.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
        {title}
      </p>
      <p className="text-xl font-extrabold mt-1">{value}</p>
    </div>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 ${
        ok
          ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/15"
          : "border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-900/15"
      }`}
    >
      <span className="text-2xl">{ok ? "✓" : "✗"}</span>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
