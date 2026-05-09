// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions pour gerer les WebAuthn credentials (rename, delete).
//
// Convention : on NE THROW JAMAIS depuis ces actions. On retourne plutot
// un { ok: true } | { ok: false, error: code } structure pour deux raisons :
//
//   1. UX : Next.js v15+ en production masque le message d'erreur des
//      server actions qui throw (transforme en "An error occurred in the
//      Server Components render. The specific message is omitted in
//      production builds..."). Le user voit donc un message generique
//      illisible. En retournant un objet, on garde le contrôle.
//
//   2. Robustesse : un audit log qui throw ne doit JAMAIS bloquer
//      l'action metier (anti-DoS). Donc on wrap auditLog en try/catch
//      separe.
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";

type Ctx = {
  userId: string;
  role: string | undefined;
  email: string | undefined;
  tenantId: string | null;
};

async function getCtx(): Promise<Ctx | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    userId: session.user.id as string,
    role: session.user.role as string | undefined,
    email: session.user.email as string | undefined,
    tenantId: (session.user.tenantId as string) ?? null,
  };
}

export type WebauthnActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function renameWebauthnCredential(
  credentialDbId: string,
  newName: string,
): Promise<WebauthnActionResult> {
  try {
    const ctx = await getCtx();
    if (!ctx) return { ok: false, error: "Non authentifié." };

    const cred = await db.webAuthnCredential.findUnique({
      where: { id: credentialDbId },
      select: { id: true, userId: true, deviceName: true },
    });
    if (!cred || cred.userId !== ctx.userId) {
      return { ok: false, error: "Clé introuvable ou non autorisée." };
    }

    const trimmed = newName.trim().slice(0, 100);
    if (!trimmed) return { ok: false, error: "Nom requis." };

    await db.webAuthnCredential.update({
      where: { id: credentialDbId },
      data: { deviceName: trimmed },
    });
    revalidatePath("/profil/securite");
    return { ok: true };
  } catch (e: unknown) {
    console.error("[webauthn-actions] renameWebauthnCredential failed", {
      credentialDbId,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return {
      ok: false,
      error: "Erreur serveur. Réessaye dans quelques secondes.",
    };
  }
}

export async function deleteWebauthnCredential(
  credentialDbId: string,
): Promise<WebauthnActionResult> {
  try {
    const ctx = await getCtx();
    if (!ctx) return { ok: false, error: "Non authentifié." };

    const cred = await db.webAuthnCredential.findUnique({
      where: { id: credentialDbId },
      select: { id: true, userId: true, deviceName: true },
    });
    if (!cred || cred.userId !== ctx.userId) {
      return { ok: false, error: "Clé introuvable ou non autorisée." };
    }

    // Pour SUPERADMIN, on refuse de supprimer la derniere cle pour ne pas
    // se locker dehors. L'utilisateur doit garder au moins 1 cle active.
    if (ctx.role === "SUPERADMIN") {
      const count = await db.webAuthnCredential.count({
        where: { userId: ctx.userId },
      });
      if (count <= 1) {
        return {
          ok: false,
          error:
            "Impossible : vous devez garder au moins une clé active en tant que SUPERADMIN.",
        };
      }
    }

    await db.webAuthnCredential.delete({ where: { id: credentialDbId } });

    // Audit log : best-effort (auditLog wrap déjà en try/catch interne, mais
    // on protege nous-même aussi pour ne JAMAIS faire planter le delete).
    try {
      await auditLog({
        action: AuditActions.USER_WEBAUTHN_DELETED,
        actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
        tenantId: ctx.tenantId,
        target: {
          type: "webauthn_credential",
          id: credentialDbId,
          label: cred.deviceName,
        },
      });
    } catch (auditErr) {
      console.error("[webauthn-actions] audit log failed (non bloquant)", {
        credentialDbId,
        error: auditErr instanceof Error ? auditErr.message : String(auditErr),
      });
    }

    revalidatePath("/profil/securite");
    return { ok: true };
  } catch (e: unknown) {
    console.error("[webauthn-actions] deleteWebauthnCredential failed", {
      credentialDbId,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return {
      ok: false,
      error: "Erreur serveur. Réessaye dans quelques secondes.",
    };
  }
}
