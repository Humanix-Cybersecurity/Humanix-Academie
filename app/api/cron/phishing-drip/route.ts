// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Cron : envoi des PhishingResult drip-planifies qui sont arrives a echeance.
//
// PHASE 7b (juin 2026) -- Drip campaigns :
//   Pour chaque PhishingResult avec :
//     - dripScheduledAt <= now (arrivé à échéance)
//     - mailDispatchedAt IS NULL (pas encore envoye)
//     - campaign.isActive (pas annulee)
//   On envoie le mail via le SMTP du tenant et on set mailDispatchedAt.
//
// FREQUENCE CIBLE : toutes les heures (planifie en cron OS / Vercel cron /
// GitHub Actions / Scaleway Cron). Le cron principal /api/cron/phishing-launch
// reste pour le lancement initial des campagnes. Ce cron est pour le suivi
// drip post-lancement.
//
// AUTH : header X-Cron-Secret + timing-safe compare (même pattern que
// phishing-launch). Ou admin authentifie pour declenchement manuel.
//
// LIMITE PAR TOUR : 200 mails par invocation pour éviter de trop charger
// le SMTP du tenant + respecter le timeout maxDuration de la lambda
// (Vercel = 10s default).

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendMailViaTenantSmtp } from "@/lib/smtp/sender";
import {
  getEmailTemplateBySlug,
  renderEmailHtml,
} from "@/lib/phishing/email-template";
import { injectTrackingPixel } from "@/lib/phishing";

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
): Promise<{ authorized: boolean; scopeTenantId?: string | null }> {
  // CRON_SECRET (machine) -> global. Session admin -> scope a SON tenant
  // (anti cross-tenant : on ne traite jamais le drip d'autres tenants).
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && safeEqual(cronSecret, process.env.CRON_SECRET ?? "")) {
    return { authorized: true, scopeTenantId: null };
  }
  const session = await auth();
  if (!session?.user) return { authorized: false };
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return { authorized: false };
  }
  return { authorized: true, scopeTenantId: session.user.tenantId as string };
}

type DripProcessResult = {
  picked: number;
  sent: number;
  failed: number;
  errors: string[];
};

async function processDueDripResults(
  scopeTenantId: string | null,
): Promise<DripProcessResult> {
  const now = new Date();
  // On limite a 200 par tour pour eviter de saturer le SMTP du tenant.
  const due = await db.phishingResult.findMany({
    where: {
      mailDispatchedAt: null,
      dripScheduledAt: { lte: now },
      campaign: {
        isActive: true,
        ...(scopeTenantId ? { tenantId: scopeTenantId } : {}),
      },
    },
    include: {
      campaign: { select: { id: true, tenantId: true, template: true, variantBSlug: true } },
      user: { select: { email: true, name: true } },
    },
    take: 200,
    orderBy: { dripScheduledAt: "asc" },
  });

  const result: DripProcessResult = {
    picked: due.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-academie.fr";
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  // Cache des templates par cle "tenantId:slug" pour eviter de re-fetch
  // a chaque iteration (200 items potentiels).
  const tplCache = new Map<string, Awaited<ReturnType<typeof getEmailTemplateBySlug>>>();
  async function getCached(tenantId: string, slug: string) {
    const key = `${tenantId}:${slug}`;
    if (tplCache.has(key)) return tplCache.get(key)!;
    const tpl = await getEmailTemplateBySlug(tenantId, slug);
    tplCache.set(key, tpl);
    return tpl;
  }

  for (const r of due) {
    try {
      // Selection du template selon variant (A = campaign.template, B = variantBSlug)
      const slug =
        r.variant === "B" && r.campaign.variantBSlug
          ? r.campaign.variantBSlug
          : r.campaign.template;
      const tpl = await getCached(r.campaign.tenantId, slug);
      if (!tpl) {
        result.failed++;
        result.errors.push(`${r.id}: template ${slug} introuvable`);
        continue;
      }

      const firstName = (r.user.name?.split(" ")[0] ?? "").trim();
      const trackingUrl = `${cleanBaseUrl}/phishing/${r.trackToken}`;
      const pixelUrl = `${cleanBaseUrl}/api/phishing/track/open/${r.trackToken}`;
      const lureHtml = renderEmailHtml(tpl, firstName, trackingUrl);
      const html = injectTrackingPixel(lureHtml, pixelUrl);

      const sendResult = await sendMailViaTenantSmtp(r.campaign.tenantId, {
        to: r.user.email,
        subject: tpl.emailSubject,
        html,
      });

      if (sendResult.ok) {
        await db.phishingResult.update({
          where: { id: r.id },
          data: { mailDispatchedAt: new Date() },
        });
        result.sent++;
      } else {
        result.failed++;
        // SMTP HS : on stoppe la campagne entiere pour ce tenant (les autres
        // results suivront le meme sort, autant arreter le massacre).
        if (
          sendResult.reason === "smtp_not_configured" ||
          sendResult.reason === "smtp_decrypt_failed"
        ) {
          await db.phishingCampaign.update({
            where: { id: r.campaign.id },
            data: { isActive: false },
          });
          result.errors.push(
            `${r.campaign.id}: SMTP HS, campagne marquee inactive`,
          );
          break;
        }
      }
    } catch (e) {
      result.failed++;
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${r.id}: ${msg}`);
    }
  }

  return result;
}

export async function POST(req: Request) {
  const a = await checkAuth(req);
  if (!a.authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await processDueDripResults(a.scopeTenantId ?? null);
  return NextResponse.json({ ok: true, ...result });
}

/** GET = preview : combien de results seraient envoyes maintenant */
export async function GET(req: Request) {
  const a = await checkAuth(req);
  if (!a.authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scope = a.scopeTenantId ?? null;
  const now = new Date();
  const dueCount = await db.phishingResult.count({
    where: {
      mailDispatchedAt: null,
      dripScheduledAt: { lte: now },
      campaign: {
        isActive: true,
        ...(scope ? { tenantId: scope } : {}),
      },
    },
  });
  const upcomingCount = await db.phishingResult.count({
    where: {
      mailDispatchedAt: null,
      dripScheduledAt: { gt: now },
      campaign: {
        isActive: true,
        ...(scope ? { tenantId: scope } : {}),
      },
    },
  });
  return NextResponse.json({
    dueNow: dueCount,
    upcomingDrip: upcomingCount,
  });
}
