// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions RGPD : effacement, demande d'effacement.
"use server";

import { headers } from "next/headers";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions, readIpFromHeaders } from "@/lib/audit";

export type EraseResult = { ok: boolean; error?: string };

/**
 * Article 17 RGPD : droit a l'oubli.
 *
 * Comportement :
 *  - Si role=ADMIN/RSSI/SUPERADMIN du tenant : on REFUSE car l'effacement
 *    laisserait le tenant sans gouvernance. L'admin doit d'abord transferer
 *    ses droits a un autre admin.
 *  - Si role=LEARNER ou MANAGER : on supprime le User (cascade BDD efface
 *    progress / events / sessions / accounts / webauthn).
 *  - On loggue 2 entrees AuditLog : DATA_ERASURE_REQUESTED puis
 *    DATA_ERASURE_COMPLETED.
 *  - On force le sign-out apres effacement.
 *
 * Une trace anonymisee peut subsister dans NotificationLog (pour preuve
 * de formation suivie). C'est legitime au regard du RGPD si la base
 * legale est l'obligation legale ou l'interet legitime documente.
 */
export async function requestSelfErasure(
  confirmation: string,
): Promise<EraseResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifie." };
  const userId = session.user.id as string;
  const email = session.user.email as string;
  const role = session.user.role;
  const tenantId = session.user.tenantId as string;

  if (confirmation.trim().toUpperCase() !== "EFFACER MON COMPTE") {
    return {
      ok: false,
      error: "Confirmation incorrecte. Tapez exactement « EFFACER MON COMPTE ».",
    };
  }

  if (role === "ADMIN" || role === "RSSI" || role === "SUPERADMIN") {
    await auditLog({
      action: AuditActions.DATA_ERASURE_REQUESTED,
      outcome: "DENIED",
      actor: { userId, email, role },
      tenantId,
      target: { type: "user", id: userId, label: email },
      message:
        "Refuse : role admin requiert transfert de gouvernance avant effacement",
    });
    return {
      ok: false,
      error:
        "Vous êtes administrateur du tenant. Transférez d'abord vos droits à un autre administrateur, ou contactez le support pour un effacement manuel.",
    };
  }

  const h = await headers();
  const ip = readIpFromHeaders(h);

  await auditLog({
    action: AuditActions.DATA_ERASURE_REQUESTED,
    actor: { userId, email, role },
    tenantId,
    target: { type: "user", id: userId, label: email },
    message: "Demande utilisateur d'effacement RGPD article 17",
    ip,
  });

  // Cascade : supprime sessions, accounts, progress, events, webauthn,
  // userGroups, password resets, inventory.
  await db.user.delete({ where: { id: userId } });

  await auditLog({
    action: AuditActions.DATA_ERASURE_COMPLETED,
    actor: { email },
    tenantId,
    target: { type: "user", id: userId, label: email },
    message: "Compte efface en cascade RGPD article 17",
    ip,
  });

  // Sign out apres effacement
  await signOut({ redirect: false });
  return { ok: true };
}
