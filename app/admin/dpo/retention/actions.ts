// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions, AuditOutcomes } from "@/lib/audit";
import {
  executePurge,
  isValidRetentionDays,
  RETENTION_MAX_DAYS,
  RETENTION_MIN_DAYS,
} from "@/lib/data-retention";

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

type AuthCtx =
  | { ok: false; error: string }
  | { ok: true; tenantId: string; email: string; role: string };

async function requireAdminTenant(): Promise<AuthCtx> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Non authentifié." };
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return { ok: false, error: "Réservé aux ADMIN/RSSI." };
  }
  return {
    ok: true,
    tenantId: session.user.tenantId as string,
    email: session.user.email ?? "unknown",
    role,
  };
}

/**
 * Met à jour Tenant.dataRetentionDays.
 * raw = "" ou "off" -> désactive la purge (null en DB).
 */
export async function saveRetentionConfig(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const raw = String(formData.get("retentionDays") ?? "").trim();
  let next: number | null;

  if (raw === "" || raw === "off" || raw === "0") {
    next = null;
  } else {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || !isValidRetentionDays(parsed)) {
      return {
        ok: false,
        error: `Durée invalide. Saisis un entier entre ${RETENTION_MIN_DAYS} et ${RETENTION_MAX_DAYS} jours, ou laisse vide pour désactiver.`,
      };
    }
    next = parsed;
  }

  await db.tenant.update({
    where: { id: ctx.tenantId },
    data: { dataRetentionDays: next },
  });

  await auditLog({
    action: AuditActions.DATA_RETENTION_CONFIGURED,
    outcome: AuditOutcomes.SUCCESS,
    actor: { email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    message: next
      ? `Rétention configurée à ${next} jours`
      : "Rétention automatique désactivée",
    metadata: { retentionDays: next },
  });

  revalidatePath("/admin/dpo/retention");
  return {
    ok: true,
    message: next
      ? `Rétention configurée à ${next} jours.`
      : "Rétention automatique désactivée.",
  };
}

/**
 * Déclenche une purge manuelle immédiate. Rate-limité naturellement par
 * le bouton (le tenant ne peut pas spammer, et la purge est idempotente).
 */
export async function runPurgeNow(): Promise<ActionResult> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { dataRetentionDays: true },
  });
  if (!tenant?.dataRetentionDays) {
    return {
      ok: false,
      error:
        "Configure d'abord une durée de rétention avant de lancer une purge.",
    };
  }

  const result = await executePurge(ctx.tenantId, {
    triggeredByEmail: ctx.email,
    automated: false,
  });

  revalidatePath("/admin/dpo/retention");
  return {
    ok: true,
    message: `Purge effectuée : ${result.eventsDeleted} événements, ${result.auditLogsDeleted} entrées d'audit, ${result.usersAnonymized} utilisateurs anonymisés.`,
  };
}
