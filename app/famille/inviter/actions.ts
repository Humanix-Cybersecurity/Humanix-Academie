"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions du flux invitation famille.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createFamilyInvite, hashIp } from "@/lib/family-invites";
import { sendFamilyInviteEmail } from "@/lib/family-invites/email";

export async function sendInviteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string;

  const result = await createFamilyInvite({
    sponsorUserId: userId,
    sponsorTenantId: tenantId,
    raw: {
      inviteeEmail: formData.get("inviteeEmail"),
      inviteeFirstName: formData.get("inviteeFirstName") || null,
      personalMessage: formData.get("personalMessage") || null,
    },
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  // Envoi email avec contexte sponsor + tenant
  const [user, tenant] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);

  await sendFamilyInviteEmail({
    to: String(formData.get("inviteeEmail") ?? "")
      .trim()
      .toLowerCase(),
    ctx: {
      sponsorUserName: user?.name ?? user?.email ?? "Un proche",
      sponsorTenantName: tenant?.name ?? "Humanix Académie",
      inviteeFirstName:
        (formData.get("inviteeFirstName") as string | null) || null,
      personalMessage:
        (formData.get("personalMessage") as string | null) || null,
      redeemUrl: result.redeemUrl,
    },
  });

  revalidatePath("/famille/inviter");
}

/**
 * Activation d'une invitation : pas de session requise, c'est une page publique.
 * Appelee par /famille/invitation/[token] cote serveur.
 */
export async function redeemInviteServerAction(
  token: string,
  ip?: string | null,
) {
  const { redeemInvite } = await import("@/lib/family-invites");
  return redeemInvite({ token, ipHash: hashIp(ip) ?? undefined });
}
