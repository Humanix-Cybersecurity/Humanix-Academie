// SPDX-License-Identifier: AGPL-3.0-or-later
// /superadmin — vue d'ensemble cross-tenant : KPIs globaux + alertes.
import Link from "next/link";
import {
  listAllTenantsHealth,
  computeGlobalKpis,
} from "@/lib/tenant-health";

export const dynamic = "force-dynamic";

export default async function SuperadminHomePage() {
  const healths = await listAllTenantsHealth();
  const kpis = computeGlobalKpis(healths);

  // Top 5 alertes : tenants en signal=error, tries par anciennete d'inactivite
  const alerts = healths
    .filter((h) => h.signal === "error")
    .sort((a, b) => (b.lastActivityDays ?? 9999) - (a.lastActivityDays ?? 9999))
    .slice(0, 5);

  // Alertes "premiere journee" : tenants crees dans les 7 derniers jours qui
  // n'ont pas demarre (aucun user supplementaire, aucune progression).
  // Cible le moment ou un commercial / customer success doit appeler.
  const ms7 = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const newWithoutStart = healths.filter(
    (h) =>
      now - h.createdAt.getTime() <= ms7 &&
      h.totalUsers <= 1 &&
      !h.hasProgress,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          Cross-tenant
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Vue d'ensemble plate-forme
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          État de santé global de tous les tenants Humanix Académie.
        </p>
      </header>

      {/* KPIs principaux */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Tenants" value={kpis.totalTenants} />
        <Kpi
          label="Nouveaux 7 jours"
          value={kpis.newTenantsLast7d}
          accent={kpis.newTenantsLast7d > 0 ? "emerald" : undefined}
        />
        <Kpi
          label="Utilisateurs total"
          value={kpis.totalUsers}
        />
        <Kpi
          label="Utilisateurs actifs"
          value={kpis.totalActiveUsers}
          accent="emerald"
        />
      </section>

      {/* Repartition par plan */}
      <section>
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-3">
          Répartition par plan
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
          {Object.entries(kpis.byPlan).map(([plan, count]) => (
            <div
              key={plan}
              className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
            >
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                {plan}
              </p>
              <p className="text-2xl font-extrabold tabular-nums">{count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sante globale */}
      <section>
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-3">
          Santé globale
        </h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <SignalCard
            label="OK"
            value={kpis.bySignal.ok}
            color="emerald"
          />
          <SignalCard
            label="À surveiller"
            value={kpis.bySignal.warn}
            color="amber"
          />
          <SignalCard
            label="En alerte"
            value={kpis.bySignal.error}
            color="rose"
          />
        </div>
      </section>

      {/* Nouveaux tenants à activer */}
      {newWithoutStart.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-3 flex items-center gap-2">
            🚀 À activer (signups récents sans démarrage)
          </h2>
          <ul className="space-y-2">
            {newWithoutStart.slice(0, 8).map((h) => (
              <li
                key={h.tenantId}
                className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/15 p-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <Link
                      href={`/superadmin/tenants/${h.tenantId}`}
                      className="font-bold text-amber-900 dark:text-amber-200 hover:underline"
                    >
                      {h.tenantName}
                    </Link>
                    <p className="text-[10px] uppercase tracking-widest text-amber-700 dark:text-amber-300 font-bold mt-1">
                      {h.plan} · créé{" "}
                      {Math.max(
                        0,
                        Math.floor(
                          (Date.now() - h.createdAt.getTime()) /
                            (24 * 3600 * 1000),
                        ),
                      )}{" "}
                      j · {h.totalUsers} user(s)
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-900 dark:text-amber-200 mt-2">
                  💡 Bon moment pour un appel de bienvenue / aide à la
                  prise en main.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Top 5 alertes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-primary-500 dark:text-accent-300">
            Top 5 alertes
          </h2>
          <Link
            href="/superadmin/tenants?signal=error"
            className="text-sm text-accent-700 hover:underline"
          >
            Voir tous →
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm italic text-gray-500 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4">
            ✓ Aucun tenant en alerte. Tout va bien.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((h) => (
              <li
                key={h.tenantId}
                className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-900/15 p-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <Link
                      href={`/superadmin/tenants/${h.tenantId}`}
                      className="font-bold text-rose-900 dark:text-rose-200 hover:underline"
                    >
                      {h.tenantName}
                    </Link>
                    <p className="text-[10px] uppercase tracking-widest text-rose-700 dark:text-rose-300 font-bold mt-1">
                      {h.plan} · {h.totalUsers} user(s)
                    </p>
                  </div>
                </div>
                <ul className="mt-2 text-xs text-rose-900 dark:text-rose-200 space-y-0.5">
                  {h.issues.slice(0, 3).map((iss, idx) => (
                    <li key={idx}>• {iss}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
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
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
        {label}
      </p>
      <p
        className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums ${accentClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function SignalCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber" | "rose";
}) {
  const cls =
    color === "emerald"
      ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200"
      : color === "amber"
        ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200"
        : "border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">
        {label}
      </p>
      <p className="text-3xl font-extrabold mt-1 tabular-nums">{value}</p>
    </div>
  );
}
