"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions de /admin/automations
//
// Updates des flags de remediation auto sur Tenant. Auth ADMIN/RSSI.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";

export type UpdateAutomationsResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "forbidden" | "unknown" };

export async function updateAutomations(
  formData: FormData,
): Promise<UpdateAutomationsResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "unauthorized" };
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return { ok: false, error: "forbidden" };
  }
  const tenantId = session.user.tenantId as string;

  // FormData -> bool : un input checkbox non coche n'envoie rien (pas
  // "false" mais absent), donc on lit la presence de la cle plutot que
  // sa valeur.
  const force2FA = formData.has("autoForce2FAAfterPhishingClick");
  const revokeSession = formData.has("autoRevokeSessionAfterPhishingClick");

  try {
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        autoForce2FAAfterPhishingClick: force2FA,
        autoRevokeSessionAfterPhishingClick: revokeSession,
      },
    });

    await auditLog({
      action: AuditActions.TENANT_UPDATED,
      actor: {
        userId: session.user.id ?? null,
        email: session.user.email ?? null,
        role,
      },
      tenantId,
      metadata: {
        scope: "automations",
        autoForce2FAAfterPhishingClick: force2FA,
        autoRevokeSessionAfterPhishingClick: revokeSession,
      },
    });
  } catch {
    return { ok: false, error: "unknown" };
  }

  revalidatePath("/admin/automations");
  return { ok: true };
}
