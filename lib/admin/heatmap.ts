// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper : matrice de completion (Groupe metier x Saison) pour la
// heatmap RSSI / DSI.
//
// Pour chaque cellule (groupe G, saison S) on calcule :
//   completion% = nb episodes de S completes par les users du groupe G
//                 / (nb episodes de S * nb users du groupe G)
//
// Volume : N groupes (5-10) x M saisons (5-15) = 50-150 cellules. La
// query est plate-forme : on charge tout en memoire et on reduce. Ok
// jusqu'a quelques milliers d'users / tenant ; au-dela faudra
// materialiser (nightly snapshot) comme RiskScoreSnapshot.

// Lectures pures pour la heatmap : on passe par le client read-only.
// Cf. lib/db-readonly.ts (fallback automatique sur db si pas configure).
import { dbReadOnly as db } from "@/lib/db-readonly";

export type HeatmapCell = {
  groupSlug: string;
  saisonId: string;
  /** Nb users du groupe inclus dans le calcul */
  userCount: number;
  /** Nb episodes publies dans la saison */
  episodeCount: number;
  /** Nb total de progression COMPLETED des users du groupe sur cette saison */
  completedCount: number;
  /** Pourcentage 0-100 de completion. 0 si pas de population ou pas d'episodes. */
  completionPct: number;
};

export type HeatmapData = {
  groups: { slug: string; name: string; emoji: string; userCount: number }[];
  saisons: { id: string; slug: string; title: string; episodeCount: number }[];
  cells: HeatmapCell[];
  /** Pour chaque saison : completion globale (tous users actifs confondus) — ligne "Tous" */
  globalSaisonCompletion: { saisonId: string; completionPct: number }[];
};

export async function computeHeatmap(tenantId: string): Promise<HeatmapData> {
  // 1) Saisons publiees vues par le tenant + count episodes publies.
  // Inclut le catalogue global (tenantId: null) ET les saisons custom du
  // tenant (tenantId match). Sans le branch "tenantId: null" la heatmap
  // restait vide car la quasi-totalite du contenu pedagogique est sur
  // les saisons globales. Cf. /apprendre qui utilise le meme pattern.
  const saisonsRaw = await db.saison.findMany({
    where: {
      isPublished: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      episodes: {
        where: { isPublished: true },
        select: { id: true },
      },
    },
    orderBy: { order: "asc" },
  });
  const saisons = saisonsRaw.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    episodeCount: s.episodes.length,
  }));

  // 2) Groupes actifs + count membres LEARNER/MANAGER actifs
  const groupsRaw = await db.group.findMany({
    where: { tenantId, isActive: true },
    select: {
      slug: true,
      name: true,
      emoji: true,
      members: {
        where: {
          user: {
            isActive: true,
            role: { in: ["LEARNER", "MANAGER"] },
          },
        },
        select: { userId: true },
      },
    },
    orderBy: { name: "asc" },
  });
  const groups = groupsRaw
    .map((g) => ({
      slug: g.slug,
      name: g.name,
      emoji: g.emoji,
      userIds: g.members.map((m) => m.userId),
      userCount: g.members.length,
    }))
    .filter((g) => g.userCount > 0); // groupes vides : pas pertinent dans la heatmap

  // 3) Pour chaque (group, saison), compter les Progress COMPLETED
  // On fait 1 seule query large, puis on agrege en memoire pour eviter
  // un N+1.
  const allUserIds = Array.from(
    new Set(groups.flatMap((g) => g.userIds)),
  );
  const allSaisonIds = saisons.map((s) => s.id);

  let progressRows: { userId: string; saisonId: string }[] = [];
  if (allUserIds.length > 0 && allSaisonIds.length > 0) {
    progressRows = await db.progress.findMany({
      where: {
        userId: { in: allUserIds },
        saisonId: { in: allSaisonIds },
        status: "COMPLETED",
      },
      select: { userId: true, saisonId: true },
    });
  }

  // Index { saisonId -> Set<userId-completed-an-ep> }... mais en realite
  // on veut le NB de Progress completes par (group, saison), pas le nb
  // d'users distincts. C'est une dimension de "couverture" : si un user
  // a fait 3/3 episodes d'une saison, ca compte comme 3 (pas 1).
  // L'index plus simple : tableau key="userId|saisonId" -> count
  const completedByUserSaison = new Map<string, number>();
  for (const r of progressRows) {
    const k = `${r.userId}|${r.saisonId}`;
    completedByUserSaison.set(k, (completedByUserSaison.get(k) ?? 0) + 1);
  }

  // 4) Construire les cellules
  const cells: HeatmapCell[] = [];
  for (const g of groups) {
    for (const s of saisons) {
      let completedCount = 0;
      for (const uid of g.userIds) {
        completedCount += completedByUserSaison.get(`${uid}|${s.id}`) ?? 0;
      }
      const denom = g.userCount * s.episodeCount;
      const completionPct =
        denom === 0
          ? 0
          : Math.round((completedCount / denom) * 100);
      cells.push({
        groupSlug: g.slug,
        saisonId: s.id,
        userCount: g.userCount,
        episodeCount: s.episodeCount,
        completedCount,
        completionPct,
      });
    }
  }

  // 5) Ligne "Tous" : completion globale par saison sur TOUS les users
  // actifs du tenant (pas seulement ceux dans des groupes).
  const allActiveUsers = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER"] },
    },
    select: { id: true },
  });
  const allActiveUserCount = allActiveUsers.length;
  const allActiveUserIds = allActiveUsers.map((u) => u.id);

  let globalCompletedRows: { userId: string; saisonId: string }[] = [];
  if (allActiveUserIds.length > 0 && allSaisonIds.length > 0) {
    globalCompletedRows = await db.progress.findMany({
      where: {
        userId: { in: allActiveUserIds },
        saisonId: { in: allSaisonIds },
        status: "COMPLETED",
      },
      select: { userId: true, saisonId: true },
    });
  }
  const globalBySaison = new Map<string, number>();
  for (const r of globalCompletedRows) {
    globalBySaison.set(r.saisonId, (globalBySaison.get(r.saisonId) ?? 0) + 1);
  }

  const globalSaisonCompletion = saisons.map((s) => {
    const denom = allActiveUserCount * s.episodeCount;
    const num = globalBySaison.get(s.id) ?? 0;
    return {
      saisonId: s.id,
      completionPct: denom === 0 ? 0 : Math.round((num / denom) * 100),
    };
  });

  return {
    groups: groups.map((g) => ({
      slug: g.slug,
      name: g.name,
      emoji: g.emoji,
      userCount: g.userCount,
    })),
    saisons,
    cells,
    globalSaisonCompletion,
  };
}
