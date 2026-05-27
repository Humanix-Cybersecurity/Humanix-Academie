// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Coeur du lancement de campagne phishing : isole de toute couche
// transport (server action / API route JSON / cron) pour pouvoir etre
// reutilise depuis plusieurs entry points sans duplication.
//
// Responsabilites :
//   1. Creer la PhishingCampaign + les PhishingResult avec tokens uniques
//   2. Pre-check SMTP du tenant (en mode prod)
//   3. Envoyer les mails un par un via le SMTP du tenant
//   4. Logger un Event "phishing_campaign_launched"
//
// Ce qui est HORS scope ici :
//   - Auth / RBAC : a faire au niveau caller
//   - Resolution des cibles (services, groupes, userIds) : le caller passe
//     deja un targets[] resolu
//
// Cette extraction date de la PR "phishing par groupe" (mai 2026) qui
// ajoutait un nouveau mode de ciblage. Plutot que de faire un 2e
// launchCampaign(), on factorise pour eviter le drift.

import { db } from "@/lib/db";
import { getTemplate, injectTrackingPixel } from "@/lib/phishing";
import { generateTrackingToken } from "@/lib/crypto";
import { sendMailViaTenantSmtp } from "@/lib/smtp/sender";
import type { PhishingTemplate } from "@prisma/client";

export type LaunchTarget = {
  id: string;
  email: string;
  name: string | null;
};

export type LaunchOptions = {
  tenantId: string;
  templateId: string;
  targets: LaunchTarget[];
  /** Description de la cohorte ciblee, pour traçabilité dans Event.payload */
  targetingMode?: "all" | "service" | "groups" | "users";
  targetingDetail?: string; // ex: "groups:rh,compta" ou "service:Finance"
};

export type LaunchResult =
  | {
      ok: true;
      campaignId: string;
      targets: number;
      sent: number;
      failed: number;
      simulated: boolean;
    }
  | {
      ok: false;
      error:
        | "invalid_template"
        | "no_targets"
        | "smtp_not_configured"
        | "smtp_decrypt_failed";
      message?: string;
    };

export async function launchPhishingCampaign(
  opts: LaunchOptions,
): Promise<LaunchResult> {
  const { tenantId, templateId, targets } = opts;

  const tpl = getTemplate(templateId);
  if (!tpl) {
    return { ok: false, error: "invalid_template" };
  }
  if (targets.length === 0) {
    return { ok: false, error: "no_targets" };
  }

  // PRECHECK SMTP (sauf en demo)
  const isDemoMode = process.env.DEMO_MODE === "true";
  if (!isDemoMode) {
    const smtpCfg = await db.tenantSmtpConfig.findUnique({
      where: { tenantId },
      select: { id: true, isVerified: true },
    });
    if (!smtpCfg) {
      return {
        ok: false,
        error: "smtp_not_configured",
        message:
          "Aucun serveur SMTP configuré pour ton tenant. Va sur /admin/smtp pour le paramétrer.",
      };
    }
  }

  const campaign = await db.phishingCampaign.create({
    data: {
      tenantId,
      title: tpl.name,
      template: templateId as PhishingTemplate,
      scheduledAt: new Date(),
      sentAt: null,
      isActive: true,
    },
  });

  const results = await db.$transaction(
    targets.map((u) =>
      db.phishingResult.create({
        data: {
          campaignId: campaign.id,
          userId: u.id,
          trackToken: generateTrackingToken(),
          status: "SENT",
        },
        select: { id: true, userId: true, trackToken: true },
      }),
    ),
  );

  let sent = 0;
  let failed = 0;
  if (isDemoMode) {
    sent = results.length;
  } else {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-academie.fr";
    for (const r of results) {
      const target = targets.find((t) => t.id === r.userId);
      if (!target) {
        failed++;
        continue;
      }
      const firstName = (target.name?.split(" ")[0] ?? "").trim();
      const cleanBaseUrl = baseUrl.replace(/\/$/, "");
      const trackingUrl = `${cleanBaseUrl}/phishing/${r.trackToken}`;
      // Pixel d'open tracking : injecte en fin de HTML. Voir lib/phishing.ts
      // injectTrackingPixel() pour le rationale (faux positifs proxies, etc).
      const pixelUrl = `${cleanBaseUrl}/api/phishing/track/open/${r.trackToken}`;
      const lureHtml = tpl.emailHtml(firstName, trackingUrl);
      const html = injectTrackingPixel(lureHtml, pixelUrl);
      const sendResult = await sendMailViaTenantSmtp(tenantId, {
        to: target.email,
        subject: tpl.emailSubject,
        html,
      });
      if (sendResult.ok) {
        sent++;
      } else {
        failed++;
        // SMTP HS : on stoppe la boucle (pas la peine de tenter les 99
        // autres mails) et on marque la campagne inactive.
        if (
          sendResult.reason === "smtp_not_configured" ||
          sendResult.reason === "smtp_decrypt_failed"
        ) {
          await db.phishingCampaign.update({
            where: { id: campaign.id },
            data: { isActive: false },
          });
          return {
            ok: false,
            error: sendResult.reason,
            message: sendResult.details ?? "SMTP indisponible.",
          };
        }
      }
    }
    if (sent > 0) {
      await db.phishingCampaign.update({
        where: { id: campaign.id },
        data: { sentAt: new Date() },
      });
    }
  }

  await db.event.create({
    data: {
      tenantId,
      type: "phishing_campaign_launched",
      payload: {
        campaignId: campaign.id,
        template: templateId,
        targets: targets.length,
        sent,
        failed,
        demo: isDemoMode,
        targetingMode: opts.targetingMode ?? "all",
        targetingDetail: opts.targetingDetail ?? null,
      },
    },
  });

  return {
    ok: true,
    campaignId: campaign.id,
    targets: targets.length,
    sent,
    failed,
    simulated: isDemoMode,
  };
}
