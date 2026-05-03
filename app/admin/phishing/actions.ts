"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTemplate } from "@/lib/phishing";
import { generateTrackingToken } from "@/lib/crypto";
import type { PhishingTemplate } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") throw new Error("forbidden");
  return { tenantId: (session.user as any).tenantId as string };
}

export async function launchCampaign(formData: FormData) {
  const { tenantId } = await requireAdmin();
  const templateId = formData.get("template") as string;
  const targetService = formData.get("service") as string; // "" = tous les services

  const tpl = getTemplate(templateId);
  if (!tpl) throw new Error("invalid_template");

  // Cibles : tous les apprenants actifs (eventuellement filtres par service)
  const targets = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER"] },
      ...(targetService ? { service: targetService } : {}),
    },
  });
  if (targets.length === 0) throw new Error("no_targets");

  const campaign = await db.phishingCampaign.create({
    data: {
      tenantId,
      title: tpl.name,
      template: templateId as PhishingTemplate,
      scheduledAt: new Date(),
      sentAt: new Date(),
      isActive: true,
    },
  });

  // Cree un PhishingResult par cible avec un token unique
  await db.$transaction(
    targets.map((u) =>
      db.phishingResult.create({
        data: {
          campaignId: campaign.id,
          userId: u.id,
          trackToken: generateTrackingToken(),
          status: "SENT",
        },
      }),
    ),
  );

  // En mode demo : on simule l'envoi (log dans Event)
  // En prod : on enverrait via Resend ici (boucle sur les targets)
  await db.event.create({
    data: {
      tenantId,
      type: "phishing_campaign_launched",
      payload: {
        campaignId: campaign.id,
        template: templateId,
        targets: targets.length,
        demo: process.env.DEMO_MODE === "true",
      },
    },
  });

  revalidatePath("/admin/phishing");
  return { ok: true, campaignId: campaign.id, targets: targets.length };
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
