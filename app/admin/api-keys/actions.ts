"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/crypto";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") throw new Error("forbidden");
  return { tenantId: session.user!.tenantId as string };
}

export async function createApiKey(
  formData: FormData,
): Promise<{ plain: string; prefix: string; name: string }> {
  const { tenantId } = await requireAdmin();
  const name = (formData.get("name") as string) || "Sans nom";
  const scopes = (formData.get("scopes") as string) || "read";
  const expiresInDays = parseInt(
    (formData.get("expiresInDays") as string) || "0",
    10,
  );

  const { plain, prefix, hashed } = generateApiKey();
  const expiresAt =
    expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 24 * 3600 * 1000)
      : null;

  await db.apiKey.create({
    data: { tenantId, name, prefix, hashedKey: hashed, scopes, expiresAt },
  });

  revalidatePath("/admin/api-keys");
  return { plain, prefix, name };
}

export async function revokeApiKey(id: string) {
  const { tenantId } = await requireAdmin();
  const k = await db.apiKey.findUnique({ where: { id } });
  if (!k || k.tenantId !== tenantId) throw new Error("not_found");
  await db.apiKey.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/admin/api-keys");
  return { ok: true };
}

export async function deleteApiKey(id: string) {
  const { tenantId } = await requireAdmin();
  const k = await db.apiKey.findUnique({ where: { id } });
  if (!k || k.tenantId !== tenantId) throw new Error("not_found");
  await db.apiKey.delete({ where: { id } });
  revalidatePath("/admin/api-keys");
  return { ok: true };
}
