"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantPlan } from "@/lib/plans";
import {
  generatePhishing,
  type GeneratePhishingArgs,
  type GeneratedPhishing,
} from "@/lib/ai/mistral";

async function requirePro(): Promise<{ tenantId: string; userId: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  const tenantId = session.user!.tenantId as string;
  const userId = session.user!.id as string;
  const plan = await getTenantPlan(tenantId);
  if (!["pro", "premium"].includes(plan)) {
    throw new Error("plan_too_low:pro");
  }
  return { tenantId, userId };
}

/**
 * Server action appelee depuis le composant PhishingGenerator.
 * Authz + plan-gate + audit log + rate limit (10/heure/user).
 */
export async function generatePhishingAction(
  args: GeneratePhishingArgs,
): Promise<
  { ok: true; data: GeneratedPhishing } | { ok: false; error: string }
> {
  let auth: { tenantId: string; userId: string };
  try {
    auth = await requirePro();
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? "auth_failed") };
  }

  // Rate limit léger : 10 générations/heure/user
  const oneHourAgo = new Date(Date.now() - 3600_000);
  const recentCount = await db.event.count({
    where: {
      userId: auth.userId,
      type: "phishing_generated",
      createdAt: { gte: oneHourAgo },
    },
  });
  if (recentCount >= 10) {
    return { ok: false, error: "rate_limited (10/h)" };
  }

  let data: GeneratedPhishing;
  try {
    data = await generatePhishing(args);
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? "generation_failed") };
  }

  // Audit log (sans le contenu généré)
  await db.event
    .create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: "phishing_generated",
        payload: {
          template: args.template,
          service: args.service,
          difficulty: args.difficulty,
          subjectLen: data.subject.length,
          bodyLen: data.bodyText.length,
          redFlagsCount: data.redFlags.length,
        },
      },
    })
    .catch(() => {});

  return { ok: true, data };
}
