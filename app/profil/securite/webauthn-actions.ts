// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions pour gerer les WebAuthn credentials (rename, delete).
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  return { userId: session.user.id as string, role: session.user.role };
}

export async function renameWebauthnCredential(
  credentialDbId: string,
  newName: string,
) {
  const { userId } = await requireAuth();
  const cred = await db.webAuthnCredential.findUnique({
    where: { id: credentialDbId },
  });
  if (!cred || cred.userId !== userId) throw new Error("not_found");
  const trimmed = newName.trim().slice(0, 100);
  if (!trimmed) throw new Error("name_required");
  await db.webAuthnCredential.update({
    where: { id: credentialDbId },
    data: { deviceName: trimmed },
  });
  revalidatePath("/profil/securite");
  return { ok: true };
}

export async function deleteWebauthnCredential(credentialDbId: string) {
  const { userId, role } = await requireAuth();
  const cred = await db.webAuthnCredential.findUnique({
    where: { id: credentialDbId },
  });
  if (!cred || cred.userId !== userId) throw new Error("not_found");

  // Pour SUPERADMIN, on refuse de supprimer la derniere cle pour ne pas
  // se locker dehors. L'utilisateur doit garder au moins 1 cle active.
  if (role === "SUPERADMIN") {
    const count = await db.webAuthnCredential.count({ where: { userId } });
    if (count <= 1) {
      throw new Error(
        "cannot_delete_last_key_for_superadmin",
      );
    }
  }
  await db.webAuthnCredential.delete({ where: { id: credentialDbId } });
  revalidatePath("/profil/securite");
  return { ok: true };
}
