// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";

// Server actions de la page /admin/dpo/retention.
//
// Pattern de feedback : on retourne Promise<void> (compat directe avec
// <form action={...}> de Next 15) et on communique le succès / l'erreur
// via redirect avec query string : ?ok=1&msg=... ou ?error=....
// La page lit ces searchParams et affiche un bandeau ephemere.

import { redirect } from "next/navigation";
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

const RETENTION_PATH = "/admin/dpo/retention";

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
 * Encode un message dans l'URL. URL-encode le message pour qu'il soit
 * safe en query string, et le tronque a 240 chars pour éviter les URLs
 * monstrueuses.
 */
function encodeFeedback(message: string): string {
  return encodeURIComponent(message.slice(0, 240));
}

/**
 * Met à jour Tenant.dataRetentionDays.
 * raw = "" ou "off" -> désactive la purge (null en DB).
 *
 * Pas de retour : redirige vers /admin/dpo/retention?ok=1 ou ?error=...
 * pour que la page affiche un feedback visuel. revalidatePath garantit
 * que les valeurs en cache (preview, statut) sont rafraichies.
 */
export async function saveRetentionConfig(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) {
    redirect(`${RETENTION_PATH}?error=${encodeFeedback(ctx.error)}`);
  }

  const raw = String(formData.get("retentionDays") ?? "").trim();
  let next: number | null;

  if (raw === "" || raw === "off" || raw === "0") {
    next = null;
  } else {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || !isValidRetentionDays(parsed)) {
      redirect(
        `${RETENTION_PATH}?error=${encodeFeedback(
          `Durée invalide. Saisis un entier entre ${RETENTION_MIN_DAYS} et ${RETENTION_MAX_DAYS} jours, ou laisse vide pour désactiver.`,
        )}`,
      );
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

  revalidatePath(RETENTION_PATH);
  redirect(
    `${RETENTION_PATH}?ok=1&msg=${encodeFeedback(
      next
        ? `Rétention configurée à ${next} jours.`
        : "Rétention automatique désactivée.",
    )}`,
  );
}

/**
 * Déclenche une purge manuelle immédiate. Rate-limité naturellement par
 * le bouton (le tenant ne peut pas spammer, et la purge est idempotente).
 */
export async function runPurgeNow(): Promise<void> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) {
    redirect(`${RETENTION_PATH}?error=${encodeFeedback(ctx.error)}`);
  }

  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { dataRetentionDays: true },
  });
  if (!tenant?.dataRetentionDays) {
    redirect(
      `${RETENTION_PATH}?error=${encodeFeedback(
        "Configure d'abord une durée de rétention avant de lancer une purge.",
      )}`,
    );
  }

  const result = await executePurge(ctx.tenantId, {
    triggeredByEmail: ctx.email,
    automated: false,
  });

  revalidatePath(RETENTION_PATH);
  redirect(
    `${RETENTION_PATH}?ok=1&msg=${encodeFeedback(
      `Purge effectuée : ${result.eventsDeleted} événements, ${result.auditLogsDeleted} entrées d'audit, ${result.usersAnonymized} utilisateurs anonymisés.`,
    )}`,
  );
}
