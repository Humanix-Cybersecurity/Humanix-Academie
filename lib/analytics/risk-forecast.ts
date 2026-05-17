// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Forecast du score de risque tenant + corrélation incidents.
// -----------------------------------------------------------------------------
// On utilise la timeseries quotidienne RiskScoreSnapshot pour projeter une
// trajectoire à 30 jours. Régression linéaire simple (méthode des moindres
// carrés) sur les 30 derniers points.
//
// IMPORTANT : c'est une PROJECTION LINÉAIRE, pas un modèle ML. Suffisant
// pour le signal "ça va dans le bon sens / mauvais sens" mais à
// communiquer comme tel à l'admin (cf. UI : "extrapolation linéaire,
// pas de garantie"). On évite l'effet boîte noire et on garde la
// transparence (philosophie projet).
//
// Pour la corrélation incidents ↔ formation, on compare les riskScore
// moyens des reportedById (ceux qui ont alerté = comportement souhaité)
// vs le tenant. Si reportedBy moyen > tenant moyen, signal "les bien
// formés sont ceux qui rapportent".

// Lectures pures pour les forecasts : on passe par le client read-only.
// Si DATABASE_URL_READONLY n'est pas configure, dbReadOnly fallback sur
// le client principal (cf. lib/db-readonly.ts). Zero regression possible.
import { dbReadOnly as db } from "@/lib/db-readonly";
import { computeUserTrend } from "@/lib/analytics/risk-trend";

const HISTORY_WINDOW_DAYS = 30;
const FORECAST_HORIZON_DAYS = 30;

export type ForecastPoint = {
  day: Date;
  score: number;
  type: "history" | "forecast";
};

export type TenantForecast = {
  /** Score moyen actuel (dernière snapshot). */
  currentAvgScore: number | null;
  /** Score projeté à H+30j. null si pas assez d'historique. */
  forecastAvgScore: number | null;
  /** Pente quotidienne (Δscore/jour). null si insuffisant. */
  slopePerDay: number | null;
  /**
   * Verdict qualitatif :
   *   improving  pente >= +0.05/j (gain ~+1.5 pt/mois)
   *   stable     |pente| < 0.05/j
   *   degrading  pente <= -0.05/j
   *   insufficient_data
   */
  verdict: "improving" | "stable" | "degrading" | "insufficient_data";
  /** Série pour graphique : history puis forecast. */
  series: ForecastPoint[];
};

export type TopMover = {
  userId: string;
  name: string;
  email: string;
  riskScore: number;
  indicator: number;
  reasons: string[];
};

/**
 * Régression linéaire y = a*x + b par moindres carrés.
 * Renvoie { slope: a, intercept: b }.
 */
function linearFit(
  points: { x: number; y: number }[],
): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 3) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export async function computeTenantForecast(
  tenantId: string,
): Promise<TenantForecast> {
  const sinceCutoff = new Date();
  sinceCutoff.setDate(sinceCutoff.getDate() - HISTORY_WINDOW_DAYS);

  const snapshots = await db.riskScoreSnapshot.findMany({
    where: { tenantId, day: { gte: sinceCutoff } },
    orderBy: { day: "asc" },
    select: { day: true, avgScore: true },
  });

  if (snapshots.length < 3) {
    return {
      currentAvgScore: snapshots.at(-1)?.avgScore ?? null,
      forecastAvgScore: null,
      slopePerDay: null,
      verdict: "insufficient_data",
      series: snapshots.map((s) => ({
        day: s.day,
        score: s.avgScore,
        type: "history",
      })),
    };
  }

  // x = nb de jours depuis le 1er point (entiers, pas de timestamps).
  const baseTime = snapshots[0].day.getTime();
  const points = snapshots.map((s) => ({
    x: Math.round((s.day.getTime() - baseTime) / (24 * 3600 * 1000)),
    y: s.avgScore,
  }));

  const fit = linearFit(points);
  if (!fit) {
    return {
      currentAvgScore: snapshots.at(-1)?.avgScore ?? null,
      forecastAvgScore: null,
      slopePerDay: null,
      verdict: "insufficient_data",
      series: snapshots.map((s) => ({
        day: s.day,
        score: s.avgScore,
        type: "history",
      })),
    };
  }

  const lastX = points.at(-1)!.x;
  const forecastX = lastX + FORECAST_HORIZON_DAYS;
  const forecastY = Math.max(
    0,
    Math.min(100, fit.slope * forecastX + fit.intercept),
  );
  const currentAvg = snapshots.at(-1)!.avgScore;

  let verdict: TenantForecast["verdict"];
  if (Math.abs(fit.slope) < 0.05) verdict = "stable";
  else if (fit.slope > 0) verdict = "improving";
  else verdict = "degrading";

  // Construit la serie complete : historique + projection a H+30j.
  const lastDayMs = snapshots.at(-1)!.day.getTime();
  const series: ForecastPoint[] = [
    ...snapshots.map<ForecastPoint>((s) => ({
      day: s.day,
      score: s.avgScore,
      type: "history",
    })),
    {
      day: new Date(lastDayMs + FORECAST_HORIZON_DAYS * 24 * 3600 * 1000),
      score: forecastY,
      type: "forecast",
    },
  ];

  return {
    currentAvgScore: currentAvg,
    forecastAvgScore: forecastY,
    slopePerDay: fit.slope,
    verdict,
    series,
  };
}

