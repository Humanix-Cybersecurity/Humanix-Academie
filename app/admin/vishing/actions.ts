"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions de /admin/vishing (#744).
//
// Particularite du canal VOICE : aucun lien a cliquer, donc aucun suivi
// automatique possible. C'est l'appelant qui consigne l'issue de chaque
// appel — d'ou recordVishingOutcome.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  launchManualCampaign,
  recordManualOutcome,
  MANUAL_OUTCOMES,
  type ManualOutcome,
} from "@/lib/phishing/manual-launch";
import { resolveManualTargets } from "@/lib/phishing/manual-targets";
import { auditLog, AuditActions, AuditOutcomes } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  return {
    tenantId: session.user!.tenantId as string,
    userId: session.user!.id as string,
    email: session.user!.email as string | undefined,
    role,
  };
}

export type LaunchVishingResult =
  | {
      ok: true;
      campaignId: string;
      targets: number;
      /** Liste d'appels à passer, avec l'id de résultat à renseigner ensuite. */
      callList: { resultId: string; name: string; email: string }[];
    }
  | { ok: false; error: string; message?: string };

export async function launchVishing(
  formData: FormData,
): Promise<LaunchVishingResult> {
  let ctx: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  const script = String(formData.get("script") ?? "").trim();
  const templateId = String(formData.get("template") ?? "vishing");
  const title =
    String(formData.get("title") ?? "").trim() || "Campagne vishing";
  if (!script) return { ok: false, error: "invalid_body" };

  const groupSlugs = formData
    .getAll("groupSlugs")
    .map((v) => String(v))
    .filter(Boolean);

  const { targets, targetingMode, targetingDetail } =
    await resolveManualTargets(ctx.tenantId, groupSlugs);

  const res = await launchManualCampaign({
    tenantId: ctx.tenantId,
    channel: "VOICE",
    title,
    templateId,
    body: script,
    targets,
    targetingMode,
    targetingDetail,
  });
  if (!res.ok) return { ok: false, error: res.error, message: res.message };

  // Liste d'appels : on ressort les resultats crees avec l'identite des
  // cibles, pour que l'appelant sache qui joindre et ou consigner.
  const rows = await db.phishingResult.findMany({
    where: { campaignId: res.campaignId },
    select: { id: true, user: { select: { name: true, email: true } } },
  });

  void auditLog({
    action: AuditActions.PHISHING_CAMPAIGN_CREATED,
    outcome: AuditOutcomes.SUCCESS,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    message: `Campagne vishing « ${title} » lancée sur ${res.targets} cible(s)`,
    metadata: { channel: "VOICE", campaignId: res.campaignId, templateId },
  });

  revalidatePath("/admin/phishing");
  return {
    ok: true,
    campaignId: res.campaignId,
    targets: res.targets,
    callList: rows.map((r) => ({
      resultId: r.id,
      name: r.user?.name ?? "-",
      email: r.user?.email ?? "-",
    })),
  };
}

/**
 * Consigne l'issue d'un appel. Le tenant est revérifié dans
 * recordManualOutcome : sans ça, un admin pourrait modifier le résultat
 * d'une campagne d'un autre tenant en devinant un id.
 */
export async function recordVishingOutcome(
  resultId: string,
  outcome: string,
): Promise<{ ok: boolean; error?: string }> {
  let ctx: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  if (!MANUAL_OUTCOMES.includes(outcome as ManualOutcome)) {
    return { ok: false, error: "invalid_outcome" };
  }

  const res = await recordManualOutcome({
    tenantId: ctx.tenantId,
    resultId,
    outcome: outcome as ManualOutcome,
  });
  if (res.ok) revalidatePath("/admin/phishing");
  return res;
}
