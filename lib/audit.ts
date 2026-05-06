// SPDX-License-Identifier: AGPL-3.0-or-later
// Audit log centralise pour la conformite RGPD / NIS2 / ISO 27001.
//
// Principes :
//  - Tous les points sensibles (auth, gestion users, billing, exports
//    de donnees) appellent auditLog() pour tracer qui fait quoi.
//  - Best-effort : un echec d'ecriture log ne doit pas casser l'action
//    metier. On capture et on log dans la console.
//  - Snapshot d'identite : on ecrit actorEmail et actorRole au moment
//    de l'action, pour ne pas perdre l'info si l'user est supprime.
//  - IP hashee SHA-256 (cf. lib/password-reset.ts hashIp).
//
// Usage :
//   await auditLog({
//     action: "USER_DELETED",
//     outcome: "SUCCESS",
//     actor: { userId, email, role },
//     tenantId,
//     target: { type: "user", id: deletedUserId, label: deletedEmail },
//     message: "Suppression RGPD effectuee",
//   });
import {
  AuditAction,
  AuditOutcome,
  AuditSeverity,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/password-reset";

export type AuditActor = {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
};

export type AuditTarget = {
  type: string;
  id?: string | null;
  label?: string | null;
};

export type AuditLogInput = {
  action: AuditAction;
  outcome?: AuditOutcome;
  severity?: AuditSeverity;
  actor?: AuditActor;
  tenantId?: string | null;
  target?: AuditTarget;
  ip?: string | null;
  userAgent?: string | null;
  message?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Ecrit un log d'audit. Best-effort : retourne true si succes, false si
 * echec (et n'echoue jamais).
 */
export async function auditLog(input: AuditLogInput): Promise<boolean> {
  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        outcome: input.outcome ?? AuditOutcome.SUCCESS,
        severity: input.severity ?? defaultSeverityFor(input.action),
        tenantId: input.tenantId ?? null,
        actorUserId: input.actor?.userId ?? null,
        actorEmail: input.actor?.email ?? null,
        actorRole: input.actor?.role ?? null,
        targetType: input.target?.type ?? null,
        targetId: input.target?.id ?? null,
        targetLabel: input.target?.label ?? null,
        ipHash: input.ip ? hashIp(input.ip) : null,
        userAgent: input.userAgent?.slice(0, 1000) ?? null,
        message: input.message?.slice(0, 2000) ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
    return true;
  } catch (e) {
    // On log dans la console mais on ne propage pas : un crash de l'audit
    // ne doit jamais bloquer une action metier (sinon on cree une nouvelle
    // surface d'attaque DoS).
    console.error("auditLog failed", { action: input.action, error: e });
    return false;
  }
}

/**
 * Severite par defaut selon le type d'action. Sert au filtrage dans la
 * page de consultation.
 */
function defaultSeverityFor(action: AuditAction): AuditSeverity {
  switch (action) {
    case AuditAction.USER_LOGIN_FAILED:
    case AuditAction.USER_PASSWORD_RESET_REQUESTED:
      return AuditSeverity.NOTICE;
    case AuditAction.USER_LOCKED:
    case AuditAction.USER_MFA_DISABLED:
    case AuditAction.USER_DELETED:
    case AuditAction.USER_ROLE_CHANGED:
    case AuditAction.BILLING_PAYMENT_FAILED:
    case AuditAction.DATA_ERASURE_REQUESTED:
      return AuditSeverity.WARNING;
    case AuditAction.USER_MFA_RESET_BY_ADMIN:
    case AuditAction.USER_WEBAUTHN_DELETED:
    case AuditAction.TENANT_DELETED:
    case AuditAction.DATA_ERASURE_COMPLETED:
      return AuditSeverity.CRITICAL;
    default:
      return AuditSeverity.INFO;
  }
}

/**
 * Helpers semantiques pour reduire la verbosite cote callers.
 */
export const AuditActions = AuditAction;
export const AuditOutcomes = AuditOutcome;
export const AuditSeverities = AuditSeverity;

/**
 * Extrait l'IP cliente depuis les headers (pour insertion dans server actions).
 */
export function readIpFromHeaders(h: Headers): string | null {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}
