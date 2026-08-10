"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions de /admin/smishing (#744).
//
// Avant, cette page generait un script SMS via Mistral et s'arretait la :
// aucune campagne, aucun resultat, aucune trace. L'exercice ne comptait
// dans aucun indicateur.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { launchManualCampaign } from "@/lib/phishing/manual-launch";
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

export type LaunchSmishingResult =
  | {
      ok: true;
      campaignId: string;
      targets: number;
      /** Liens trackés à insérer dans les SMS, un par cible. */
      trackedLinks: { userId: string; url: string }[];
    }
  | {
      ok: false;
      error: string;
      message?: string;
    };

/**
 * Enregistre une campagne smishing et retourne un lien tracké par cible.
 *
 * Le produit n'embarque PAS de passerelle SMS : l'admin envoie les
 * messages depuis son propre outil. Le clic reste tracé par la landing
 * /phishing/[token], qui gère déjà le canal SMS.
 */
export async function launchSmishing(
  formData: FormData,
): Promise<LaunchSmishingResult> {
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

  const smsBody = String(formData.get("smsBody") ?? "").trim();
  const templateId = String(formData.get("template") ?? "smishing");
  const title =
    String(formData.get("title") ?? "").trim() || "Campagne smishing";
  if (!smsBody) return { ok: false, error: "invalid_body" };

  const groupSlugs = formData
    .getAll("groupSlugs")
    .map((v) => String(v))
    .filter(Boolean);

  const { targets, targetingMode, targetingDetail } =
    await resolveManualTargets(ctx.tenantId, groupSlugs);

  const res = await launchManualCampaign({
    tenantId: ctx.tenantId,
    channel: "SMS",
    title,
    templateId,
    body: smsBody,
    targets,
    targetingMode,
    targetingDetail,
  });
  if (!res.ok) return { ok: false, error: res.error, message: res.message };

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost";

  void auditLog({
    action: AuditActions.PHISHING_CAMPAIGN_CREATED,
    outcome: AuditOutcomes.SUCCESS,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    message: `Campagne smishing « ${title} » lancée sur ${res.targets} cible(s)`,
    metadata: { channel: "SMS", campaignId: res.campaignId, templateId },
  });

  revalidatePath("/admin/phishing");
  return {
    ok: true,
    campaignId: res.campaignId,
    targets: res.targets,
    trackedLinks: res.trackedLinks.map((l) => ({
      userId: l.userId,
      url: `${base}/phishing/${l.token}`,
    })),
  };
}
