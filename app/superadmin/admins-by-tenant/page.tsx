// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /superadmin/admins-by-tenant - Inventaire des comptes a privileges.
//
// Couvre la mesure 7 du guide d'hygiene informatique ANSSI v2 :
// "Disposer d'un inventaire exhaustif des comptes privilegies et le maintenir
// a jour".
//
// Page volontairement publique cote console SUPERADMIN (audit interne, revue
// annuelle obligatoire). Export CSV pour transmission a un auditeur externe
// (ex: ANSSI, expert-comptable, RSSI client externe).

import Link from "next/link";
import {
  listPrivilegedAccounts,
  groupByTenant,
  detectDormantAccounts,
} from "@/lib/anssi/admins-inventory";

export const dynamic = "force-dynamic";

const ROLE_BADGE: Record<string, string> = {
  SUPERADMIN:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  ADMIN:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  RSSI:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export default async function SuperadminAdminsByTenantPage() {
  const accounts = await listPrivilegedAccounts();
  const byTenant = groupByTenant(accounts);
  const dormant = detectDormantAccounts(accounts);
  const dormantIds = new Set(dormant.map((a) => `${a.tenantId}:${a.userId}`));

  const stats = {
    totalAccounts: accounts.length,
    totalTenants: byTenant.length,
    bySource: {
      native: accounts.filter((a) => a.source === "native").length,
      membership: accounts.filter((a) => a.source === "membership").length,
    },
    byRole: {
      SUPERADMIN: accounts.filter((a) => a.effectiveRole === "SUPERADMIN").length,
      ADMIN: accounts.filter((a) => a.effectiveRole === "ADMIN").length,
      RSSI: accounts.filter((a) => a.effectiveRole === "RSSI").length,
    },
    mfaEnabled: accounts.filter((a) => a.mfaEnabled).length,
    webauthnEnrolled: accounts.filter((a) => a.hasWebAuthn).length,
    dormant: dormant.length,
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          ANSSI HG · Mesure 7
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Inventaire des comptes à privilèges
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-3xl">
          Inventaire exhaustif et tenu à jour de tous les comptes ADMIN, RSSI
          et SUPERADMIN de la plateforme, sources confondues (rôle natif +
          memberships croisées). Conforme à la mesure 7 du guide d'hygiène
          informatique ANSSI v2.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href="/superadmin/admins-by-tenant/export.csv"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600"
          >
            ⬇ Exporter CSV (audit annuel)
          </Link>
          <Link
            href="/superadmin/tenants"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200"
          >
            ← Tenants
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Comptes" value={stats.totalAccounts} />
        <Kpi label="Tenants couverts" value={stats.totalTenants} />
        <Kpi label="SUPERADMIN" value={stats.byRole.SUPERADMIN} accent="rose" />
        <Kpi label="ADMIN" value={stats.byRole.ADMIN} accent="amber" />
        <Kpi label="RSSI" value={stats.byRole.RSSI} />
        <Kpi
          label="Dormants à risque"
          value={stats.dormant}
          accent={stats.dormant > 0 ? "rose" : "emerald"}
        />
      </section>

      {/* Hygiene securite */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HygieneCard
          label="MFA actif"
          current={stats.mfaEnabled}
          total={stats.totalAccounts}
          thresholdGood={1.0}
          thresholdWarn={0.8}
        />
        <HygieneCard
          label="WebAuthn enrôlé"
          current={stats.webauthnEnrolled}
          total={stats.totalAccounts}
          thresholdGood={0.5}
          thresholdWarn={0.25}
        />
        <HygieneCard
          label="Memberships croisées"
          current={stats.bySource.membership}
          total={stats.totalAccounts}
          // Pas de seuil good/warn : c'est informatif (typiquement les
          // SUPERADMIN Humanix qui accompagnent des tenants clients).
          thresholdGood={1.1}
          thresholdWarn={1.1}
          informational
        />
      </section>

      {/* Alerte dormants */}
      {dormant.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-rose-700 dark:text-rose-300 mb-3 flex items-center gap-2">
            ⚠ Comptes à risque - revue immédiate recommandée
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Critères : MFA désactivé + email non vérifié, OU jamais connecté
            depuis 90 jours, OU dernier login &gt; 180 jours.
          </p>
          <ul className="space-y-2">
            {dormant.slice(0, 10).map((a) => (
              <li
                key={`${a.tenantId}:${a.userId}`}
                className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-900/15 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-rose-900 dark:text-rose-200">
                    {a.email}
                  </span>
                  <RoleBadge role={a.effectiveRole} />
                  <span className="text-xs text-rose-700 dark:text-rose-300">
                    @ {a.tenantName}
                  </span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-200 mt-1">
                  {!a.mfaEnabled && "MFA OFF · "}
                  {!a.emailVerified && "email non vérifié · "}
                  {a.lastLoginAt === null
                    ? `jamais connecté (créé ${daysAgo(a.grantedAt)})`
                    : `dernier login ${daysAgo(a.lastLoginAt)}`}
                </p>
              </li>
            ))}
          </ul>
          {dormant.length > 10 && (
            <p className="text-xs text-gray-500 italic mt-2">
              … et {dormant.length - 10} autre(s). Voir export CSV pour la
              liste complète.
            </p>
          )}
        </section>
      )}

      {/* Inventaire par tenant */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300">
          Inventaire par tenant
        </h2>
        {byTenant.map((group) => (
          <div
            key={group.tenantId}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <Link
                  href={`/superadmin/tenants/${group.tenantId}`}
                  className="font-display font-bold text-primary-500 dark:text-accent-300 hover:underline"
                >
                  {group.tenantName}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">
                  {group.tenantSlug} · {group.accounts.length} compte
                  {group.accounts.length > 1 ? "s" : ""} à privilèges
                </p>
              </div>
              <Link
                href={`/superadmin/tenants/${group.tenantId}/admins`}
                className="text-xs text-accent-700 hover:underline"
              >
                Gérer →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800/60">
                  <tr>
                    <th className="px-4 py-2 font-medium">Utilisateur</th>
                    <th className="px-4 py-2 font-medium">Rôle</th>
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="px-4 py-2 font-medium">Sécurité</th>
                    <th className="px-4 py-2 font-medium">Activité</th>
                    <th className="px-4 py-2 font-medium">Attribué</th>
                  </tr>
                </thead>
                <tbody>
                  {group.accounts.map((a) => {
                    const isDormant = dormantIds.has(
                      `${a.tenantId}:${a.userId}`,
                    );
                    return (
                      <tr
                        key={`${a.tenantId}:${a.userId}`}
                        className={`border-b border-gray-50 dark:border-slate-800/30 last:border-0 ${
                          isDormant
                            ? "bg-rose-50/40 dark:bg-rose-900/10"
                            : "hover:bg-gray-50/60 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-semibold">{a.email}</div>
                          {a.name && (
                            <div className="text-xs text-gray-500">
                              {a.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <RoleBadge role={a.effectiveRole} />
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                              a.source === "native"
                                ? "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                                : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {a.source === "native"
                              ? "natif"
                              : "membership"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            <Pill ok={a.mfaEnabled} label="MFA" />
                            <Pill ok={a.hasWebAuthn} label="WebAuthn" />
                            <Pill ok={a.emailVerified} label="email" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                          {a.lastLoginAt
                            ? daysAgo(a.lastLoginAt)
                            : "jamais"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                          {a.grantedAt.toLocaleDateString("fr-FR")}
                          {a.grantedByEmail && (
                            <div className="text-[10px] text-gray-500">
                              par {a.grantedByEmail}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {byTenant.length === 0 && (
          <p className="text-sm italic text-gray-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
            Aucun compte à privilèges détecté. Vérifie le seeding.
          </p>
        )}
      </section>

      {/* Note conformite */}
      <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/15 p-5">
        <h3 className="font-display font-bold text-emerald-900 dark:text-emerald-200 mb-2">
          📋 Conformité ANSSI HG mesure 7
        </h3>
        <ul className="text-sm text-emerald-900 dark:text-emerald-200 space-y-1.5">
          <li>
            ✓ Inventaire <strong>exhaustif</strong> : tous les comptes ADMIN /
            RSSI / SUPERADMIN, sources confondues (rôle natif + memberships).
          </li>
          <li>
            ✓ <strong>Maintenu à jour</strong> en temps réel : la page reflète
            l'état courant de la BDD (force-dynamic).
          </li>
          <li>
            ✓ <strong>Traçable</strong> : chaque attribution est auditée
            (table Event, événement <code>USER_ROLE_CHANGED</code>).
          </li>
          <li>
            ✓ <strong>Exportable</strong> CSV pour revue annuelle (mesure 38
            ANSSI HG : audits réguliers).
          </li>
          <li>
            ✓ <strong>Détection dormants</strong> : alertes proactives sur
            comptes inactifs &gt; 90 j ou sans MFA.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber" | "rose";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : accent === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : "text-gray-900 dark:text-gray-100";
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
        {label}
      </p>
      <p className={`text-2xl font-extrabold mt-1 tabular-nums ${accentClass}`}>
        {value}
      </p>
    </div>
  );
}

function HygieneCard({
  label,
  current,
  total,
  thresholdGood,
  thresholdWarn,
  informational = false,
}: {
  label: string;
  current: number;
  total: number;
  thresholdGood: number;
  thresholdWarn: number;
  informational?: boolean;
}) {
  const ratio = total === 0 ? 0 : current / total;
  const color = informational
    ? "blue"
    : ratio >= thresholdGood
      ? "emerald"
      : ratio >= thresholdWarn
        ? "amber"
        : "rose";
  const cls =
    color === "emerald"
      ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200"
      : color === "amber"
        ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200"
        : color === "rose"
          ? "border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200"
          : "border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">
        {label}
      </p>
      <p className="text-2xl font-extrabold mt-1 tabular-nums">
        {current}/{total}
        <span className="text-sm font-medium opacity-60 ml-2">
          ({total === 0 ? "-" : Math.round(ratio * 100)}%)
        </span>
      </p>
    </div>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded font-bold ${
        ok
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
      }`}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    ROLE_BADGE[role] ?? "bg-gray-100 dark:bg-slate-800 text-gray-700";
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${cls}`}
    >
      {role}
    </span>
  );
}

function daysAgo(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an(s)`;
}
