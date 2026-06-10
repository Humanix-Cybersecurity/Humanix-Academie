// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Métriques agrégées NON-IDENTIFIANTES des checks d'exposition.
// Server-only. N'enregistre JAMAIS la cible (email/hash/téléphone), seulement
// des compteurs par (jour, type, bucket). Alimente les stats communautaires.

import { db } from "@/lib/db";

export type CheckType = "password" | "email_domain" | "phone";
export type Bucket = "exposed" | "clean";

/** Début de journée UTC (granularité jour, pas d'heure -> pas de fingerprint). */
function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Incrémente le compteur agrégé. Best-effort : un échec ne casse jamais le
 * flux utilisateur. Aucune donnée identifiante.
 */
export async function recordExposureMetric(
  checkType: CheckType,
  bucket: Bucket,
): Promise<void> {
  try {
    const day = todayUtc();
    await db.exposureCheckMetric.upsert({
      where: { day_checkType_bucket: { day, checkType, bucket } },
      update: { count: { increment: 1 } },
      create: { day, checkType, bucket, count: 1 },
    });
  } catch {
    // best-effort : on ne bloque pas le check si la métrique échoue
  }
}

/**
 * Stats agrégées pour la page communautaire. K-anonymat des stats : on ne
 * renvoie les ratios que si l'effectif total est suffisant (>= MIN_SAMPLE),
 * sinon on masque pour éviter toute ré-identification sur petits volumes.
 */
const MIN_SAMPLE = 50;

export async function getExposureStats(): Promise<{
  enoughData: boolean;
  totalChecks: number;
  byType: Record<CheckType, { exposed: number; clean: number; exposedPct: number }>;
}> {
  const rows = await db.exposureCheckMetric.groupBy({
    by: ["checkType", "bucket"],
    _sum: { count: true },
  });

  const acc: Record<string, { exposed: number; clean: number }> = {
    password: { exposed: 0, clean: 0 },
    email_domain: { exposed: 0, clean: 0 },
    phone: { exposed: 0, clean: 0 },
  };
  for (const r of rows) {
    const n = r._sum.count ?? 0;
    if (acc[r.checkType] && (r.bucket === "exposed" || r.bucket === "clean")) {
      acc[r.checkType][r.bucket] += n;
    }
  }

  const total = Object.values(acc).reduce((s, v) => s + v.exposed + v.clean, 0);
  const byType = Object.fromEntries(
    Object.entries(acc).map(([type, v]) => {
      const sub = v.exposed + v.clean;
      return [
        type,
        {
          exposed: v.exposed,
          clean: v.clean,
          exposedPct: sub > 0 ? Math.round((v.exposed / sub) * 100) : 0,
        },
      ];
    }),
  ) as Record<CheckType, { exposed: number; clean: number; exposedPct: number }>;

  return { enoughData: total >= MIN_SAMPLE, totalChecks: total, byType };
}
