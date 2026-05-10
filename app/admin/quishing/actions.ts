"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions de /admin/quishing : lancer une campagne quishing.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  launchQuishingCampaign,
  type QuishingLaunchTarget,
} from "@/lib/quishing/launch";
import {
  QUISHING_TEMPLATES,
  type QuishingTemplate,
} from "@/lib/phishing/qr-code";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  return { tenantId: session.user!.tenantId as string };
}

export type LaunchQuishingResult =
  | {
      ok: true;
      campaignId: string;
      targets: number;
      posterUrl: string;
      previewLandingUrl: string;
    }
  | {
      ok: false;
      error:
        | "invalid_template"
        | "no_targets"
        | "unauthorized"
        | "forbidden"
        | "unknown";
      message?: string;
    };

export async function launchQuishing(
  formData: FormData,
): Promise<LaunchQuishingResult> {
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
  if (!templateId || !(templateId in QUISHING_TEMPLATES)) {
    return { ok: false, error: "invalid_template" };
  }

  const groupSlugs = formData
    .getAll("groupSlugs")
    .map((v) => String(v))
    .filter((s) => s.length > 0);

  // Resolution des cibles : groupes selectionnes > tous
  let targets: QuishingLaunchTarget[];
  let targetingMode: "groups" | "all" = "all";
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
              tenantId,
            },
          },
        },
      },
      select: { id: true, email: true, name: true },
    });
    targetingMode = "groups";
    targetingDetail = `groups:${groupSlugs.join(",")}`;
  } else {
    targets = await db.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ["LEARNER", "MANAGER"] },
      },
      select: { id: true, email: true, name: true },
    });
  }

  const result = await launchQuishingCampaign({
    tenantId,
    templateId: templateId as QuishingTemplate,
    targets,
    targetingMode,
    targetingDetail,
  });

  revalidatePath("/admin/quishing");
  return result;
}
