"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Actions serveur pour la page /transferer/[token].
//
// SECURITE :
//  - L'acceptation/refus DOIT etre faite par l'utilisateur cible
//    connecte avec son email = celui de la demande. On verifie cela
//    cote serveur, jamais cote client.
//  - Le token a 7 jours d'expiration et est invalide apres usage.
//  - Audit log a chaque action.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";

export type TransferActionResult =
  | { ok: true; action: "accepted" | "rejected" }
  | {
      ok: false;
      reason:
        | "not_found"
        | "expired"
        | "already_processed"
        | "unauthorized"
        | "wrong_account";
    };

type LoadedRequest = {
  id: string;
  requestedByUserId: string;
  requestedByTenantId: string;
  targetEmail: string;
  status: string;
  expiresAt: Date;
};

type LoadCheckResult =
  | { ok: true; req: LoadedRequest }
  | { ok: false; reason: "not_found" | "already_processed" | "expired" };

async function loadAndCheckRequest(token: string): Promise<LoadCheckResult> {
  const req = await db.tenantTransferRequest.findUnique({
    where: { token },
    select: {
      id: true,
      requestedByUserId: true,
      requestedByTenantId: true,
      targetEmail: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!req) return { ok: false, reason: "not_found" };
  if (req.status !== "PENDING") {
    return { ok: false, reason: "already_processed" };
  }
  if (req.expiresAt < new Date()) {
    // Marquage best-effort de l'expiration (idempotent)
    await db.tenantTransferRequest.update({
      where: { id: req.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, reason: "expired" };
  }
  return { ok: true, req };
}

export async function acceptTransfer(
  token: string,
): Promise<TransferActionResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, reason: "unauthorized" };
  }
  const sessionEmail = session.user.email.toLowerCase();

  const check = await loadAndCheckRequest(token);
  if (!check.ok) return check;
  const { req } = check;

  if (req.targetEmail.toLowerCase() !== sessionEmail) {
    return { ok: false, reason: "wrong_account" };
  }

  // Migration du tenantId de l'utilisateur. Les progres, certificats,
  // achievements restent attaches a son User.id donc tout suit.
  // En revanche les memberships de groupes du PRECEDENT tenant
  // deviennent caducs : on les retire.
  const userId = session.user.id as string;
  const previousTenantId = session.user.tenantId as string;

  await db.$transaction(async (tx) => {
    // Retire les memberships de groupes de l'ancien tenant
    await tx.userGroup.deleteMany({
      where: { userId, group: { tenantId: previousTenantId } },
    });
    // Bascule du tenantId
    await tx.user.update({
      where: { id: userId },
      data: { tenantId: req.requestedByTenantId },
    });
    // Marque la demande comme acceptee
    await tx.tenantTransferRequest.update({
      where: { id: req.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    // Annule toutes les autres demandes en attente pour ce meme email
    // (un seul rattachement actif a la fois).
    await tx.tenantTransferRequest.updateMany({
      where: {
        targetEmail: req.targetEmail,
        status: "PENDING",
        id: { not: req.id },
      },
      data: { status: "REVOKED" },
    });
  });

  await auditLog({
    action: AuditActions.TRANSFER_REQUEST_ACCEPTED,
    actor: {
      userId,
      email: sessionEmail,
      role: (session.user.role as string) || "LEARNER",
    },
    tenantId: req.requestedByTenantId,
    target: { type: "transfer_request", id: req.id, label: req.targetEmail },
    metadata: {
      previousTenantId,
      newTenantId: req.requestedByTenantId,
    },
  });

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/");
  return { ok: true, action: "accepted" };
}

export async function rejectTransfer(
  token: string,
): Promise<TransferActionResult> {
  const session = await auth();
  // On autorise le refus meme non-connecte si la cible n'est pas
  // l'utilisateur courant : c'est un consentement negatif, pas une
  // action sensible. Mais on logue toujours qui a refuse.
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;

  const check = await loadAndCheckRequest(token);
  if (!check.ok) return check;
  const { req } = check;

  // Si l'utilisateur est connecte avec un autre email, on refuse :
  // le refus doit etre fait par l'utilisateur cible ou en non-auth.
  if (sessionEmail && sessionEmail !== req.targetEmail.toLowerCase()) {
    return { ok: false, reason: "wrong_account" };
  }

  await db.tenantTransferRequest.update({
    where: { id: req.id },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });

  await auditLog({
    action: AuditActions.TRANSFER_REQUEST_REJECTED,
    actor: sessionEmail
      ? {
          userId: (session?.user?.id as string) || "anonymous",
          email: sessionEmail,
          role: (session?.user?.role as string) || "LEARNER",
        }
      : { userId: "anonymous", email: undefined, role: "ANONYMOUS" },
    tenantId: req.requestedByTenantId,
    target: { type: "transfer_request", id: req.id, label: req.targetEmail },
  });

  return { ok: true, action: "rejected" };
}
