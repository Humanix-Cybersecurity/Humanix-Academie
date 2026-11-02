"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions multi-etablissements.
// Authz : ADMIN/SUPERADMIN du tenant racine uniquement.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/current-tenant";
import { db } from "@/lib/db";
import { createChildTenant } from "@/lib/multi-tenant";
import { auditLog, AuditActions } from "@/lib/audit";

async function requireAdminOnRoot(): Promise<{
  tenantId: string;
  userId: string;
  email: string | null;
  role: string;
}> {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN")
    throw new Error("forbidden");
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("forbidden");
  return {
    tenantId,
    userId: session!.user!.id as string,
    email: (session!.user!.email as string | undefined) ?? null,
    role,
  };
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

/**
 * Gestion deleguee d'un etablissement : les ADMIN et RSSI du siege
 * l'administrent depuis son hote (cf. lib/reseller/administration.ts). Posee
 * par defaut a la creation ; ce bouton sert a la retirer, ou a la remettre,
 * et pour les etablissements crees avant qu'elle existe.
 */
export async function setEstablishmentManagedAction(formData: FormData) {
  const acteur = await requireAdminOnRoot();
  const id = String(formData.get("id") ?? "");
  const enable = String(formData.get("enable") ?? "") === "true";
  if (!id) throw new Error("missing id");

  // Authz : enfant DIRECT du tenant courant seulement
  const target = await db.tenant.findUnique({
    where: { id },
    select: { parentTenantId: true, name: true },
  });
  if (!target || target.parentTenantId !== acteur.tenantId) {
    throw new Error("forbidden");
  }

  await db.tenant.update({
    where: { id },
    data: {
      parentManaged: enable,
      parentManagedAt: enable ? new Date() : null,
    },
  });

  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    actor: { userId: acteur.userId, email: acteur.email, role: acteur.role },
    tenantId: id,
    target: { type: "tenant", id, label: target.name },
    message: enable
      ? "Gestion déléguée au siège activée sur cet établissement"
      : "Gestion déléguée au siège retirée sur cet établissement",
    metadata: { parentTenantId: acteur.tenantId, parentManaged: enable },
  }).catch((e) => console.error("[etablissements] audit log failed", e));

  revalidatePath("/admin/etablissements");
}
