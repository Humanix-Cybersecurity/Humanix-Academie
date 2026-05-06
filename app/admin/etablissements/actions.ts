"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions multi-etablissements.
// Authz : ADMIN/SUPERADMIN du tenant racine uniquement.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createChildTenant } from "@/lib/multi-tenant";

async function requireAdminOnRoot(): Promise<{ tenantId: string }> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") throw new Error("forbidden");
  const tenantId = (session?.user as any)?.tenantId as string;
  if (!tenantId) throw new Error("forbidden");
  return { tenantId };
}

const CreateSchema = z.object({
  name: z.string().min(2).max(120),
  establishmentType: z
    .string()
    .max(40)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function createEstablishmentAction(formData: FormData) {
  const { tenantId } = await requireAdminOnRoot();

  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    establishmentType: formData.get("establishmentType"),
  });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides");

  // Quota V1 : 25 enfants max
  const childCount = await db.tenant.count({
    where: { parentTenantId: tenantId },
  });
  if (childCount >= 25)
    throw new Error(
      "Limite de 25 établissements atteinte (contactez le support).",
    );

  await createChildTenant({
    parentTenantId: tenantId,
    name: parsed.data.name,
    establishmentType: parsed.data.establishmentType,
  });

  revalidatePath("/admin/etablissements");
}

export async function deleteEstablishmentAction(formData: FormData) {
  const { tenantId } = await requireAdminOnRoot();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  if (id === tenantId)
    throw new Error("Vous ne pouvez pas supprimer le siège.");

  // Authz : on n'autorise la suppression que d'un enfant DIRECT du tenant courant
  const target = await db.tenant.findUnique({
    where: { id },
    select: { parentTenantId: true },
  });
  if (!target || target.parentTenantId !== tenantId) {
    throw new Error("forbidden");
  }

  // Cascade : Prisma onDelete: Cascade supprime les users / progress / etc.
  await db.tenant.delete({ where: { id } });

  revalidatePath("/admin/etablissements");
}
