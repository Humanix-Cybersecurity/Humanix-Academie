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
      /** Phase 3 v2 : nb d'entries de la liste externes (sans User match) ignorees */
      skippedExternal?: number;
      /** Phase 7a : split A/B (a + b = sent) si templateBId fourni */
      variantSplit?: { a: number; b: number };
    }
  | {
      ok: false;
      error:
        | "invalid_template"
        | "invalid_template_b"
        | "no_targets"
        | "smtp_not_configured"
        | "smtp_decrypt_failed"
        | "unauthorized"
        | "forbidden"
        | "list_not_found";
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
  // Phase 7a (juin 2026) : A/B variants. Si l'admin a coche "Test A/B" et
  // choisi un 2eme template, on transmet le templateBId au helper.
  const templateBId = String(formData.get("templateB") ?? "").trim() || undefined;
  const targetService = (formData.get("service") as string) || "";

  // Nouveau ciblage par groupes (mai 2026). Multi-select dans le form.
  // Si vide : on retombe sur le fallback "service" puis "tous".
  const groupSlugs = formData
    .getAll("groupSlugs")
    .map((v) => String(v))
    .filter((s) => s.length > 0);

  // Phase 3 v2 (juin 2026) : ciblage par recipient list. Priorite la plus haute.
  // Permet de cibler une cohorte ad-hoc importee via CSV (panel pilote,
  // prestataires, nouveaux arrivants...). Cf. /admin/phishing/lists.
  const listId = String(formData.get("listId") ?? "").trim();

  // Resolution des cibles : list > groupes > service > tous
  let targets: LaunchTarget[];
  let targetingMode: "list" | "groups" | "service" | "all" = "all";
  let targetingDetail: string | undefined;
  let skippedExternal = 0;

  if (listId) {
    // Verifie que la liste appartient bien au tenant (defense en profondeur
    // contre URL/form tampering qui injecterait un listId d'un autre tenant)
    const list = await db.phishingRecipientList.findFirst({
      where: { id: listId, tenantId, isActive: true },
      select: { id: true, name: true },
    });
    if (!list) {
      return {
        ok: false,
        error: "list_not_found",
        message:
          "Liste introuvable ou supprimee. Verifie sur /admin/phishing/lists.",
      };
    }

    // Charge les entries de la liste. On ne garde QUE celles qui ont un
    // userId resolu (match avec un User du tenant) -- les emails externes
    // sans User en BDD sont skippes car launchPhishingCampaign attend des
    // User.id valides (cf. note dans lib/phishing/launch.ts).
    // TODO ulterieur : supporter les destinataires externes en stockant
    // les PhishingResult sans userId (nullable) -- demande migration schema.
    const entries = await db.phishingRecipientListEntry.findMany({
      where: { listId },
      select: {
        userId: true,
        email: true,
        name: true,
        user: {
          select: { id: true, email: true, name: true, isActive: true },
        },
      },
    });

    targets = [];
    for (const e of entries) {
      if (!e.user || !e.user.isActive) {
        skippedExternal++;
        continue;
      }
      targets.push({
        id: e.user.id,
        email: e.user.email,
        // Prefere le name de la liste (souvent plus a jour) sinon User.name
        name: e.name ?? e.user.name,
      });
    }

    targetingMode = "list";
    targetingDetail = `list:${list.name}`;
  } else if (groupSlugs.length > 0) {
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
    templateBId, // Phase 7a
    targets,
    targetingMode,
    targetingDetail,
  });

  revalidatePath("/admin/phishing");

  // Phase 3 v2 : si la cible etait une recipient list, on remonte aussi le
  // nb d'entries skippees (externes sans User match) pour que le form
  // affiche un message clair "X envoyes, Y ignores car emails externes".
  if (result.ok && skippedExternal > 0) {
    return { ...result, skippedExternal };
  }
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
