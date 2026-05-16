"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions pour le mode « Voir en tant que » RGPD-safe.
//
// 4 actions :
//   - requestImpersonation : admin demande l'acces, envoie mail au target
//   - acceptImpersonation  : target accepte (consentement explicite)
//   - rejectImpersonation  : target refuse
//   - endImpersonation     : admin clos la session OU target revoque
//
// Toutes les actions :
//  - Verifient les permissions (ADMIN / RSSI / SUPERADMIN pour la
//    demande)
//  - Tracent dans AuditLog
//  - Limitent au meme tenant (sauf SUPERADMIN)

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { sendImpersonationRequestEmail } from "./email";

const CONSENT_TOKEN_TTL_HOURS = 24;
const MAX_DURATION_MINUTES = 24 * 60; // 24h maximum

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  return {
    userId: session.user.id as string,
    email: session.user.email as string | undefined,
    tenantId: session.user.tenantId as string,
    role,
    name: session.user.name as string | undefined,
  };
}

export type RequestImpersonationResult =
  | {
      ok: true;
      mode: "requested";
    }
  | {
      ok: false;
      reason:
        | "target_not_found"
        | "target_not_same_tenant"
        | "self_target"
        | "invalid_reason"
        | "invalid_duration";
    };

/**
 * Admin demande l'acces en lecture au compte d'un utilisateur cible.
 * - Le user doit etre dans le meme tenant (sauf SUPERADMIN)
 * - La raison doit faire au moins 10 caracteres (force la documentation)
 * - La duree maximum est 24h
 */
export async function requestImpersonation(formData: FormData): Promise<RequestImpersonationResult> {
  const admin = await requireAdmin();
  const targetEmail = ((formData.get("targetEmail") as string) || "")
    .trim()
    .toLowerCase();
  const reason = ((formData.get("reason") as string) || "").trim();
  const durationMinutes = parseInt(
    (formData.get("durationMinutes") as string) || "60",
    10,
  );

  if (!targetEmail || !targetEmail.includes("@")) {
    return { ok: false, reason: "target_not_found" };
  }
  if (reason.length < 10) {
    return { ok: false, reason: "invalid_reason" };
  }
  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > MAX_DURATION_MINUTES
  ) {
    return { ok: false, reason: "invalid_duration" };
  }

  const target = await db.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, tenantId: true, email: true, name: true },
  });
  if (!target) {
    return { ok: false, reason: "target_not_found" };
  }
  if (target.id === admin.userId) {
    return { ok: false, reason: "self_target" };
  }
  if (target.tenantId !== admin.tenantId && admin.role !== "SUPERADMIN") {
    return { ok: false, reason: "target_not_same_tenant" };
  }

  // Revoque les eventuelles demandes en attente pour ce couple (admin, target)
  await db.impersonationSession.updateMany({
    where: {
      adminUserId: admin.userId,
      targetUserId: target.id,
      status: "PENDING",
    },
    data: { status: "EXPIRED" },
  });

  const token = randomBytes(32).toString("base64url");
  const consentExpiresAt = new Date(
    Date.now() + CONSENT_TOKEN_TTL_HOURS * 3600 * 1000,
  );

  const session = await db.impersonationSession.create({
    data: {
      adminUserId: admin.userId,
      adminTenantId: admin.tenantId,
      targetUserId: target.id,
      targetEmail: target.email,
      token,
      reason,
      requestedDurationMinutes: durationMinutes,
      consentExpiresAt,
    },
  });

  // Mail au target (best-effort, fire-and-forget)
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.AUTH_URL ||
    "http://localhost";
  const acceptUrl = `${baseUrl}/impersonate/${token}?action=accept`;
  const rejectUrl = `${baseUrl}/impersonate/${token}?action=reject`;

  const tenant = await db.tenant.findUnique({
    where: { id: admin.tenantId },
    select: { name: true },
  });

  void (async () => {
    try {
      await sendImpersonationRequestEmail({
        to: target.email,
        ctx: {
          adminUserName: admin.name || admin.email || "Un administrateur",
          adminUserEmail: admin.email || "",
          tenantName: tenant?.name || "Humanix Académie",
          reason,
          requestedDurationMinutes: durationMinutes,
          acceptUrl,
          rejectUrl,
          consentExpiresAt,
        },
      });
    } catch (err) {
      console.error("[impersonation] email failed", err);
    }
  })();

  await auditLog({
    action: AuditActions.IMPERSONATION_REQUESTED,
    actor: { userId: admin.userId, email: admin.email, role: admin.role },
    tenantId: admin.tenantId,
    target: { type: "impersonation", id: session.id, label: target.email },
    metadata: {
      reason,
      requestedDurationMinutes: durationMinutes,
      targetUserId: target.id,
    },
  });

  revalidatePath("/admin/utilisateurs");
  return { ok: true, mode: "requested" };
}

export type ImpersonationActionResult =
  | { ok: true; sessionId?: string; action: "accepted" | "rejected" | "ended" }
  | {
      ok: false;
      reason:
        | "not_found"
        | "expired"
        | "already_processed"
        | "unauthorized"
        | "wrong_account";
    };

async function loadPendingSession(token: string) {
  const session = await db.impersonationSession.findUnique({
    where: { token },
  });
  if (!session) return { ok: false as const, reason: "not_found" as const };
  if (session.status !== "PENDING") {
    return { ok: false as const, reason: "already_processed" as const };
  }
  if (session.consentExpiresAt < new Date()) {
    await db.impersonationSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false as const, reason: "expired" as const };
  }
  return { ok: true as const, session };
}

/**
 * L'utilisateur cible accepte l'acces. Cree la session ACTIVE et fixe
 * son endsAt = grantedAt + dureeRequise.
 */
