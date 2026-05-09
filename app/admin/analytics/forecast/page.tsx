// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/analytics/forecast - "Le Graal" : prevoir les vulnerabilites
// avant l'incident.
//
// 3 sections :
//   1. Projection tenant a J+30 (regression lineaire sur RiskScoreSnapshot
//      des 30 derniers jours)
//   2. Top movers : 10 users en plus forte degradation + 10 en plus forte
//      amelioration, avec les composantes textuelles ("silencieux 45j",
//      "60% phishing cliques") pour expliquer le verdict.
//   3. Correlation incidents - sensibilisation : difference de riskScore
//      moyen entre les users qui ont rapporte des incidents et la
//      moyenne tenant.
//
// Non-objectif :
//   - Pas de modèle ML opaque. Regression lineaire simple, transparente.
//     L'admin doit pouvoir comprendre et challenger le calcul.
//   - Le verdict est qualitatif ("degrading"), pas un score precis.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import {
  computeIncidentCorrelation,
  computeTenantForecast,
  computeTopMovers,
  type ForecastPoint,
  type TopMover,
} from "@/lib/analytics/risk-forecast";

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

// =============================================================================
// Sous-composants
// =============================================================================

function KpiCard({
  label,
  value,
  help,
  tone = "neutral",
}: {
  label: string;
  value: string;
  help: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20"
      : tone === "bad"
        ? "border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-900/20"
        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900";
  return (
    <div className={`rounded-2xl border-2 p-4 ${toneCls}`}>
      <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>
      <p className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums">
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
        {help}
      </p>
    </div>
  );
}

/**
 * Graph SVG inline simple : x = jour, y = score (0-100). Trace l'historique
 * en bleu plein, la projection en pointille teal. Pas de lib chart.
 */
function ForecastChart({
  series,
  forecastY,
}: {
  series: ForecastPoint[];
  forecastY: number | null;
}) {
  if (series.length < 2) return null;
  const W = 600;
  const H = 180;
  const PAD = { top: 10, right: 12, bottom: 28, left: 32 };

  const baseTime = series[0].day.getTime();
  const lastTime = series[series.length - 1].day.getTime();
  const timeSpan = Math.max(1, lastTime - baseTime);

  const sx = (t: number) =>
    PAD.left +
    ((t - baseTime) / timeSpan) * (W - PAD.left - PAD.right);
  const sy = (score: number) =>
    PAD.top + ((100 - score) / 100) * (H - PAD.top - PAD.bottom);

  const history = series.filter((p) => p.type === "history");
  const forecastPoint = series.find((p) => p.type === "forecast");

  const historyPath = history
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${sx(p.day.getTime()).toFixed(1)} ${sy(p.score).toFixed(1)}`,
    )
    .join(" ");

  const forecastPath =
    forecastPoint && history.length > 0
      ? `M${sx(history[history.length - 1].day.getTime()).toFixed(1)} ${sy(history[history.length - 1].score).toFixed(1)} L${sx(forecastPoint.day.getTime()).toFixed(1)} ${sy(forecastPoint.score).toFixed(1)}`
      : "";

  // Reperes Y : 0, 25, 50, 75, 100
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[800px] text-gray-400 dark:text-gray-500"
        role="img"
        aria-label="Graphique de projection du score de risque tenant"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={sy(t)}
              y2={sy(t)}
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeDasharray="2 3"
            />
            <text
              x={PAD.left - 6}
              y={sy(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="currentColor"
            >
              {t}
            </text>
          </g>
        ))}
        {historyPath && (
          <path
            d={historyPath}
            fill="none"
            stroke="#0B3D91"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
        {forecastPath && (
          <path
            d={forecastPath}
            fill="none"
            stroke="#00A3A1"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        )}
        {forecastPoint && forecastY !== null && (
          <g>
            <circle
              cx={sx(forecastPoint.day.getTime())}
              cy={sy(forecastY)}
              r="4"
              fill="#00A3A1"
            />
            <text
              x={sx(forecastPoint.day.getTime()) - 6}
              y={sy(forecastY) - 8}
              textAnchor="end"
              fontSize="10"
              fontWeight="700"
              fill="#00A3A1"
            >
              J+30
            </text>
          </g>
        )}
        {/* Légende */}
        <g transform={`translate(${PAD.left}, ${H - 4})`}>
          <line x1="0" x2="14" y1="0" y2="0" stroke="#0B3D91" strokeWidth="2" />
          <text x="18" y="0" fontSize="10" fill="currentColor" dominantBaseline="middle">
            Historique
          </text>
          <line
            x1="80"
            x2="94"
            y1="0"
            y2="0"
            stroke="#00A3A1"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <text x="98" y="0" fontSize="10" fill="currentColor" dominantBaseline="middle">
            Projection
          </text>
        </g>
      </svg>
    </div>
  );
}

function MoverList({
  movers,
  variant,
}: {
  movers: TopMover[];
  variant: "degrading" | "improving";
}) {
  return (
    <ul className="space-y-2">
      {movers.map((m) => (
        <li
          key={m.userId}
          className={`rounded-xl border p-3 ${
            variant === "degrading"
              ? "border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-900/15"
              : "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-900/15"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                {m.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {m.email}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-lg font-extrabold tabular-nums">
                {m.riskScore}
              </p>
              <p
                className={`text-xs font-bold ${
                  variant === "degrading"
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {variant === "degrading" ? "↘" : "↗"} {m.indicator.toFixed(2)}
              </p>
            </div>
          </div>
          {m.reasons.length > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
              {m.reasons.join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function EmptyMovers({ message }: { message: string }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
      {message}
    </p>
  );
}
