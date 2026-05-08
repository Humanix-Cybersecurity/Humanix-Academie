// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Enforcement des quotas de sieges par plan SaaS.
// -----------------------------------------------------------------------------
// PRINCIPE :
//   Chaque tenant a un plafond de sieges (= nombre d'users actifs) defini par
//   son plan (cf. PLAN_SEATS dans lib/plans.ts). On verifie ce plafond AVANT
//   chaque creation / invitation d'user. Au-dela, on lance une SeatQuotaError
//   explicite que le client UI peut catch et afficher avec un CTA upgrade.
//
// IMPORTANT : on compte les utilisateurs ACTIFS (status != "suspended"). Un
// user suspendu ne consomme pas de siege -- l'admin peut donc temporairement
// "geler" un employe sans le supprimer ni payer un siege en plus.

import { db } from "@/lib/db";
import { PLAN_SEATS, normalizePlan, type PlanId } from "@/lib/plans";

export class SeatQuotaError extends Error {
  constructor(
    public readonly used: number,
    public readonly max: number,
    public readonly plan: PlanId,
  ) {
    super(`seat_quota_exceeded: ${used}/${max} (plan ${plan})`);
    this.name = "SeatQuotaError";
  }
}

export type SeatUsage = {
  used: number;
  max: number;
  plan: PlanId;
  /** % d'utilisation, 0..100. Utile pour afficher une jauge UI. */
  percent: number;
  /** True si on peut encore ajouter au moins 1 user. */
  canAdd: boolean;
  /** Sieges restants disponibles. Infinity si plan Premium. */
  remaining: number;
  /** True si on est a >=80% du quota -> afficher un warning UI. */
  approaching: boolean;
  /** True si on est exactement au max (consommer le dernier siege). */
  atLimit: boolean;
};

/**
 * Compte les utilisateurs actifs d'un tenant.
 * Convention : un User actif n'est PAS suspended. La logique exacte depend du
 * schema -- ici on prend la convention simple : tous les users du tenant.
 * Pour exclure les suspendus, ajouter `status: { not: "suspended" }` au where.
 */
async function countActiveUsers(tenantId: string): Promise<number> {
  return db.user.count({ where: { tenantId } });
}

/**
 * Retourne l'usage actuel des sieges + capacite restante.
 * Utile pour afficher dans le dashboard admin et les CTAs upgrade.
 */
export async function getSeatUsage(tenantId: string): Promise<SeatUsage> {
  const [tenant, used] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    }),
    countActiveUsers(tenantId),
  ]);

  const plan = normalizePlan(tenant?.plan);
  const max = PLAN_SEATS[plan];
  const isUnlimited = !Number.isFinite(max);

  const percent = isUnlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const remaining = isUnlimited ? Infinity : Math.max(0, max - used);
  const canAdd = isUnlimited || used < max;
  const approaching = !isUnlimited && percent >= 80;
  const atLimit = !isUnlimited && used >= max;

  return { used, max, plan, percent, canAdd, remaining, approaching, atLimit };
}

/**
 * Verifie qu'on peut creer/inviter UN user de plus dans ce tenant.
 * Lance SeatQuotaError si plafond atteint.
 *
 * Usage :
 *   await enforceSeatQuota(tenantId);
 *   await db.user.create({ data: { ..., tenantId } });
 *
 * Pour ajouter PLUSIEURS users d'un coup (import CSV par ex), passer le
 * parametre `count` :
 *   await enforceSeatQuota(tenantId, 50);  // verifie qu'on peut en ajouter 50
 */
export async function enforceSeatQuota(
  tenantId: string,
  count = 1,
): Promise<void> {
  const usage = await getSeatUsage(tenantId);
  if (!Number.isFinite(usage.max)) return; // plan Premium, illimite

  if (usage.used + count > usage.max) {
    throw new SeatQuotaError(usage.used, usage.max, usage.plan);
  }
}

/**
 * Format humain du quota pour l'UI : "12 / 50 sieges utilises (24%)".
 */
export function formatSeatUsage(usage: SeatUsage): string {
  if (!Number.isFinite(usage.max)) {
    return `${usage.used} sieges utilises (illimite)`;
  }
  return `${usage.used} / ${usage.max} sieges utilises (${usage.percent}%)`;
}
