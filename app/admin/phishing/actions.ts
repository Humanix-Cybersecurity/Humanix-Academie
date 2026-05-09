"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTemplate } from "@/lib/phishing";
import { generateTrackingToken } from "@/lib/crypto";
import { sendMailViaTenantSmtp } from "@/lib/smtp/sender";
import type { PhishingTemplate } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") throw new Error("forbidden");
  return { tenantId: session.user!.tenantId as string };
}

export type LaunchCampaignResult =
  | {
      ok: true;
      campaignId: string;
      targets: number;
      sent: number;
      failed: number;
      simulated: boolean; // true en DEMO_MODE (pas d'envoi reel)
    }
  | {
      ok: false;
      error:
        | "invalid_template"
        | "no_targets"
        | "smtp_not_configured"
        | "smtp_decrypt_failed"
        | "unauthorized"
        | "forbidden";
      message?: string;
    };

export async function launchCampaign(
  formData: FormData,
): Promise<LaunchCampaignResult> {
  let tenantId: string;
  try {
    ({ tenantId } = await requireAdmin());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error:
        msg === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  const templateId = formData.get("template") as string;
  const targetService = formData.get("service") as string; // "" = tous les services

  const tpl = getTemplate(templateId);
  if (!tpl) {
    return { ok: false, error: "invalid_template" };
  }

  // Cibles : tous les apprenants actifs (eventuellement filtres par service)
  const targets = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER"] },
      ...(targetService ? { service: targetService } : {}),
    },
    select: { id: true, email: true, name: true },
  });
  if (targets.length === 0) {
    return { ok: false, error: "no_targets" };
  }

  // PRECHECK SMTP (sauf en mode demo : on simule l'envoi)
  // Cette PR cable le SMTP tenant pour les envois reels. Si l'admin n'a
  // pas configure son SMTP via /admin/smtp, on refuse de creer la
  // campagne pour eviter les phishing "fantomes" (creees mais jamais
  // envoyees).
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
          "Aucun serveur SMTP configuré pour ton tenant. Va sur /admin/smtp pour le paramétrer (ou nous contacter pour une prestation au forfait).",
      };
    }
    // SMTP configure mais jamais teste / dernier test echoue : on autorise
    // quand meme l'envoi (l'admin a peut-etre voulu tenter directement),
    // mais on logue dans le retour pour traque cote UI.
  }

  const campaign = await db.phishingCampaign.create({
    data: {
      tenantId,
      title: tpl.name,
      template: templateId as PhishingTemplate,
      scheduledAt: new Date(),
      sentAt: null, // sera mis a now() apres envoi reel
      isActive: true,
    },
  });

  // Cree un PhishingResult par cible avec un token unique
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

  // ENVOI REEL via le SMTP du tenant (sauf en mode demo)
  let sent = 0;
  let failed = 0;
  if (isDemoMode) {
    // Mode demo : pas d'envoi reel, on simule.
    sent = results.length;
  } else {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-academie.fr";
    // Boucle sequentielle (eviter de spammer le SMTP, eviter rate limit
    // provider). Pour scale > 100 targets, faudra un job queue async.
    for (const r of results) {
      const target = targets.find((t) => t.id === r.userId);
      if (!target) {
        failed++;
        continue;
      }
      const firstName = (target.name?.split(" ")[0] ?? "").trim();
      const trackingUrl = `${baseUrl.replace(/\/$/, "")}/phishing/${r.trackToken}`;
      const html = tpl.emailHtml(firstName, trackingUrl);
      const sendResult = await sendMailViaTenantSmtp(tenantId, {
        to: target.email,
        subject: tpl.emailSubject,
        html,
      });
      if (sendResult.ok) {
        sent++;
      } else {
        failed++;
        // Si le SMTP n'est pas configure correctement, on s'arrete tot
        // (pas la peine de tenter les 99 autres mails).
        if (
          sendResult.reason === "smtp_not_configured" ||
          sendResult.reason === "smtp_decrypt_failed"
        ) {
          // On marque la campagne comme inactive pour ne pas la voir
          // comme "en cours" alors qu'elle ne peut pas envoyer.
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
    // Marque la campagne comme envoyee (au moins partiellement)
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
      },
    },
  });

  revalidatePath("/admin/phishing");
  return {
    ok: true,
    campaignId: campaign.id,
    targets: targets.length,
    sent,
    failed,
    simulated: isDemoMode,
  };
}

export async function stopCampaign(campaignId: string) {
  const { tenantId } = await requireAdmin();
  const c = await db.phishingCampaign.findUnique({ where: { id: campaignId } });
  if (!c || c.tenantId !== tenantId) throw new Error("not_found");
  await db.phishingCampaign.update({
    where: { id: campaignId },
    data: { isActive: false },
  });
  revalidatePath("/admin/phishing");
  return { ok: true };
}

// Pour la demo : simule des clics aleatoires sur une campagne (effet "regarde les stats bouger")
export async function simulateClicks(campaignId: string) {
  const { tenantId } = await requireAdmin();
  const c = await db.phishingCampaign.findUnique({ where: { id: campaignId } });
  if (!c || c.tenantId !== tenantId) throw new Error("not_found");

  const sentResults = await db.phishingResult.findMany({
    where: { campaignId, status: "SENT" },
    take: 50,
  });

  // 30% cliquent, 15% signalent
  const updates = sentResults.map((r) => {
    const rand = Math.random();
    if (rand < 0.3) {
      return db.phishingResult.update({
        where: { id: r.id },
        data: { status: "CLICKED", clickedAt: new Date() },
      });
    }
    if (rand < 0.45) {
      return db.phishingResult.update({
        where: { id: r.id },
        data: { status: "REPORTED", reportedAt: new Date() },
      });
    }
    return null;
  });
  await db.$transaction(updates.filter(Boolean) as any[]);

  revalidatePath("/admin/phishing");
  return { ok: true };
}
