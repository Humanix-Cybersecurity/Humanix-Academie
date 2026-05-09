"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions de la page /admin/phishing :
//   - launchCampaign(formData) : lance une campagne avec ciblage par
//     "groupSlugs[]" (nouveau, mai 2026) ou "service" (legacy, pour
//     compat avec les tenants qui ont des services libres non mappes a
//     un groupe). Si rien n'est specifie : tous les apprenants actifs.
//   - stopCampaign(id) : marque une campagne inactive
//   - simulateClicks(id) : remplit une campagne demo avec des clics/
//     signalements aleatoires (effet "regarde les stats bouger")
//
// La logique d'envoi (creation BDD, boucle SMTP, log Event) est extraite
// dans lib/phishing/launch.ts pour pouvoir être reutilisee par d'autres
// entry points (API JSON, cron).

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  launchPhishingCampaign,
  type LaunchTarget,
  type LaunchResult,
} from "@/lib/phishing/launch";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  return { tenantId: session.user!.tenantId as string };
}

export type LaunchCampaignResult =
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
      error: msg === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  const templateId = formData.get("template") as string;
  const targetService = (formData.get("service") as string) || "";

  // Nouveau ciblage par groupes (mai 2026). Multi-select dans le form.
  // Si vide : on retombe sur le fallback "service" puis "tous".
  const groupSlugs = formData
    .getAll("groupSlugs")
    .map((v) => String(v))
    .filter((s) => s.length > 0);

  // Resolution des cibles : groupes > service > tous
  let targets: LaunchTarget[];
  let targetingMode: "groups" | "service" | "all" = "all";
  let targetingDetail: string | undefined;

  if (groupSlugs.length > 0) {
    targets = await db.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ["LEARNER", "MANAGER"] },
        groups: {
          some: {
            group: {
              slug: { in: groupSlugs },
              isActive: true,
              tenantId, // defense en profondeur : un groupSlug d'un autre tenant ne match pas
            },
          },
        },
      },
      select: { id: true, email: true, name: true },
    });
    targetingMode = "groups";
    targetingDetail = `groups:${groupSlugs.join(",")}`;
  } else if (targetService) {
    targets = await db.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ["LEARNER", "MANAGER"] },
        service: targetService,
      },
      select: { id: true, email: true, name: true },
    });
    targetingMode = "service";
    targetingDetail = `service:${targetService}`;
  } else {
    targets = await db.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ["LEARNER", "MANAGER"] },
      },
      select: { id: true, email: true, name: true },
    });
    targetingMode = "all";
  }

  const result: LaunchResult = await launchPhishingCampaign({
    tenantId,
    templateId,
    targets,
    targetingMode,
    targetingDetail,
  });

  revalidatePath("/admin/phishing");
  return result;
}

export async function stopCampaign(campaignId: string) {
  const { tenantId } = await requireAdmin();
  const c = await db.phishingCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!c || c.tenantId !== tenantId) throw new Error("not_found");
  await db.phishingCampaign.update({
    where: { id: campaignId },
    data: { isActive: false },
  });
  revalidatePath("/admin/phishing");
  return { ok: true };
}

// Pour la demo : simule des clics aleatoires sur une campagne
// (effet "regarde les stats bouger" pendant un live prospect).
export async function simulateClicks(campaignId: string) {
  const { tenantId } = await requireAdmin();
  const c = await db.phishingCampaign.findUnique({
    where: { id: campaignId },
  });
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
  await db.$transaction(updates.filter(Boolean) as ReturnType<typeof db.phishingResult.update>[]);

  revalidatePath("/admin/phishing");
  return { ok: true };
}
