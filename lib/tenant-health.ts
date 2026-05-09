// SPDX-License-Identifier: AGPL-3.0-or-later
// Calcul des indicateurs de sante d'un tenant.
//
// Utilise par /superadmin/tenants pour montrer en un coup d'oeil quels
// clients ont besoin d'assistance et lesquels sont autonomes.
//
// Indicateurs :
//  - adminActif       : au moins 1 user role=ADMIN/RSSI/SUPERADMIN, isActive
//  - adminVerified    : au moins 1 admin avec emailVerified
//  - admin2FA         : au moins 1 admin avec mfaEnabled=true
//  - hasGroups        : au moins 1 groupe defini (au-dela des systeme)
//  - hasUsers         : au moins 1 user role=LEARNER/MANAGER actif
//  - hasProgress      : au moins 1 progression COMPLETED
//  - lastActivityDays : nb de jours depuis la derniere activite (User.lastSeenAt)
//  - planCoherent     : pas de feature payante utilisee si plan trop bas
//
// Seuils :
//  - lastActivityDays > 30 : tenant considere "dormant" (alerte amber)
//  - lastActivityDays > 90 : tenant "en risque de churn" (alerte rose)
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import {
  PLAN_RANK,
  FEATURE_MIN_PLAN,
  type PlanId,
  normalizePlan,
} from "@/lib/plans";

export type TenantHealthSignal = "ok" | "warn" | "error";

export type TenantHealth = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  plan: PlanId;
  createdAt: Date;
  // Compteurs de base
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  groupCount: number;
  // Indicateurs booleens
  adminActif: boolean;
  adminVerified: boolean;
  admin2FA: boolean;
  hasGroups: boolean;
  hasUsers: boolean;
  hasProgress: boolean;
  // Activite
  lastActivityAt: Date | null;
  lastActivityDays: number | null;
  // Coherence plan
  planMismatches: string[]; // ex: ["phishing utilise mais plan=solo"]
  // Score global derive
  signal: TenantHealthSignal;
  // Liste lisible des problemes pour l'UI
  issues: string[];
};

const ADMIN_ROLES: Role[] = [Role.ADMIN, Role.RSSI, Role.SUPERADMIN];

/**
 * Calcule la sante d'un tenant donne. Toutes les requetes Prisma sont
 * faites en parallele via Promise.all pour minimiser la latence.
 */
export async function computeTenantHealth(
  tenantId: string,
): Promise<TenantHealth | null> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;
  return computeTenantHealthFromTenant(tenant);
}

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
};

