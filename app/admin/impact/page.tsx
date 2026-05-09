// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/impact - Tableau de bord des benefices observes.
//
// Complementaire de /admin/business (exposition financiere). Ici on
// montre ce que la plateforme a fait EVOLUER concretement chez le
// tenant. Pour les DSI / RSSI / C-level qui aiment les KPIs.
//
// 4 sections :
//   1. Adoption (sieges actives, weekly active, streak, cadence)
//   2. Apprentissage (modules, heures, quiz, delta novices vs engagés)
//   3. Couverture critique (% par saison strategique)
//   4. Rythme actuel (30 derniers jours)
//
// Auth gate : ADMIN, RSSI, MANAGER, SUPERADMIN.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { computeImpactKpis } from "@/lib/impact-kpis";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImpactKpisView from "@/components/admin/ImpactKpisView";
import RiskTimeseriesChart from "@/components/admin/RiskTimeseriesChart";

export const dynamic = "force-dynamic";

export default async function AdminImpactPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (
    role !== "ADMIN" &&
    role !== "RSSI" &&
    role !== "MANAGER" &&
    role !== "SUPERADMIN"
  ) {
    redirect("/admin");
  }

  const tenantId = session.user.tenantId as string;
  const kpis = await computeImpactKpis(tenantId);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Impact mesuré"
        description="Ce que la plateforme a fait évoluer dans ton organisation. Chiffres réels, pas projections."
        icon="📈"
        actions={
          <Link
            href="/admin/business"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition text-sm font-medium"
          >
            <span aria-hidden="true">💰</span>
            Voir l'impact financier
          </Link>
        }
      />

      <ImpactKpisView kpis={kpis} />

      {/* Évolution du score humain agrégé sur 90 jours.
          Lit la table RiskScoreSnapshot remplie chaque nuit par
          /api/cron/risk-snapshot. Affiche moyenne + p10 + p90 pour avoir
          la dispersion (et pas juste la moyenne qui peut masquer un gros
          écart entre top et queue). */}
      <RiskTimeseriesChart days={90} />
    </div>
  );
}
