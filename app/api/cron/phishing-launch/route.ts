// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : declenche les campagnes phishing programmees (scheduledAt
// dans le passe, sentAt null, isActive=true). Idempotent : une campagne
// déjà "sent" ne sera pas reprocessee.
//
// Fréquence cible : toutes les heures (a planifier dans le cron OS / Vercel
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
//   2. Créer les rows PhishingResult (status SENT, trackToken unique)
//   3. Logger un audit event PHISHING_CAMPAIGN_SENT
//
// L'envoi technique des mails/SMS est dans /app/admin/phishing/actions.ts
// ou via API tierce. Ce cron orchestre juste le scheduling.

import { NextResponse } from "next/server";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { sendMailViaTenantSmtp } from "@/lib/smtp/sender";
import { getTemplate } from "@/lib/phishing";

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
  campaignsSkippedNoSmtp: number;
  resultsCreated: number;
  emailsSent: number;
  emailsFailed: number;
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
    take: 50, // limite par tour de cron pour éviter de surcharger
  });

  const result: ProcessResult = {
    campaignsLaunched: 0,
    campaignsSkippedNoSmtp: 0,
    resultsCreated: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-academie.fr";

  for (const campaign of due) {
    try {
      // Cible : tous les LEARNER + MANAGER actifs du tenant. Les ADMIN
      // sont exclus pour ne pas tester ceux qui ont concu la campagne.
      // (l'admin peut créer une campagne separee s'il veut s'auto-tester).
      const targets = await db.user.findMany({
        where: {
          tenantId: campaign.tenantId,
          isActive: true,
          role: { in: ["LEARNER", "MANAGER"] },
        },
        select: { id: true, email: true, name: true },
      });

      if (targets.length === 0) {
        // Aucune cible -> on marque sentAt quand même pour ne pas re-traiter
        await db.phishingCampaign.update({
          where: { id: campaign.id },
          data: { sentAt: now },
        });
        continue;
      }

      // Verifier que le SMTP du tenant est configure AVANT de créer les
      // results. Si non configure, on saute la campagne (l'admin doit
      // aller sur /admin/smtp). On ne marque pas sentAt pour qu'elle soit
      // retentee au prochain tour de cron, dans l'eventualite ou l'admin
      // configure le SMTP entre-temps.
      if (campaign.channel === "EMAIL") {
        const smtpCfg = await db.tenantSmtpConfig.findUnique({
          where: { tenantId: campaign.tenantId },
          select: { id: true },
        });
        if (!smtpCfg) {
          result.campaignsSkippedNoSmtp++;
          result.errors.push(
            `${campaign.id}: SMTP non configure pour tenant ${campaign.tenant.slug}`,
          );
          continue;
        }
      }

      // Creation atomique des results (transaction)
      const created = await db.$transaction(async (tx) => {
        const data = targets.map((t) => ({
          campaignId: campaign.id,
          userId: t.id,
          trackToken: randomUUID().replace(/-/g, ""),
          status: "SENT" as const,
          sentAt: now,
        }));
        await tx.phishingResult.createMany({ data, skipDuplicates: true });
        // Re-fetch pour avoir trackToken (createMany ne return rien sur SQLite)
        const fresh = await tx.phishingResult.findMany({
          where: { campaignId: campaign.id },
          select: { id: true, userId: true, trackToken: true },
        });
        return fresh;
      });

      result.campaignsLaunched++;
      result.resultsCreated += created.length;

      // Envoi reel des emails via le SMTP du tenant (channel EMAIL only).
      // Pour SMS / QUISHING : pas d'envoi technique automatique a ce stade
      // (SMS via Octopush/Brevo client a brancher en V2, QUISHING = print physique).
      if (campaign.channel === "EMAIL") {
        const tpl = getTemplate(campaign.template);
        if (!tpl) {
          result.errors.push(
            `${campaign.id}: template ${campaign.template} introuvable`,
          );
        } else {
          for (const r of created) {
            const target = targets.find((t) => t.id === r.userId);
            if (!target) continue;
            const firstName = (target.name?.split(" ")[0] ?? "").trim();
            const trackingUrl = `${baseUrl.replace(/\/$/, "")}/phishing/${r.trackToken}`;
            const html = tpl.emailHtml(firstName, trackingUrl);
            const sendResult = await sendMailViaTenantSmtp(
              campaign.tenantId,
              {
                to: target.email,
                subject: tpl.emailSubject,
                html,
              },
            );
            if (sendResult.ok) {
              result.emailsSent++;
            } else {
              result.emailsFailed++;
            }
          }
        }
      }

      // Marque sentAt après traitement
      await db.phishingCampaign.update({
        where: { id: campaign.id },
        data: { sentAt: now },
      });

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
