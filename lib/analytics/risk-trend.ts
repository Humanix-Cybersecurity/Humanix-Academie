// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Calcul de la TENDANCE de risque d'un utilisateur.
// -----------------------------------------------------------------------------
// Le riskScore d'un user (cf. lib/risk-score.ts) est un instantané. Pour
// répondre à la question "est-ce que cet user va devenir vulnérable ?",
// on a besoin d'une dérivée temporelle.
//
// On NE stocke PAS un historique par user (coûteux pour des tenants à
// plusieurs centaines d'users × 365 jours). On utilise les ÉVÈNEMENTS
// pédagogiques + comportementaux comme proxy de tendance :
//
//   - Progress completions (30 derniers jours vs 30 précédents)
//     → activité d'apprentissage : ↗ improving, ↘ degrading
//   - PhishingResults (statut CLICKED vs REPORTED, 90j sliding)
//     → vulnérabilité comportementale : plus de CLICK = ↘
//   - lastSeenAt
//     → désengagement : plus de 30j sans connexion = signal négatif
//
// Le résultat est un VERDICT qualitatif, pas un score précis. Pour le
// "Graal" (prédire avant l'incident), c'est la combinaison
// `riskScore < seuil` (présent) + `verdict === "degrading"` (futur).

import { db } from "@/lib/db";

const RECENT_WINDOW_DAYS = 30;
const PREVIOUS_WINDOW_DAYS = 30;
const PHISHING_WINDOW_DAYS = 90;

export type TrendVerdict =
  | "improving"
  | "stable"
  | "degrading"
  | "insufficient_data";

export type UserTrend = {
  verdict: TrendVerdict;
  /**
   * Indicateur signé en [-1, 1] :
   *   > 0  amélioration (+0.3 = forte amélioration)
   *   ~ 0  stable
   *   < 0  dégradation (-0.5 = forte dégradation)
   * Permet de trier les users par dynamique.
   */
  indicator: number;
  /**
   * Composantes pondérées qui ont contribué au verdict (pour explicabilité
   * dans l'UI : "pourquoi cet user est en dégradation ?").
   */
  reasons: string[];
};

function daysAgo(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt;
}

/**
 * Calcule la tendance pour UN user. À utiliser sur des listes courtes
 * (par exemple at-risk users qui sont déjà filtrés). Pour calculer en
 * masse, voir computeUserTrendsBatch ci-dessous.
 */
export async function computeUserTrend(userId: string): Promise<UserTrend> {
  const recentCutoff = daysAgo(RECENT_WINDOW_DAYS);
  const previousCutoff = daysAgo(RECENT_WINDOW_DAYS + PREVIOUS_WINDOW_DAYS);
  const phishingCutoff = daysAgo(PHISHING_WINDOW_DAYS);

  const [user, recentProgress, previousProgress, phishings] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { lastSeenAt: true, lastLoginAt: true, createdAt: true },
      }),
      db.progress.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: recentCutoff },
        },
      }),
      db.progress.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: previousCutoff, lt: recentCutoff },
        },
      }),
      db.phishingResult.findMany({
        where: { userId, sentAt: { gte: phishingCutoff } },
        select: { status: true, sentAt: true },
      }),
    ]);

  const reasons: string[] = [];
  let scoreDelta = 0;

  // === 1. Tendance d'apprentissage (Progress) ===
  if (recentProgress > previousProgress) {
    const ratio =
      previousProgress === 0
        ? 1
        : Math.min(2, recentProgress / Math.max(1, previousProgress)) - 1;
    scoreDelta += 0.3 * Math.min(1, ratio);
    reasons.push(
      `+${recentProgress - previousProgress} modules vs période précédente`,
    );
  } else if (recentProgress < previousProgress && previousProgress > 0) {
    const ratio = 1 - recentProgress / previousProgress;
    scoreDelta -= 0.4 * ratio;
    reasons.push(
      `−${previousProgress - recentProgress} modules vs période précédente`,
    );
  }

  // === 2. Désengagement (lastSeenAt) ===
  const lastActivity = user?.lastSeenAt ?? user?.lastLoginAt ?? user?.createdAt ?? null;
  if (lastActivity) {
    const daysSilent = Math.floor(
      (Date.now() - lastActivity.getTime()) / (24 * 3600 * 1000),
    );
    if (daysSilent > 60) {
      scoreDelta -= 0.4;
      reasons.push(`silencieux depuis ${daysSilent}j`);
    } else if (daysSilent > 30) {
      scoreDelta -= 0.2;
      reasons.push(`silencieux depuis ${daysSilent}j`);
    }
  }

  // === 3. Phishing comportement (CLICKED ratio) ===
  if (phishings.length >= 3) {
    const clicked = phishings.filter((p) => p.status === "CLICKED").length;
    const reported = phishings.filter((p) => p.status === "REPORTED").length;
    const clickRate = clicked / phishings.length;
    const reportRate = reported / phishings.length;

    if (clickRate >= 0.5) {
      scoreDelta -= 0.5;
      reasons.push(
        `${Math.round(clickRate * 100)}% phishing cliqués (${phishings.length} envois)`,
      );
    } else if (clickRate >= 0.3) {
      scoreDelta -= 0.25;
      reasons.push(`${Math.round(clickRate * 100)}% phishing cliqués`);
    } else if (reportRate >= 0.5) {
      scoreDelta += 0.25;
      reasons.push(`${Math.round(reportRate * 100)}% phishing reportés`);
    }
  }

  // === Verdict global ===
  const indicator = Math.max(-1, Math.min(1, scoreDelta));
  let verdict: TrendVerdict;

  // Pas assez de signal : créé < 30j ET aucun progress, on n'inférera pas.
  const ageDays = user?.createdAt
    ? Math.floor((Date.now() - user.createdAt.getTime()) / (24 * 3600 * 1000))
    : null;
  if (
    ageDays !== null &&
    ageDays < RECENT_WINDOW_DAYS &&
    recentProgress + previousProgress === 0 &&
    phishings.length === 0
  ) {
    verdict = "insufficient_data";
  } else if (indicator >= 0.15) {
    verdict = "improving";
  } else if (indicator <= -0.15) {
    verdict = "degrading";
  } else {
    verdict = "stable";
  }

  return { verdict, indicator, reasons };
}

/**
 * Version batch pour une liste de userIds (par exemple les users
 * at-risk d'un tenant). Limité par défaut à 200 pour éviter d'exploser
 * la DB sur des très gros tenants ; au-delà on retourne juste insufficient_data
 * pour les overflow (la trend devient calculable un par un en lazy).
 */
export async function computeUserTrendsBatch(
  userIds: string[],
  maxBatch = 200,
): Promise<Map<string, UserTrend>> {
  const result = new Map<string, UserTrend>();
  const slice = userIds.slice(0, maxBatch);
  await Promise.all(
    slice.map(async (id) => {
      try {
        const trend = await computeUserTrend(id);
        result.set(id, trend);
      } catch (e) {
        console.warn(
          `[risk-trend] computeUserTrend failed for ${id}`,
          e,
        );
        result.set(id, {
          verdict: "insufficient_data",
          indicator: 0,
          reasons: [],
        });
      }
    }),
  );
  for (const id of userIds.slice(maxBatch)) {
    result.set(id, {
      verdict: "insufficient_data",
      indicator: 0,
      reasons: [],
    });
  }
  return result;
}
