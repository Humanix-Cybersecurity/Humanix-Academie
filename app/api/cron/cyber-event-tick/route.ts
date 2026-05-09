// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : tick quotidien du calendrier des cyber-events.
//
// Pour chaque tenant, pour chaque event actif aujourd'hui (cf.
// lib/events/calendar.ts), on cree un CyberEventInstance idempotent
// (@@unique [tenantId, eventSlug]). Si l'event est `autoChallenge`
// (Cybermois), on cree aussi un TeamChallenge avec rewardCoins.
//
// Frequence recommandee : 1x/jour (apres minuit UTC). Idempotent
// donc on peut le re-jouer sans degat.

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  CYBER_EVENTS,
  eventSlugForYear,
  type CyberEventDef,
} from "@/lib/events/calendar";

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

async function tick(): Promise<{
  tenants: number;
  eventsActivated: number;
  challengesCreated: number;
  errors: { tenantId: string; error: string }[];
}> {
  const now = new Date();
  const year = now.getUTCFullYear();

  // Events actifs aujourd'hui (intersection [startDate, endDate])
  const activeDefs: { def: CyberEventDef; startDate: Date; endDate: Date }[] =
    [];
  for (const def of CYBER_EVENTS) {
    const startDate = def.computeStartDate(year);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + def.durationDays);
    if (now >= startDate && now < endDate) {
      activeDefs.push({ def, startDate, endDate });
    }
  }

  if (activeDefs.length === 0) {
    return { tenants: 0, eventsActivated: 0, challengesCreated: 0, errors: [] };
  }

  const tenants = await db.tenant.findMany({ select: { id: true } });
  const errors: { tenantId: string; error: string }[] = [];
  let eventsActivated = 0;
  let challengesCreated = 0;

  for (const t of tenants) {
    for (const { def, startDate, endDate } of activeDefs) {
      const eventSlug = eventSlugForYear(def, year);
      try {
        // Idempotence : @@unique [tenantId, eventSlug]
        const existing = await db.cyberEventInstance.findUnique({
          where: {
            tenantId_eventSlug: {
              tenantId: t.id,
              eventSlug,
            },
          },
          select: { id: true, challengeId: true },
        });

        if (existing) {
          continue; // deja active pour ce tenant
        }

        // Auto-challenge si activé (Cybermois)
        let challengeId: string | null = null;
        if (def.autoChallenge) {
          const challenge = await db.teamChallenge.create({
            data: {
              tenantId: t.id,
              title: `${def.emoji} ${def.title}`,
              description: def.description,
              startDate,
              endDate,
              isActive: true,
              rewardCoins: def.rewardCoins,
            },
          });
          challengeId = challenge.id;
          challengesCreated++;
        }

        await db.cyberEventInstance.create({
          data: {
            tenantId: t.id,
            eventSlug,
            startDate,
            endDate,
            challengeId,
            coinsDistributed: 0, // sera mis a jour par le cron de distribution
          },
        });

        // Trace event
        await db.event.create({
          data: {
            tenantId: t.id,
            type: "cyber_event_activated",
            payload: {
              eventSlug,
              eventType: def.type,
              autoChallengeId: challengeId,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
          },
        });

        eventsActivated++;
      } catch (e) {
        errors.push({
          tenantId: t.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  return {
    tenants: tenants.length,
    eventsActivated,
    challengesCreated,
    errors,
  };
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await tick();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await tick();
  return NextResponse.json({ ok: true, ...result });
}