async function computeTenantHealthFromTenant(
  tenant: TenantRow,
): Promise<TenantHealth> {
  const [
    totalUsers,
    activeUsers,
    admins,
    adminVerifiedCount,
    admin2FACount,
    groupCount,
    progressCount,
    lastSeen,
    phishingCampaigns,
    incidents,
  ] = await Promise.all([
    db.user.count({ where: { tenantId: tenant.id } }),
    db.user.count({ where: { tenantId: tenant.id, isActive: true } }),
    db.user.count({
      where: {
        tenantId: tenant.id,
        isActive: true,
        role: { in: ADMIN_ROLES },
      },
    }),
    db.user.count({
      where: {
        tenantId: tenant.id,
        isActive: true,
        role: { in: ADMIN_ROLES },
        emailVerified: { not: null },
      },
    }),
    db.user.count({
      where: {
        tenantId: tenant.id,
        isActive: true,
        role: { in: ADMIN_ROLES },
        mfaEnabled: true,
      },
    }),
    db.group.count({ where: { tenantId: tenant.id } }),
    db.progress.count({
      where: { tenantId: tenant.id, status: "COMPLETED" },
    }),
    db.user.aggregate({
      where: { tenantId: tenant.id, lastSeenAt: { not: null } },
      _max: { lastSeenAt: true },
    }),
    db.phishingCampaign.count({ where: { tenantId: tenant.id } }),
    db.incidentResponse.count({ where: { tenantId: tenant.id } }),
  ]);

  const lastActivityAt = lastSeen._max.lastSeenAt ?? null;
  const lastActivityDays = lastActivityAt
    ? Math.floor((Date.now() - lastActivityAt.getTime()) / (24 * 3600 * 1000))
    : null;

  const adminActif = admins > 0;
  const adminVerified = adminVerifiedCount > 0;
  const admin2FA = admin2FACount > 0;
  const hasGroups = groupCount > 0;
  const hasUsers = totalUsers > 0;
  const hasProgress = progressCount > 0;

  const plan = normalizePlan(tenant.plan);

  // Coherence plan : si une feature payante est utilisee mais plan trop bas
  const planMismatches: string[] = [];
  const planRankActual = PLAN_RANK[plan];
  if (
    phishingCampaigns > 0 &&
    planRankActual < PLAN_RANK[FEATURE_MIN_PLAN.phishing]
  ) {
    planMismatches.push(
      `phishing utilisé (${phishingCampaigns}) mais plan ${plan} (requis : ${FEATURE_MIN_PLAN.phishing}+)`,
    );
  }
  if (
    incidents > 0 &&
    planRankActual < PLAN_RANK[FEATURE_MIN_PLAN.incidents]
  ) {
    planMismatches.push(
      `incidents utilisé (${incidents}) mais plan ${plan} (requis : ${FEATURE_MIN_PLAN.incidents}+)`,
    );
  }

  // Construction de la liste lisible des problemes + signal global
  const issues: string[] = [];
  if (!adminActif) issues.push("Aucun administrateur actif");
  if (adminActif && !adminVerified) issues.push("Email admin non vérifié");
  if (adminActif && !admin2FA) issues.push("Aucun admin avec 2FA activée");
  if (!hasUsers) issues.push("Aucun utilisateur");
  if (hasUsers && !hasProgress) issues.push("Aucune progression enregistrée");
  if (planMismatches.length > 0) issues.push(...planMismatches);
  if (lastActivityDays !== null && lastActivityDays > 90) {
    issues.push(`Aucune activité depuis ${lastActivityDays} jours (risque churn)`);
  } else if (lastActivityDays !== null && lastActivityDays > 30) {
    issues.push(`Activité faible (${lastActivityDays} jours sans connexion)`);
  } else if (lastActivityDays === null && hasUsers) {
    issues.push("Aucune connexion enregistrée");
  }

  // Signal :
  //  - error si bloquant (pas d'admin, plan mismatch grave, churn risk)
  //  - warn si signaux faibles (2FA absent, activite faible)
  //  - ok sinon
  let signal: TenantHealthSignal = "ok";
  if (
    !adminActif ||
    planMismatches.length > 0 ||
    (lastActivityDays !== null && lastActivityDays > 90)
  ) {
    signal = "error";
  } else if (
    !adminVerified ||
    !admin2FA ||
    !hasUsers ||
    !hasProgress ||
    (lastActivityDays !== null && lastActivityDays > 30)
  ) {
    signal = "warn";
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    plan,
    createdAt: tenant.createdAt,
    totalUsers,
    activeUsers,
    adminCount: admins,
    groupCount,
    adminActif,
    adminVerified,
    admin2FA,
    hasGroups,
    hasUsers,
    hasProgress,
    lastActivityAt,
    lastActivityDays,
    planMismatches,
    signal,
    issues,
  };
}

/**
 * Liste tous les tenants avec leur sante. Utilise par /superadmin/tenants.
 * Optimise : on charge tous les tenants en une fois puis on calcule en
 * parallele.
 */
export async function listAllTenantsHealth(): Promise<TenantHealth[]> {
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      createdAt: true,
    },
  });
  return Promise.all(tenants.map((t) => computeTenantHealthFromTenant(t)));
}

/**
 * KPIs globaux derives. Utilise pour le bandeau du dashboard /superadmin.
 */
export type GlobalKpis = {
  totalTenants: number;
  byPlan: Record<PlanId, number>;
  bySignal: Record<TenantHealthSignal, number>;
  totalUsers: number;
  totalActiveUsers: number;
  newTenantsLast7d: number;
  newTenantsLast30d: number;
};

export function computeGlobalKpis(healths: TenantHealth[]): GlobalKpis {
  const byPlan: Record<PlanId, number> = {
    starter: 0,
    pro: 0,
    enterprise: 0,
  };
  const bySignal: Record<TenantHealthSignal, number> = {
    ok: 0,
    warn: 0,
    error: 0,
  };
  let totalUsers = 0;
  let totalActiveUsers = 0;
  const now = Date.now();
  const ms7 = 7 * 24 * 3600 * 1000;
  const ms30 = 30 * 24 * 3600 * 1000;
  let newTenantsLast7d = 0;
  let newTenantsLast30d = 0;

  for (const h of healths) {
    byPlan[h.plan]++;
    bySignal[h.signal]++;
    totalUsers += h.totalUsers;
    totalActiveUsers += h.activeUsers;
    const age = now - h.createdAt.getTime();
    if (age <= ms7) newTenantsLast7d++;
    if (age <= ms30) newTenantsLast30d++;
  }

  return {
    totalTenants: healths.length,
    byPlan,
    bySignal,
    totalUsers,
    totalActiveUsers,
    newTenantsLast7d,
    newTenantsLast30d,
  };
}
