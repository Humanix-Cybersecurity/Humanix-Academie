// SPDX-License-Identifier: AGPL-3.0-or-later
// Lib invitations Famille - boucle virale offerte aux employes qui terminent
// la saison 1.
//
// Regles produit :
//  - 1 employe = max 3 invitations cumulees jamais (fraude / spam)
//  - 1 invitation = 90 jours pour etre activee
//  - 1 destinataire = unique par sponsor (pas 3 invites au meme proche)
//  - Quand activee : on ne cree PAS de compte (la page /famille reste publique
//    sans login), on stocke juste status=REDEEMED + redeemedAt + ipHash pour
//    mesure de virilite et stats RH.
//
// Pourquoi cette approche minimaliste :
//  - Aucun stockage de donnees personnelles cote destinataire (pas de prenom
//    obligatoire, pas de telephone). Conforme RGPD principe minimisation.
//  - Le sponsor coche un consentement au nom de son proche que le proche
//    confirme implicitement en cliquant sur le lien. Cf. CNIL "marketing par
//    parrainage" : tolere si message neutre + retrait simple.

import crypto from "crypto";
import { db } from "@/lib/db";
import { z } from "zod";

export const MAX_INVITES_PER_USER = 3;
export const INVITE_TTL_DAYS = 90;

/**
 * Quota actuel d'un sponsor : combien d'invitations a-t-il encore le droit
 * d'envoyer ? Compte les status PENDING + REDEEMED (REVOKED/EXPIRED ne comptent pas).
 */
export async function remainingInvitesFor(userId: string): Promise<number> {
  const used = await db.familyInvite.count({
    where: {
      sponsorUserId: userId,
      status: { in: ["PENDING", "REDEEMED"] },
    },
  });
  return Math.max(0, MAX_INVITES_PER_USER - used);
}

/**
 * Eligibilite a inviter : il faut avoir complete au moins 1 saison entiere.
 * Definition "saison terminee" = tous les episodes publies de la saison sont
 * en status COMPLETED pour cet utilisateur.
 */
export async function isEligibleToInvite(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  // On cherche s'il existe au moins une saison ou tous les episodes publies
  // sont passes en COMPLETED par cet utilisateur.
  const completed = await db.progress.findMany({
    where: { userId, tenantId, status: "COMPLETED" },
    select: { saisonId: true },
  });
  if (completed.length === 0) return false;

  // On groupe par saison + on compare au nombre d'episodes publies
  const bySaison = new Map<string, number>();
  for (const p of completed) {
    bySaison.set(p.saisonId, (bySaison.get(p.saisonId) ?? 0) + 1);
  }

  for (const [saisonId, count] of bySaison) {
    const total = await db.episode.count({
      where: { saisonId, isPublished: true },
    });
    if (total > 0 && count >= total) return true;
  }
  return false;
}

const InviteInput = z.object({
  inviteeEmail: z
    .string()
    .email("Email invalide")
    .max(200)
    .transform((s) => s.trim().toLowerCase()),
  inviteeFirstName: z.string().max(80).optional().nullable(),
  personalMessage: z.string().max(800).optional().nullable(),
});

export type InviteInputData = z.infer<typeof InviteInput>;

export type CreateInviteResult =
  | { ok: true; inviteId: string; token: string; redeemUrl: string }
  | { ok: false; error: string };

/**
 * Cree une nouvelle invitation. Lance les controles produits :
 *  - eligibilite (saison 1 OK)
 *  - quota (max 3)
 *  - unicite destinataire (pas 2x le meme proche)
 */
export async function createFamilyInvite(args: {
  sponsorUserId: string;
  sponsorTenantId: string;
  raw: unknown;
}): Promise<CreateInviteResult> {
  const parsed = InviteInput.safeParse(args.raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const data = parsed.data;

  const eligible = await isEligibleToInvite(
    args.sponsorUserId,
    args.sponsorTenantId,
  );
  if (!eligible) {
    return {
      ok: false,
      error:
        "Vous devez terminer au moins une saison complète avant de pouvoir inviter vos proches.",
    };
  }

  const remaining = await remainingInvitesFor(args.sponsorUserId);
  if (remaining <= 0) {
    return { ok: false, error: "Vous avez déjà utilisé vos 3 invitations." };
  }

  // Anti-doublon par destinataire
  const existing = await db.familyInvite.findFirst({
    where: {
      sponsorUserId: args.sponsorUserId,
      inviteeEmail: data.inviteeEmail,
      status: { in: ["PENDING", "REDEEMED"] },
    },
  });
  if (existing) {
    return { ok: false, error: "Vous avez déjà invité cette personne." };
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000);

  const invite = await db.familyInvite.create({
    data: {
      sponsorUserId: args.sponsorUserId,
      sponsorTenantId: args.sponsorTenantId,
      inviteeEmail: data.inviteeEmail,
      inviteeFirstName: data.inviteeFirstName ?? null,
      personalMessage: data.personalMessage ?? null,
      token,
      status: "PENDING",
      expiresAt,
    },
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";
  const redeemUrl = `${appUrl}/famille/invitation/${token}`;

  return { ok: true, inviteId: invite.id, token, redeemUrl };
}

/**
 * Marque une invitation comme activee. Idempotent.
 */
export async function redeemInvite(args: {
  token: string;
  ipHash?: string;
}): Promise<
  | { ok: true; sponsorUserName: string | null; sponsorTenantName: string }
  | { ok: false; error: string }
> {
  const invite = await db.familyInvite.findUnique({
    where: { token: args.token },
    include: {
      sponsor: { select: { name: true } },
      sponsorTenant: { select: { name: true } },
    },
  });
  if (!invite) return { ok: false, error: "Invitation introuvable." };
  if (invite.status === "REVOKED")
    return { ok: false, error: "Invitation révoquée." };
  if (invite.expiresAt.getTime() < Date.now()) {
    if (invite.status === "PENDING") {
      await db.familyInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return { ok: false, error: "Invitation expirée." };
  }

  if (invite.status === "REDEEMED") {
    // Idempotent : on accepte la revisite mais on ne re-incremente rien
    return {
      ok: true,
      sponsorUserName: invite.sponsor.name,
      sponsorTenantName: invite.sponsorTenant.name,
    };
  }

  await db.familyInvite.update({
    where: { id: invite.id },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      redeemedIpHash: args.ipHash ?? null,
    },
  });

  return {
    ok: true,
    sponsorUserName: invite.sponsor.name,
    sponsorTenantName: invite.sponsorTenant.name,
  };
}

/**
 * Hash IP pour tracabilite anti-fraude (RGPD-compatible : pas d'IP en clair).
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto
    .createHash("sha256")
    .update(`${ip}::humanix-family`)
    .digest("hex")
    .slice(0, 32);
}
