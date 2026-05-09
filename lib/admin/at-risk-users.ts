// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper : liste des utilisateurs vulnerables d'un tenant.
//
// Critères combinables (OR) :
//   - riskScore < threshold (defaut 40)
//   - inactif depuis daysInactive (defaut 60)
//
// Renvoie la liste enrichie : pour chaque user, on inclut le motif du
// signalement (riskScore bas / inactif / les deux), le nb de modules
// completes, la derniere activite, les groupes metier, etc.
//
// Sert :
//   - /admin/users/at-risk : page qui liste ces users
//   - /api/admin/users/at-risk/export : CSV pour le RSSI
//   - /api/admin/users/at-risk/remind : envoi rappel cible

import { db } from "@/lib/db";

export type AtRiskOptions = {
  /** Seuil riskScore en dessous duquel l'user est considere vulnerable. Defaut 40. */
  threshold?: number;
  /** Nombre de jours d'inactivite a partir desquels un user est flag. Defaut 60. */
  daysInactive?: number;
};

export type AtRiskUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  service: string | null;
  riskScore: number;
  daysSinceActivity: number | null;
  completedEpisodes: number;
  /** Motif principal pour affichage en tete : "low_score" | "inactive" | "both" */
  reason: "low_score" | "inactive" | "both";
  groupBadges: { name: string; emoji: string; color: string | null }[];
};

export async function listAtRiskUsers(
  tenantId: string,
  opts: AtRiskOptions = {},
): Promise<{
  users: AtRiskUser[];
  filters: { threshold: number; daysInactive: number };
  totals: { lowScore: number; inactive: number; both: number; total: number };
}> {
  const threshold = Math.max(0, Math.min(100, opts.threshold ?? 40));
  const daysInactive = Math.max(7, Math.min(365, opts.daysInactive ?? 60));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysInactive);

  // On recupere TOUS les users actifs LEARNER/MANAGER, puis on filtre
  // cote app (le critere "inactivite" est complexe a exprimer en SQL
  // avec le derniere completion). Volume faible (< quelques milliers/
  // tenant), ok pour ne pas optimiser.
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
      role: true,
      service: true,
      riskScore: true,
      createdAt: true,
      progress: {
        where: { status: "COMPLETED" },
        select: { completedAt: true },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
      _count: {
        select: { progress: { where: { status: "COMPLETED" } } },
      },
      groups: {
        select: {
          group: { select: { name: true, emoji: true, color: true } },
        },
      },
    },
  });

  const enriched = users.map((u) => {
    // Si jamais d'activite, on prend createdAt comme reference (un user
    // cree il y a 90j sans aucune action est "inactif depuis 90j").
    const lastActivity = u.progress[0]?.completedAt ?? u.createdAt;
    const daysSinceActivity = Math.floor(
      (Date.now() - lastActivity.getTime()) / (24 * 3600 * 1000),
    );

    const lowScore = u.riskScore < threshold;
    const inactive = daysSinceActivity >= daysInactive;
    if (!lowScore && !inactive) return null;

    const reason: AtRiskUser["reason"] =
      lowScore && inactive ? "both" : lowScore ? "low_score" : "inactive";

    const result: AtRiskUser = {
      id: u.id,
      name: u.name ?? u.email.split("@")[0],
      email: u.email,
      role: u.role,
      service: u.service,
      riskScore: u.riskScore,
      daysSinceActivity,
      completedEpisodes: u._count.progress,
      reason,
      groupBadges: u.groups.map((ug) => ({
        name: ug.group.name,
        emoji: ug.group.emoji,
        color: ug.group.color,
      })),
    };
    return result;
  });

  const filtered = enriched.filter((u): u is AtRiskUser => u !== null);

  // Tri : "both" en premier (les pires), puis riskScore croissant
  const sorted = filtered.sort((a, b) => {
    const order = { both: 0, low_score: 1, inactive: 2 } as const;
    if (order[a.reason] !== order[b.reason])
      return order[a.reason] - order[b.reason];
    return a.riskScore - b.riskScore;
  });

  const totals = {
    lowScore: sorted.filter((u) => u.reason === "low_score").length,
    inactive: sorted.filter((u) => u.reason === "inactive").length,
    both: sorted.filter((u) => u.reason === "both").length,
    total: sorted.length,
  };

  return {
    users: sorted,
    filters: { threshold, daysInactive },
    totals,
  };
}