/**
 * Top movers : users avec la plus forte dégradation et la plus forte
 * amélioration. On regarde tous les users actifs LEARNER/MANAGER,
 * calcule leur trend, et trie par |indicator|.
 */
export async function computeTopMovers(
  tenantId: string,
  limit = 10,
): Promise<{ degrading: TopMover[]; improving: TopMover[] }> {
  const users = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      riskScore: true,
    },
    take: 500, // on cap raisonnablement pour eviter d'exploser un tres gros tenant
  });

  const enriched = await Promise.all(
    users.map(async (u) => {
      const trend = await computeUserTrend(u.id);
      return {
        userId: u.id,
        name: u.name ?? u.email.split("@")[0],
        email: u.email,
        riskScore: u.riskScore,
        indicator: trend.indicator,
        reasons: trend.reasons,
        verdict: trend.verdict,
      };
    }),
  );

  const degrading = enriched
    .filter((u) => u.verdict === "degrading")
    .sort((a, b) => a.indicator - b.indicator)
    .slice(0, limit)
    .map(
      ({ userId, name, email, riskScore, indicator, reasons }) =>
        ({
          userId,
          name,
          email,
          riskScore,
          indicator,
          reasons,
        }) satisfies TopMover,
    );

  const improving = enriched
    .filter((u) => u.verdict === "improving")
    .sort((a, b) => b.indicator - a.indicator)
    .slice(0, limit)
    .map(
      ({ userId, name, email, riskScore, indicator, reasons }) =>
        ({
          userId,
          name,
          email,
          riskScore,
          indicator,
          reasons,
        }) satisfies TopMover,
    );

  return { degrading, improving };
}

export type IncidentCorrelation = {
  /** Nb d'incidents analysés sur la fenêtre. */
  incidentCount: number;
  /** riskScore moyen des reportedById (= ceux qui ont alerté). */
  reporterAvgScore: number | null;
  /** riskScore moyen du tenant (LEARNER+MANAGER). */
  tenantAvgScore: number | null;
  /**
   * Différence reporters - tenant. Positive = les reporters ont un
   * meilleur score (signal cohérent : la formation porte ses fruits).
   */
  scoreDelta: number | null;
  /** Période analysée en jours. */
  windowDays: number;
};

/**
 * Corrélation incidents ↔ sensibilisation.
 *
 * Méthodologie pragmatique : on compare le riskScore moyen des users qui
 * ont REPORTÉ un incident (reportedById) au riskScore moyen du tenant.
 * Hypothèse : les users bien formés détectent et rapportent mieux ;
 * une différence positive valide l'hypothèse.
 *
 * Limites : la corrélation n'est PAS la causalité. C'est un signal
 * directionnel, à présenter comme tel dans l'UI. On ne mesure pas le
 * profil des "users impliqués" (IncidentResponse.affectedUsers est un
 * count int, pas une relation).
 */
export async function computeIncidentCorrelation(
  tenantId: string,
  windowDays = 180,
): Promise<IncidentCorrelation> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const incidents = await db.incidentResponse.findMany({
    where: { tenantId, detectedAt: { gte: cutoff } },
    select: { reportedById: true },
  });

  const reporterIds = Array.from(
    new Set(
      incidents
        .map((i) => i.reportedById)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [reporterScores, tenantUsers] = await Promise.all([
    reporterIds.length === 0
      ? []
      : db.user.findMany({
          where: { id: { in: reporterIds } },
          select: { riskScore: true },
        }),
    db.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ["LEARNER", "MANAGER"] },
      },
      select: { riskScore: true },
    }),
  ]);

  const reporterAvg =
    reporterScores.length > 0
      ? reporterScores.reduce((s, u) => s + u.riskScore, 0) /
        reporterScores.length
      : null;
  const tenantAvg =
    tenantUsers.length > 0
      ? tenantUsers.reduce((s, u) => s + u.riskScore, 0) /
        tenantUsers.length
      : null;

  return {
    incidentCount: incidents.length,
    reporterAvgScore: reporterAvg,
    tenantAvgScore: tenantAvg,
    scoreDelta:
      reporterAvg !== null && tenantAvg !== null
        ? reporterAvg - tenantAvg
        : null,
    windowDays,
  };
}
