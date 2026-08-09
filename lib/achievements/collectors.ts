// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Classement des collectionneurs de badges (#752).
//
// Achievement.points ("points de gloire", independants de l'XP gameplay)
// n'etait somme que sur /profil/badges, pour soi. Le commentaire du schema
// annoncait un "futur classement des collectionneurs" : le voici.
//
// Pourquoi c'est permanent (contrairement a /classement, limite a la duree
// d'un challenge) : l'index @@index([tenantId, unlockedAt]) sur
// UserAchievement est deja denormalise exactement pour ca, et la collection
// de badges est un cumul de long terme — la remettre a zero n'aurait pas
// de sens.
//
// PERIMETRE : un seul tenant a la fois (jamais de comparaison inter-tenant).
// Les points viennent du CATALOGUE en memoire, pas de la colonne
// Achievement.points : le catalogue est la source de verite du gameplay
// (cf. lib/achievements/evaluate.ts qui l'utilise pour debloquer).

import { db } from "@/lib/db";
import { ACHIEVEMENTS_BY_SLUG } from "./catalog";

export type CollectorRow = {
  rank: number;
  userId: string;
  name: string;
  service: string | null;
  badgeCount: number;
  points: number;
  /** Date du dernier badge debloque : depart les ex aequo. */
  lastUnlockedAt: Date;
};

/** Nombre de lignes affichees dans le classement public. */
export const COLLECTORS_LIMIT = 20;

/**
 * Classement des collectionneurs d'un tenant, trie par points de gloire
 * decroissants. Ex aequo departages par nombre de badges puis par
 * anteriorite du dernier deblocage (celui qui y est arrive en premier
 * passe devant).
 *
 * Les users inactifs (suspendus, anonymises) sont exclus : ils ne doivent
 * pas occuper le podium d'une equipe.
 */
export async function getCollectorsRanking(
  tenantId: string,
  limit = COLLECTORS_LIMIT,
): Promise<CollectorRow[]> {
  const unlocks = await db.userAchievement.findMany({
    where: {
      tenantId,
      user: { isActive: true, role: { in: ["LEARNER", "MANAGER"] } },
    },
    select: {
      userId: true,
      unlockedAt: true,
      achievement: { select: { slug: true } },
      user: { select: { name: true, service: true } },
    },
  });

  const byUser = new Map<string, CollectorRow>();
  for (const u of unlocks) {
    // Un badge retire du catalogue ne rapporte plus de points, mais la
    // ligne UserAchievement peut subsister : on l'ignore silencieusement.
    const def = ACHIEVEMENTS_BY_SLUG[u.achievement.slug];
    if (!def) continue;

    const existing = byUser.get(u.userId);
    if (existing) {
      existing.badgeCount += 1;
      existing.points += def.points;
      if (u.unlockedAt > existing.lastUnlockedAt) {
        existing.lastUnlockedAt = u.unlockedAt;
      }
    } else {
      byUser.set(u.userId, {
        rank: 0, // assigne apres tri
        userId: u.userId,
        name: u.user.name ?? "-",
        service: u.user.service,
        badgeCount: 1,
        points: def.points,
        lastUnlockedAt: u.unlockedAt,
      });
    }
  }

  return [...byUser.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.badgeCount - a.badgeCount ||
        a.lastUnlockedAt.getTime() - b.lastUnlockedAt.getTime(),
    )
    .slice(0, limit)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Position d'un user dans le classement complet de son tenant (pas
 * seulement le top N), pour lui dire ou il en est meme hors podium.
 * Retourne null s'il n'a aucun badge.
 */
export async function getCollectorPosition(
  tenantId: string,
  userId: string,
): Promise<{ rank: number; total: number; points: number } | null> {
  // On reutilise le meme tri en demandant TOUT le classement : le volume
  // est borne par le nombre d'users du tenant (PME : ~qq centaines).
  const full = await getCollectorsRanking(tenantId, Number.MAX_SAFE_INTEGER);
  const idx = full.findIndex((r) => r.userId === userId);
  if (idx === -1) return null;
  return { rank: idx + 1, total: full.length, points: full[idx].points };
}
