// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Machine d'etat du subscription d'un tenant (state ce que voit l'app).
// -----------------------------------------------------------------------------
// Objectif : centraliser la logique "que peut faire ce tenant aujourd'hui"
// pour que UI + middleware + API repondent de facon coherente.
//
// MODELE (mai 2026, vente directe sans essai gratuit) :
//   active        Tenant paie, tout est ouvert
//   grace_period  Paiement echoue depuis < 7j -> tout est ouvert + warning
//   read_only     Paiement echoue depuis 7j+ -> read-only 30j
//   suspended     > 30j de read-only sans renew -> login bloque, redirect /admin/billing
//   none          Pas de subscription, tenant fraichement cree (rare, dev)
//
// HISTORIQUE :
// Les etats `trialing` et `trial_expired` ont existe (essai gratuit 30j),
// retires quand on est passe a la vente directe sans essai. Si un tenant
// legacy a encore subscriptionStatus='trialing' en BDD, il est traite comme
// 'active' (lecture defensive). La migration Prisma rebascule au passage.
//
// PERIODES :
//   GRACE_PERIOD_DAYS = 7        (paiement echoue : tolere)
//   READ_ONLY_PERIOD_DAYS = 30   (read-only : derniere chance avant suspend)

import { db } from "@/lib/db";
import { normalizePlan, type PlanId } from "@/lib/plans";

export const GRACE_PERIOD_DAYS = 7;
export const READ_ONLY_PERIOD_DAYS = 30;

export type SubscriptionStateName =
  | "active"
  | "grace_period"
  | "read_only"
  | "suspended"
  | "none";

export type SubscriptionState = {
  /** Etat principal pour le routing/affichage. */
  state: SubscriptionStateName;
  /** Plan effectif (normalise). */
  plan: PlanId;
  /** Status brut tel que renvoye par Payplug (active, past_due, canceled, etc.). */
  rawStatus: string | null;
  /**
   * Niveau de restriction applique par le middleware admin :
   *   none      tout fonctionne
   *   warn      tout fonctionne mais on affiche un bandeau d'avertissement
   *   read_only acces lecture seule (pas de POST/PUT/DELETE), CTA renew
   *   blocked   redirect /admin/billing forced (login OK, mais rien d'autre)
   */
  restriction: "none" | "warn" | "read_only" | "blocked";
  /** Jours restants avant le prochain changement d'etat. null si stable. */
  daysLeft: number | null;
  /** Action recommandee a l'utilisateur. */
  cta: "renew" | "upgrade" | "contact_support" | null;
  /** Date de fin de periode courante (renouvellement / coupure). */
  currentPeriodEnd: Date | null;
};

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Calcule l'etat du subscription pour le tenant donne.
 * Fonction PURE (modulo la lecture en BDD au debut) -- aucun side effect.
 */
export async function getSubscriptionState(
  tenantId: string,
  now: Date = new Date(),
): Promise<SubscriptionState> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
    },
  });

  if (!tenant) {
    return {
      state: "none",
      plan: "decouverte",
      rawStatus: null,
      restriction: "blocked",
      daysLeft: null,
      cta: "contact_support",
      currentPeriodEnd: null,
    };
  }

  const plan = normalizePlan(tenant.plan);
  const rawStatus = tenant.subscriptionStatus;
  const periodEnd = tenant.currentPeriodEnd;

  // === 1. Subscription active (et tolerance pour le legacy "trialing") ===
  // Anciens tenants encore en status="trialing" : on les traite comme active.
  // La migration les rebascule, mais ceinture + bretelles cote lecture.
  if (rawStatus === "active" || rawStatus === "trialing") {
    const daysLeft = periodEnd ? daysBetween(now, periodEnd) : null;
    return {
      state: "active",
      plan,
      rawStatus,
      restriction: "none",
      daysLeft,
      cta: null,
      currentPeriodEnd: periodEnd,
    };
  }

  // === 2. past_due / payment failed -> grace period 7j ===
  if (rawStatus === "past_due" || rawStatus === "incomplete") {
    if (!periodEnd) {
      return {
        state: "grace_period",
        plan,
        rawStatus,
        restriction: "warn",
        daysLeft: GRACE_PERIOD_DAYS,
        cta: "renew",
        currentPeriodEnd: periodEnd,
      };
    }
    const daysSinceFailed = daysBetween(periodEnd, now);
    if (daysSinceFailed <= GRACE_PERIOD_DAYS) {
      return {
        state: "grace_period",
        plan,
        rawStatus,
        restriction: "warn",
        daysLeft: GRACE_PERIOD_DAYS - daysSinceFailed,
        cta: "renew",
        currentPeriodEnd: periodEnd,
      };
    }
    if (daysSinceFailed <= GRACE_PERIOD_DAYS + READ_ONLY_PERIOD_DAYS) {
      return {
        state: "read_only",
        plan,
        rawStatus,
        restriction: "read_only",
        daysLeft:
          GRACE_PERIOD_DAYS + READ_ONLY_PERIOD_DAYS - daysSinceFailed,
        cta: "renew",
        currentPeriodEnd: periodEnd,
      };
    }
    return {
      state: "suspended",
      plan,
      rawStatus,
      restriction: "blocked",
      daysLeft: null,
      cta: "renew",
      currentPeriodEnd: periodEnd,
    };
  }

  // === 3. canceled / unpaid -> suspendu ===
  if (rawStatus === "canceled" || rawStatus === "unpaid") {
    return {
      state: "suspended",
      plan,
      rawStatus,
      restriction: "blocked",
      daysLeft: null,
      cta: "renew",
      currentPeriodEnd: periodEnd,
    };
  }

  // === 4. Plan gratuit "decouverte" forever-free, pas de subscription Payplug ===
  if (plan === "decouverte" && !rawStatus) {
    return {
      state: "active",
      plan,
      rawStatus: null,
      restriction: "none",
      daysLeft: null,
      cta: null,
      currentPeriodEnd: null,
    };
  }

  // === 5. Default fallback : tenant en etat inconnu, on warn ===
  return {
    state: "none",
    plan,
    rawStatus,
    restriction: "warn",
    daysLeft: null,
    cta: "contact_support",
    currentPeriodEnd: periodEnd,
  };
}

/**
 * Helpers pour les middlewares / route handlers : retourne true si le
 * tenant peut effectuer une action de modification (POST/PUT/PATCH/DELETE).
 */
export function canMutate(state: SubscriptionState): boolean {
  return state.restriction === "none" || state.restriction === "warn";
}

/**
 * True si le tenant doit voir un bandeau de warning sur la page admin.
 */
export function shouldShowWarning(state: SubscriptionState): boolean {
  return state.restriction !== "none";
}
