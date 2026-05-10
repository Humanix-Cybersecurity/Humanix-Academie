// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/analytics/forecast - "Le Graal" : prevoir les vulnerabilites avant
// l'incident.
//
// Refonte juin 2026 (Sprint 2 bis) : decoupage des widgets visuels (KpiCard,
// ForecastChart, MoverList) dans components/admin/forecast/. La page reste
// server component qui calcule + assemble.
//
// 3 sections :
//   1. Projection tenant a J+30 (regression lineaire RiskScoreSnapshot 30j)
//   2. Top movers : 10 users en plus forte degradation + 10 en amelioration
//   3. Correlation incidents - sensibilisation (180 jours)
//
// Non-objectif :
//   - Pas de modèle ML opaque. Regression lineaire simple, transparente.
//   - Le verdict est qualitatif ("degrading"), pas un score precis.
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import {
  computeIncidentCorrelation,
  computeTenantForecast,
  computeTopMovers,
} from "@/lib/analytics/risk-forecast";
import KpiCard from "@/components/admin/forecast/KpiCard";
import ForecastChart from "@/components/admin/forecast/ForecastChart";
import MoverList, {
  EmptyMovers,
} from "@/components/admin/forecast/MoverList";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  const [forecast, movers, correlation] = await Promise.all([
    computeTenantForecast(tenantId),
    computeTopMovers(tenantId, 10),
    computeIncidentCorrelation(tenantId, 180),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon="🔮"
        title="Forecast & analyse comportementale"
        description="Projection du score de risque humain à 30 jours, détection des trajectoires individuelles (top movers), corrélation incidents ↔ sensibilisation. Pas de boîte noire : régression linéaire transparente."
      />

      {/* === 1. PROJECTION TENANT === */}
      <AdminSection
        title="Trajectoire tenant"
        description="Régression linéaire sur les 30 derniers snapshots quotidiens (RiskScoreSnapshot), projection à J+30. Indicatif — pas une garantie."
      >
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <KpiCard
            label="Score actuel"
            value={
              forecast.currentAvgScore !== null
                ? Math.round(forecast.currentAvgScore).toString()
                : "—"
            }
            help="Moyenne tenant à aujourd'hui"
          />
          <KpiCard
            label="Score projeté J+30"
            value={
              forecast.forecastAvgScore !== null
                ? Math.round(forecast.forecastAvgScore).toString()
                : "—"
            }
            help={
              forecast.slopePerDay !== null
                ? `Pente ${forecast.slopePerDay > 0 ? "+" : ""}${forecast.slopePerDay.toFixed(2)} pt/j`
                : "Pas assez d'historique"
            }
          />
          <KpiCard
            label="Verdict"
            value={
              forecast.verdict === "improving"
                ? "↗ S'améliore"
                : forecast.verdict === "degrading"
                  ? "↘ Se dégrade"
                  : forecast.verdict === "stable"
                    ? "→ Stable"
                    : "Données insuffisantes"
            }
            help={
              forecast.verdict === "insufficient_data"
                ? "Au moins 3 snapshots requis (cron risk-snapshot 1×/j)"
                : "Sur les 30 derniers jours"
            }
            tone={
              forecast.verdict === "improving"
                ? "good"
                : forecast.verdict === "degrading"
                  ? "bad"
                  : "neutral"
            }
          />
        </div>

        {forecast.series.length > 0 ? (
          <ForecastChart
            series={forecast.series}
            forecastY={forecast.forecastAvgScore}
          />
        ) : (
          <p className="text-sm text-gray-500 italic">
            Aucun snapshot disponible. Le cron <code>/api/cron/risk-snapshot</code>{" "}
            doit tourner au moins une fois par jour pour alimenter cette
            projection.
          </p>
        )}
      </AdminSection>

      {/* === 2. TOP MOVERS === */}
      <div className="grid lg:grid-cols-2 gap-4">
        <AdminSection
          title="🚨 Plus forte dégradation"
          description="Trajectoires individuelles inquiétantes. À traiter en priorité."
        >
          {movers.degrading.length === 0 ? (
            <EmptyMovers message="Aucun utilisateur en dégradation détecté. Bonne nouvelle." />
          ) : (
            <MoverList movers={movers.degrading} variant="degrading" />
          )}
        </AdminSection>

        <AdminSection
          title="🌱 Plus forte amélioration"
          description="Trajectoires positives — feedback à éventuellement valoriser."
        >
          {movers.improving.length === 0 ? (
            <EmptyMovers message="Pas encore d'amélioration significative cette période." />
          ) : (
            <MoverList movers={movers.improving} variant="improving" />
          )}
        </AdminSection>
      </div>

      {/* === 3. CORRELATION INCIDENTS - FORMATION === */}
      <AdminSection
        title="Corrélation incidents ↔ sensibilisation"
        description={`Sur les ${correlation.windowDays} derniers jours. Hypothèse : les utilisateurs bien formés détectent et rapportent davantage les incidents.`}
      >
        {correlation.incidentCount === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Aucun incident enregistré sur la période. La corrélation se
            calculera dès qu'un incident sera reporté via{" "}
            <Link href="/admin/incidents" className="underline">
              Cyber-Réflexe
            </Link>
            .
          </p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            <KpiCard
              label="Incidents analysés"
              value={correlation.incidentCount.toString()}
              help={`${correlation.windowDays} derniers jours`}
            />
            <KpiCard
              label="Score moyen tenant"
              value={
                correlation.tenantAvgScore !== null
                  ? Math.round(correlation.tenantAvgScore).toString()
                  : "—"
              }
              help="Population LEARNER + MANAGER active"
            />
            <KpiCard
              label="Δ rapporteurs vs tenant"
              value={
                correlation.scoreDelta !== null
                  ? `${correlation.scoreDelta > 0 ? "+" : ""}${correlation.scoreDelta.toFixed(1)}`
                  : "—"
              }
              help={
                correlation.scoreDelta !== null
                  ? correlation.scoreDelta > 5
                    ? "Les rapporteurs ont un meilleur score : la formation porte ses fruits."
                    : correlation.scoreDelta < -5
                      ? "Les rapporteurs ont un score plus bas — investigation utile."
                      : "Pas d'écart significatif sur cet échantillon."
                  : "Pas de rapporteurs identifiés sur la période."
              }
              tone={
                correlation.scoreDelta !== null && correlation.scoreDelta > 5
                  ? "good"
                  : correlation.scoreDelta !== null &&
                      correlation.scoreDelta < -5
                    ? "bad"
                    : "neutral"
              }
            />
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-4">
          ℹ️ Corrélation, pas causalité. À lire comme un signal directionnel.
        </p>
      </AdminSection>
    </div>
  );
}
