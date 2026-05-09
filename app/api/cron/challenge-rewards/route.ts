// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : distribution des recompenses des TeamChallenge
// termines (mai 2026).
//
// Pour chaque challenge dont :
//   - endDate <= now()
//   - rewardsDistributedAt IS NULL
//   - (rewardCoins > 0 OR rewardItemId is set)
//
// On classe les participants par XP gagnes pendant la fenetre
// [startDate, endDate] et on distribue :
//   - Top 1 : 50% des rewardCoins + rewardItem (si defini)
//   - Top 2 : 30% des rewardCoins + rewardItem
//   - Top 3 : 20% des rewardCoins + rewardItem
//
// On marque rewardsDistributedAt pour idempotence : un challenge ne
// peut être récompense qu'une fois.
//
// Fréquence recommandee : 1x/jour (après minuit UTC).

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function verifySecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || expected.length < 16) return false;
  if (!provided || provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

const PODIUM_PCT: number[] = [0.5, 0.3, 0.2];

async function distributeAllPending(): Promise<{
  challenges: number;
  rewardedUsers: number;
  totalCoins: number;
  errors: { challengeId: string; error: string }[];
}> {
  const now = new Date();
  // Seul les challenges termines + non encore recompenses + qui ont
  // au moins une récompense definie
  const pendingChallenges = await db.teamChallenge.findMany({
    where: {
      endDate: { lte: now },
      rewardsDistributedAt: null,
      OR: [{ rewardCoins: { gt: 0 } }, { rewardItemId: { not: null } }],
    },
    select: {
      id: true,
      tenantId: true,
      title: true,
      startDate: true,
      endDate: true,
      rewardCoins: true,
      rewardItemId: true,
    },
  });

  let rewardedUsers = 0;
  let totalCoins = 0;
  const errors: { challengeId: string; error: string }[] = [];

  for (const c of pendingChallenges) {
    try {
      // Top 3 par XP gagne pendant la fenetre du challenge.
      // On prend Progress.completedAt dans [startDate, endDate] avec
      // status COMPLETED, group by user, sum(score).
      const completedDuring = await db.progress.findMany({
        where: {
          tenantId: c.tenantId,
          status: "COMPLETED",
          completedAt: { gte: c.startDate, lte: c.endDate },
        },
        select: { userId: true, score: true },
      });

      // Aggrege par userId
      const xpByUser = new Map<string, number>();
      for (const p of completedDuring) {
        xpByUser.set(p.userId, (xpByUser.get(p.userId) ?? 0) + (p.score ?? 0));
      }

      // Top 3 trie desc, exclude scores nuls
      const top3 = Array.from(xpByUser.entries())
        .filter(([, xp]) => xp > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (top3.length === 0) {
        // Personne n'a participe : on marque distribue (pour ne pas
        // re-tenter chaque jour) mais on ne distribue rien.
        await db.teamChallenge.update({
          where: { id: c.id },
          data: { rewardsDistributedAt: new Date() },
        });
        continue;
      }

      // Distribution
      let coinsDistributed = 0;
      for (let i = 0; i < top3.length; i++) {
        const [userId] = top3[i];
        const pct = PODIUM_PCT[i] ?? 0;
        const coins = Math.round(c.rewardCoins * pct);

        if (coins > 0) {
          await db.user.update({
            where: { id: userId },
            data: { coins: { increment: coins } },
          });
          coinsDistributed += coins;
        }

        // Item exclusif : on cree une row UserInventory pour le top 3 si l'item
        // n'est pas déjà possede.
        if (c.rewardItemId) {
          try {
            await db.userInventory.create({
              data: {
                userId,
                itemId: c.rewardItemId,
                isEquipped: false,
              },
            });
          } catch {
            // Probable : l'user possede déjà l'item (UNIQUE constraint).
            // Pas grave, on continue.
          }
        }

        await db.event.create({
          data: {
            tenantId: c.tenantId,
            userId,
            type: "challenge_reward_received",
            payload: {
              challengeId: c.id,
              challengeTitle: c.title,
              podiumRank: i + 1,
              coins,
              itemId: c.rewardItemId ?? null,
            },
          },
        });

        rewardedUsers++;
      }

      // Marque le challenge distribue + total coins
      await db.teamChallenge.update({
        where: { id: c.id },
        data: { rewardsDistributedAt: new Date() },
      });
      totalCoins += coinsDistributed;
    } catch (e) {
      errors.push({
        challengeId: c.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    challenges: pendingChallenges.length,
    rewardedUsers,
    totalCoins,
    errors,
  };
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await distributeAllPending();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await distributeAllPending();
  return NextResponse.json({ ok: true, ...result });
}
