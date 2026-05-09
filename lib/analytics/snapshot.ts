// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper d'enregistrement quotidien du score de risque agrege par tenant.
//
// CAS D'USAGE :
//   Le cron /api/cron/risk-snapshot tourne 1 fois/jour et appelle
//   recordAllTenantsSnapshot() qui :
//     1. Liste tous les tenants actifs
//     2. Pour chacun : calcule la distribution du riskScore (avg, p10/50/90)
//     3. Upsert une ligne RiskScoreSnapshot (tenantId, day) idempotente
//
//   Le dashboard RSSI lit ensuite la timeseries via
//   /api/admin/analytics/timeseries pour afficher un LineChart 90j.
//
// IDEMPOTENCE :
//   Le @@unique([tenantId, day]) garantit qu'on ne cree pas 2 lignes par
//   jour. Si le cron est relance manuellement, on UPDATE la ligne (pas
//   d'erreur). C'est important parce que le score d'un tenant peut
//   bouger en cours de journee (un user complete un module, un cron de
//   refreshUserRiskScore tourne, etc.).
//
// PERFORMANCE :
//   Pour 100 tenants × 50 users moyens, la query reste petite (< 5k
//   rows scannees). Si on scale, on pourra paralleliser ou ne snapshoter
//   que les tenants actifs (lastSeenAt < 7j).

import { db } from "@/lib/db";

/**
 * Normalise une date a 00:00:00 UTC pour grouper par jour.
 * On utilise UTC explicitement (pas le tz du serveur) pour avoir des
 * snapshots stables peu importe ou tourne le cron (Vercel us-east-1,
 * Scaleway fr-par, machine perso en CET, etc.).
 */
export function dayKey(d: Date = new Date()): Date {
  const utc = new Date(d);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

/**
 * Calcule un percentile (0-100) sur un array trie ASC.
 * Method: nearest-rank (simple, pas d'interpolation).
 */
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const idx = Math.max(0, Math.min(sortedAsc.length - 1, rank));
  return sortedAsc[idx];
}

export type SnapshotComputed = {
  tenantId: string;
  userCount: number;
  avgScore: number;
  p10Score: number;
  p50Score: number;
  p90Score: number;
  atRiskCount: number;
};

/**
 * Calcule la distribution du riskScore pour UN tenant. Renvoie null si
 * le tenant n'a pas d'user actif (LEARNER/MANAGER) — on ne snapshote
 * pas les tenants vides.
 */
export async function computeTenantSnapshot(
  tenantId: string,
): Promise<SnapshotComputed | null> {
  const users = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER"] },
    },
    select: { riskScore: true },
  });

  if (users.length === 0) return null;

  const scores = users
    .map((u) => u.riskScore)
    .sort((a, b) => a - b);

  const sum = scores.reduce((s, v) => s + v, 0);
  const avgScore = sum / scores.length;
  const p10Score = percentile(scores, 10);
  const p50Score = percentile(scores, 50);
  const p90Score = percentile(scores, 90);
  const atRiskCount = scores.filter((s) => s < 40).length;

  return {
    tenantId,
    userCount: users.length,
    avgScore,
    p10Score,
    p50Score,
    p90Score,
    atRiskCount,
  };
}

/**
 * Upsert le snapshot du jour pour un tenant donne. Idempotent.
 */
export async function recordTenantSnapshot(
  tenantId: string,
  day: Date = dayKey(),
): Promise<{ tenantId: string; recorded: boolean; reason?: string }> {
  const computed = await computeTenantSnapshot(tenantId);
  if (!computed) {
    return { tenantId, recorded: false, reason: "no_active_users" };
  }

  await db.riskScoreSnapshot.upsert({
    where: {
      tenantId_day: { tenantId, day },
    },
    update: {
      userCount: computed.userCount,
      avgScore: computed.avgScore,
      p10Score: computed.p10Score,
      p50Score: computed.p50Score,
      p90Score: computed.p90Score,
      atRiskCount: computed.atRiskCount,
    },
    create: {
      tenantId,
      day,
      userCount: computed.userCount,
      avgScore: computed.avgScore,
      p10Score: computed.p10Score,
      p50Score: computed.p50Score,
      p90Score: computed.p90Score,
      atRiskCount: computed.atRiskCount,
    },
  });

  return { tenantId, recorded: true };
}

/**
 * Snapshot quotidien de TOUS les tenants. Appele par le cron.
 *
 * Strategie : on parcourt sequentiellement (volume faible, pas de raison
 * de paralleliser et risquer un thundering herd sur Postgres). Une
 * erreur sur un tenant n'arrete pas la boucle (on log et on continue).
 */
export async function recordAllTenantsSnapshot(): Promise<{
  total: number;
  recorded: number;
  skipped: number;
  errors: { tenantId: string; error: string }[];
  day: string;
}> {
  const day = dayKey();
  const tenants = await db.tenant.findMany({
    select: { id: true },
  });

  let recorded = 0;
  let skipped = 0;
  const errors: { tenantId: string; error: string }[] = [];

  for (const t of tenants) {
    try {
      const r = await recordTenantSnapshot(t.id, day);
      if (r.recorded) recorded++;
      else skipped++;
    } catch (e) {
      errors.push({
        tenantId: t.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    total: tenants.length,
    recorded,
    skipped,
    errors,
    day: day.toISOString().slice(0, 10),
  };
}

/**
 * Lit la timeseries d'un tenant sur les N derniers jours (par defaut 90).
 * Retourne ASC (le plus ancien en premier) pour faciliter le LineChart.
 */
export async function getTenantTimeseries(
  tenantId: string,
  daysBack: number = 90,
): Promise<
  {
    day: string; // YYYY-MM-DD
    userCount: number;
    avgScore: number;
    p10Score: number;
    p50Score: number;
    p90Score: number;
    atRiskCount: number;
  }[]
> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - daysBack);

  const rows = await db.riskScoreSnapshot.findMany({
    where: { tenantId, day: { gte: since } },
    orderBy: { day: "asc" },
    select: {
      day: true,
      userCount: true,
      avgScore: true,
      p10Score: true,
      p50Score: true,
      p90Score: true,
      atRiskCount: true,
    },
  });

  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    userCount: r.userCount,
    avgScore: r.avgScore,
    p10Score: r.p10Score,
    p50Score: r.p50Score,
    p90Score: r.p90Score,
    atRiskCount: r.atRiskCount,
  }));
}
