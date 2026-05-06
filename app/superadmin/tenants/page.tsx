// SPDX-License-Identifier: AGPL-3.0-or-later
// /superadmin/tenants - liste detaillee de tous les tenants avec leur sante.
import Link from "next/link";
import { listAllTenantsHealth, type TenantHealth } from "@/lib/tenant-health";

export const dynamic = "force-dynamic";

const SIGNAL_LABEL: Record<TenantHealth["signal"], string> = {
  ok: "OK",
  warn: "À surveiller",
  error: "En alerte",
};

const SIGNAL_CLASS: Record<TenantHealth["signal"], string> = {
  ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  error: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default async function SuperadminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ signal?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const allHealths = await listAllTenantsHealth();

  const signalFilter = params.signal;
  const planFilter = params.plan;
  const filtered = allHealths.filter((h) => {
    if (signalFilter && h.signal !== signalFilter) return false;
    if (planFilter && h.plan !== planFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          Cross-tenant
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Tous les tenants
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          {filtered.length} sur {allHealths.length} tenants{signalFilter || planFilter ? " (filtré)" : ""}.
        </p>
      </header>

      <FilterBar
        signal={signalFilter}
        plan={planFilter}
        all={allHealths.length}
        bySignal={{
          ok: allHealths.filter((h) => h.signal === "ok").length,
          warn: allHealths.filter((h) => h.signal === "warn").length,
          error: allHealths.filter((h) => h.signal === "error").length,
        }}
      />

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">
                Plan
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">
                Users (actifs)
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">
                Admins
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">
                Sécurité
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">
                Activité
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">
                Santé
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr
                key={h.tenantId}
                className="border-b border-gray-100 dark:border-slate-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-slate-800/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/superadmin/tenants/${h.tenantId}`}
                    className="font-semibold text-gray-900 dark:text-gray-100 hover:text-accent-500"
                  >
                    {h.tenantName}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {h.tenantSlug} · créé {h.createdAt.toLocaleDateString("fr-FR")}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full">
                    {h.plan}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {h.activeUsers} / {h.totalUsers}
                </td>
                <td className="px-4 py-3 tabular-nums">{h.adminCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <Pill ok={h.adminVerified} label="email" />
                    <Pill ok={h.admin2FA} label="2FA" />
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                  {formatActivity(h.lastActivityDays)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${SIGNAL_CLASS[h.signal]}`}
                  >
                    {SIGNAL_LABEL[h.signal]}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-gray-400 italic"
                >
                  Aucun tenant ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterBar({
  signal,
  plan,
  all,
  bySignal,
}: {
  signal: string | undefined;
  plan: string | undefined;
  all: number;
  bySignal: { ok: number; warn: number; error: number };
}) {
  const filterUrl = (s?: string, p?: string) => {
    const qs = new URLSearchParams();
    if (s) qs.set("signal", s);
    if (p) qs.set("plan", p);
    const str = qs.toString();
    return str ? `?${str}` : "/superadmin/tenants";
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-gray-500 mr-2">Filtres :</span>
      <FilterChip
        href={filterUrl(undefined, plan)}
        active={!signal}
        label={`Tous (${all})`}
      />
      <FilterChip
        href={filterUrl("error", plan)}
        active={signal === "error"}
        label={`Alerte (${bySignal.error})`}
        color="rose"
      />
      <FilterChip
        href={filterUrl("warn", plan)}
        active={signal === "warn"}
        label={`À surveiller (${bySignal.warn})`}
        color="amber"
      />
      <FilterChip
        href={filterUrl("ok", plan)}
        active={signal === "ok"}
        label={`OK (${bySignal.ok})`}
        color="emerald"
      />
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color?: "emerald" | "amber" | "rose";
}) {
  const colorClass = active
    ? color === "emerald"
      ? "bg-emerald-500 text-white"
      : color === "amber"
        ? "bg-amber-500 text-white"
        : color === "rose"
          ? "bg-rose-500 text-white"
          : "bg-primary-500 text-white"
    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700";
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-full font-medium ${colorClass}`}
    >
      {label}
    </Link>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded font-bold ${
        ok
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function formatActivity(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an(s)`;
}
