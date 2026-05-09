// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : declenche les campagnes phishing programmees (scheduledAt
// dans le passe, sentAt null, isActive=true). Idempotent : une campagne
// deja "sent" ne sera pas reprocessee.
//
// Frequence cible : toutes les heures (a planifier dans le cron OS / Vercel
// cron / GitHub Actions). Possible aussi de declencher manuellement par un
// admin pour test.
//
// Protection : header X-Cron-Secret + timing-safe compare. OU admin/RSSI/
// superadmin authentifie pour declenchement manuel.
//
// IMPORTANT : pour les campagnes EMAIL et SMS, l'envoi reel reste a la
// charge du client (Scaleway TEM ou provider tiers). Cette route ne fait
// que :
//   1. Marquer la campagne comme sentAt=now()
//   2. Creer les rows PhishingResult (status SENT, trackToken unique)
//   3. Logger un audit event PHISHING_CAMPAIGN_SENT
//
// L'envoi technique des mails/SMS est dans /app/admin/phishing/actions.ts
// ou via API tierce. Ce cron orchestre juste le scheduling.

import { NextResponse } from "next/server";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

async function checkAuth(
  req: Request,
): Promise<{ authorized: boolean; reason?: string }> {
  // 1. Cron header
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && safeEqual(cronSecret, process.env.CRON_SECRET ?? "")) {
    return { authorized: true };
  }
  // 2. Admin authentifie
  const session = await auth();
  if (!session?.user) return { authorized: false, reason: "unauthorized" };
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return { authorized: false, reason: "forbidden" };
  }
  return { authorized: true };
}

type ProcessResult = {
  campaignsLaunched: number;
  resultsCreated: number;
  errors: string[];
};

async function processDueCampaigns(): Promise<ProcessResult> {
  const now = new Date();
  const due = await db.phishingCampaign.findMany({
    where: {
      isActive: true,
      sentAt: null,
      scheduledAt: { lte: now },
    },
    include: {
      tenant: {
        select: { id: true, slug: true, name: true },
      },
    },
    take: 50, // limite par tour de cron pour eviter de surcharger
  });

  const result: ProcessResult = {
    campaignsLaunched: 0,
    resultsCreated: 0,
    errors: [],
  };

  for (const campaign of due) {
    try {
      // Cible : tous les LEARNER + MANAGER actifs du tenant. Les ADMIN
      // sont exclus pour ne pas tester ceux qui ont concu la campagne.
      // (l'admin peut creer une campagne separee s'il veut s'auto-tester).
      const targets = await db.user.findMany({
        where: {
          tenantId: campaign.tenantId,
          isActive: true,
          role: { in: ["LEARNER", "MANAGER"] },
        },
        select: { id: true },
      });

      if (targets.length === 0) {
        // Aucune cible -> on marque sentAt quand meme pour ne pas re-traiter
        await db.phishingCampaign.update({
          where: { id: campaign.id },
          data: { sentAt: now },
        });
        continue;
      }

      // Creation atomique des results (transaction)
      await db.$transaction(async (tx) => {
        await tx.phishingResult.createMany({
          data: targets.map((t) => ({
            campaignId: campaign.id,
            userId: t.id,
            trackToken: randomUUID().replace(/-/g, ""),
            status: "SENT" as const,
            sentAt: now,
          })),
          skipDuplicates: true,
        });
        await tx.phishingCampaign.update({
          where: { id: campaign.id },
          data: { sentAt: now },
        });
      });

      result.campaignsLaunched++;
      result.resultsCreated += targets.length;

      // Audit log : trace que la campagne a ete declenchee
      await auditLog({
        action: AuditActions.PHISHING_CAMPAIGN_SENT,
        outcome: "SUCCESS",
        tenantId: campaign.tenantId,
        target: {
          type: "phishing_campaign",
          id: campaign.id,
          label: campaign.title,
        },
        metadata: {
          channel: campaign.channel,
          template: campaign.template,
          recipientCount: targets.length,
          scheduledAt: campaign.scheduledAt.toISOString(),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[cron/phishing-launch] campaign ${campaign.id} failed:`,
        msg,
      );
      result.errors.push(`${campaign.id}: ${msg}`);
    }
  }

  return result;
}

export async function POST(req: Request) {
  const a = await checkAuth(req);
  if (!a.authorized) {
    return NextResponse.json(
      { error: a.reason ?? "unauthorized" },
      { status: 401 },
    );
  }

  const result = await processDueCampaigns();
  return NextResponse.json({ ok: true, ...result });
}

/** GET = preview : combien de campagnes seraient declenchees maintenant */
export async function GET(req: Request) {
  const a = await checkAuth(req);
  if (!a.authorized) {
    return NextResponse.json(
      { error: a.reason ?? "unauthorized" },
      { status: 401 },
    );
  }

  const now = new Date();
  const dueCount = await db.phishingCampaign.count({
    where: {
      isActive: true,
      sentAt: null,
      scheduledAt: { lte: now },
    },
  });
  const upcoming = await db.phishingCampaign.findMany({
    where: { isActive: true, sentAt: null, scheduledAt: { gt: now } },
    orderBy: { scheduledAt: "asc" },
    take: 5,
    select: {
      id: true,
      title: true,
      channel: true,
      scheduledAt: true,
      tenant: { select: { slug: true } },
    },
  });
  return NextResponse.json({
    dueNow: dueCount,
    nextScheduled: upcoming,
  });
}
