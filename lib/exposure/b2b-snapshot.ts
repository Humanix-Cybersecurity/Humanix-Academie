// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Phase 3 (B2B reporting) — snapshot AGRÉGÉ quotidien de la posture
// d'exposition d'un tenant. Ne persiste AUCUNE donnée individuelle : que des
// compteurs par statut et un score d'organisation 0-100.
//
// Sert de socle au reporting de conformité (preuve de mesures de sécurité
// NIS2 art.21 / RGPD art.32) et aux tendances RSSI. Écrit par le cron quand
// la veille est active (re-vérifie la triple garde en défense en profondeur).

import { db } from "@/lib/db";
import { isB2bMonitoringActive } from "@/lib/exposure/b2b-flags";

export const SNAPSHOT_SCORE_VERSION = "v1";

export type SnapshotCounts = {
  newCount: number;
  trainingCount: number;
  remediatedCount: number;
  dismissedCount: number;
  /** Expositions ouvertes (NEW + VALIDATED + TRAINING_ASSIGNED). */
  exposedCount: number;
};

/**
 * Score de posture d'organisation 0-100 (heuristique v1, agrégée).
 *   - 0 si aucune exposition pertinente (ni ouverte ni remédiée).
 *   - Combine la part NON traitée (openFraction) et le volume d'ouvertes
 *     (saturation à 20) : une org avec beaucoup d'expositions ouvertes et
 *     peu de remédiations score haut (posture dégradée).
 * Les faux positifs (DISMISSED) sont exclus du calcul.
 */
export function computeOrgExposureScore(c: {
  exposedCount: number;
  remediatedCount: number;
}): number {
  const open = Math.max(0, c.exposedCount);
  const remediated = Math.max(0, c.remediatedCount);
  const relevant = open + remediated;
  if (relevant === 0) return 0;
  const openFraction = open / relevant; // 0..1
  const volume = Math.min(1, open / 20); // saturation à 20 expositions ouvertes
  return Math.round(100 * (0.7 * openFraction + 0.3 * volume));
}

/** Normalise une date à minuit UTC (granularité jour). */
function toUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type SnapshotResult =
  | { ok: true; day: string; counts: SnapshotCounts; orgExposureScore: number }
  | { ok: false; reason: "inactive" | "no_tenant" };

/**
 * Calcule et persiste le snapshot agrégé du jour pour un tenant.
 * No-op (ok:false) si la veille n'est pas active (triple garde).
 */
export async function computeAndStoreSnapshot(
  tenantId: string,
  day?: Date,
): Promise<SnapshotResult> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      exposureMonitoringEnabled: true,
      exposureMonitoringDpaSignedAt: true,
      exposureDomains: true,
    },
  });
  if (!tenant) return { ok: false, reason: "no_tenant" };
  if (!isB2bMonitoringActive(tenant)) return { ok: false, reason: "inactive" };

  const grouped = await db.employeeExposure.groupBy({
    by: ["status"],
    where: { tenantId },
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {};
  for (const g of grouped) byStatus[g.status] = g._count._all;

  const counts: SnapshotCounts = {
    newCount: byStatus.NEW ?? 0,
    trainingCount: byStatus.TRAINING_ASSIGNED ?? 0,
    remediatedCount: byStatus.REMEDIATED ?? 0,
    dismissedCount: byStatus.DISMISSED ?? 0,
    exposedCount:
      (byStatus.NEW ?? 0) +
      (byStatus.VALIDATED ?? 0) +
      (byStatus.TRAINING_ASSIGNED ?? 0),
  };

  const orgExposureScore = computeOrgExposureScore(counts);
  const dayDate = toUtcDay(day ?? new Date());

  await db.exposureSnapshot.upsert({
    where: { tenantId_day: { tenantId, day: dayDate } },
    update: { ...counts, orgExposureScore },
    create: { tenantId, day: dayDate, ...counts, orgExposureScore },
  });

  return {
    ok: true,
    day: dayDate.toISOString().slice(0, 10),
    counts,
    orgExposureScore,
  };
}