export async function acceptImpersonation(
  token: string,
): Promise<ImpersonationActionResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, reason: "unauthorized" };
  }
  const sessionEmail = session.user.email.toLowerCase();

  const check = await loadPendingSession(token);
  if (!check.ok) return check;
  const { session: req } = check;

  if (req.targetEmail.toLowerCase() !== sessionEmail) {
    return { ok: false, reason: "wrong_account" };
  }

  const now = new Date();
  const endsAt = new Date(
    now.getTime() + req.requestedDurationMinutes * 60 * 1000,
  );

  await db.impersonationSession.update({
    where: { id: req.id },
    data: {
      status: "ACTIVE",
      grantedAt: now,
      endsAt,
    },
  });

  await auditLog({
    action: AuditActions.IMPERSONATION_GRANTED,
    actor: {
      userId: session.user.id as string,
      email: sessionEmail,
      role: (session.user.role as string) || "LEARNER",
    },
    tenantId: req.adminTenantId,
    target: { type: "impersonation", id: req.id, label: req.targetEmail },
    metadata: {
      adminUserId: req.adminUserId,
      endsAt: endsAt.toISOString(),
      durationMinutes: req.requestedDurationMinutes,
    },
  });

  return { ok: true, action: "accepted", sessionId: req.id };
}

export async function rejectImpersonation(
  token: string,
): Promise<ImpersonationActionResult> {
  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;

  const check = await loadPendingSession(token);
  if (!check.ok) return check;
  const { session: req } = check;

  if (sessionEmail && sessionEmail !== req.targetEmail.toLowerCase()) {
    return { ok: false, reason: "wrong_account" };
  }

  await db.impersonationSession.update({
    where: { id: req.id },
    data: {
      status: "REJECTED",
      endedAt: new Date(),
      endedReason: "user_rejected",
    },
  });

  await auditLog({
    action: AuditActions.IMPERSONATION_REJECTED,
    actor: sessionEmail
      ? {
          userId: (session?.user?.id as string) || "anonymous",
          email: sessionEmail,
          role: (session?.user?.role as string) || "LEARNER",
        }
      : { userId: "anonymous", email: undefined, role: "ANONYMOUS" },
    tenantId: req.adminTenantId,
    target: { type: "impersonation", id: req.id, label: req.targetEmail },
  });

  return { ok: true, action: "rejected", sessionId: req.id };
}

/**
 * Clos une session active. Initiable par :
 *  - L'admin (clic « Sortir » sur le bandeau)
 *  - L'utilisateur cible (revocation depuis /profil/securite)
 *  - Le cron / chronomètre (auto-expiration quand endsAt < now)
 */
export async function endImpersonation(
  sessionId: string,
  reason: "admin_ended" | "user_revoked" | "expired",
): Promise<ImpersonationActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, reason: "unauthorized" };
  }

  const imp = await db.impersonationSession.findUnique({
    where: { id: sessionId },
  });
  if (!imp) return { ok: false, reason: "not_found" };
  if (imp.status !== "ACTIVE") {
    return { ok: false, reason: "already_processed" };
  }

  const currentUserId = session.user.id as string;
  // Verif d'autorisation : seul l'admin proprietaire ou la cible
  // peuvent terminer la session.
  if (
    currentUserId !== imp.adminUserId &&
    currentUserId !== imp.targetUserId
  ) {
    return { ok: false, reason: "unauthorized" };
  }

  // Si l'utilisateur courant n'est pas l'admin mais que reason !=
  // user_revoked, on corrige
  const effectiveReason =
    currentUserId === imp.targetUserId ? "user_revoked" : reason;

  const newStatus = effectiveReason === "user_revoked" ? "REVOKED" : "ENDED";

  await db.impersonationSession.update({
    where: { id: sessionId },
    data: {
      status: newStatus,
      endedAt: new Date(),
      endedReason: effectiveReason,
    },
  });

  await auditLog({
    action:
      effectiveReason === "user_revoked"
        ? AuditActions.IMPERSONATION_REVOKED
        : AuditActions.IMPERSONATION_ENDED,
    actor: {
      userId: currentUserId,
      email: session.user.email as string | undefined,
      role: (session.user.role as string) || "LEARNER",
    },
    tenantId: imp.adminTenantId,
    target: { type: "impersonation", id: imp.id, label: imp.targetEmail },
    metadata: { reason: effectiveReason },
  });

  revalidatePath("/admin/utilisateurs");
  return { ok: true, action: "ended", sessionId };
}

/**
 * Helper serveur : retourne la session d'impersonation ACTIVE du
 * caller (admin) s'il y en a une et qu'elle n'a pas expire.
 * Utilise par le bandeau et par la page /admin/voir/[sessionId].
 */
export async function getActiveImpersonation() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const imp = await db.impersonationSession.findFirst({
    where: {
      adminUserId: session.user.id as string,
      status: "ACTIVE",
      endsAt: { gt: new Date() },
    },
    include: {
      targetUser: {
        select: {
          id: true,
          email: true,
          name: true,
          tenantId: true,
          role: true,
        },
      },
    },
  });

  if (!imp) {
    // Auto-cleanup : si une session ACTIVE est expiree, on la marque
    // ENDED. Best-effort, pas d'erreur si rien a faire.
    await db.impersonationSession
      .updateMany({
        where: {
          adminUserId: session.user.id as string,
          status: "ACTIVE",
          endsAt: { lte: new Date() },
        },
        data: {
          status: "ENDED",
          endedAt: new Date(),
          endedReason: "expired",
        },
      })
      .catch(() => {});
    return null;
  }

  return imp;
}
