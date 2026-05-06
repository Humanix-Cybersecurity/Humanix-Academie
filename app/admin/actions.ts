// SPDX-License-Identifier: AGPL-3.0-or-later
// Server Actions pour les operations admin
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role as string;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  const tenantId = session.user!.tenantId as string;
  if (!tenantId) throw new Error("no_tenant");
  return { tenantId, userId: session.user!.id as string, role };
}

// =====================================================
// MODULES (saisons)
// =====================================================
export async function toggleSaisonActive(saisonId: string, isActive: boolean) {
  const { tenantId } = await requireAdmin();
  await db.tenantSaisonConfig.upsert({
    where: { tenantId_saisonId: { tenantId, saisonId } },
    create: { tenantId, saisonId, isActive },
    update: { isActive },
  });
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return { ok: true };
}

export async function toggleSaisonMandatory(
  saisonId: string,
  isMandatory: boolean,
) {
  const { tenantId } = await requireAdmin();
  await db.tenantSaisonConfig.upsert({
    where: { tenantId_saisonId: { tenantId, saisonId } },
    create: { tenantId, saisonId, isMandatory },
    update: { isMandatory },
  });
  revalidatePath("/admin/modules");
  return { ok: true };
}

export async function moveSaison(saisonId: string, direction: "up" | "down") {
  const { tenantId } = await requireAdmin();
  // Recupere toutes les saisons accessibles au tenant + leurs configs custom
  const saisons = await db.saison.findMany({
    where: { OR: [{ tenantId: null }, { tenantId }] },
    orderBy: { order: "asc" },
  });
  const configs = await db.tenantSaisonConfig.findMany({ where: { tenantId } });
  const orderMap = new Map(configs.map((c) => [c.saisonId, c.customOrder]));

  // Tri effectif (custom order si défini, sinon order par défaut)
  const sorted = [...saisons].sort((a, b) => {
    const oa = orderMap.get(a.id) ?? a.order;
    const ob = orderMap.get(b.id) ?? b.order;
    return oa - ob;
  });

  const idx = sorted.findIndex((s) => s.id === saisonId);
  if (idx === -1) return { ok: false };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return { ok: false };

  // Swap des positions
  const a = sorted[idx];
  const b = sorted[swapWith];
  sorted[idx] = b;
  sorted[swapWith] = a;

  // On reattribue customOrder de 0 a N-1 a tous
  for (let i = 0; i < sorted.length; i++) {
    await db.tenantSaisonConfig.upsert({
      where: { tenantId_saisonId: { tenantId, saisonId: sorted[i].id } },
      create: { tenantId, saisonId: sorted[i].id, customOrder: i },
      update: { customOrder: i },
    });
  }
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return { ok: true };
}

export async function resetSaisonsOrder() {
  const { tenantId } = await requireAdmin();
  await db.tenantSaisonConfig.updateMany({
    where: { tenantId },
    data: { customOrder: null },
  });
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return { ok: true };
}

// =====================================================
// USERS
// =====================================================
export async function toggleUserActive(userId: string, isActive: boolean) {
  const { tenantId, userId: currentUserId } = await requireAdmin();
  if (userId === currentUserId) throw new Error("cannot_disable_self");
  // Verifier que l'utilisateur appartient au meme tenant
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  await db.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function changeUserRole(userId: string, role: Role) {
  const { tenantId, userId: currentUserId } = await requireAdmin();
  if (userId === currentUserId) throw new Error("cannot_change_own_role");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function deleteUser(userId: string) {
  const { tenantId, userId: currentUserId } = await requireAdmin();
  if (userId === currentUserId) throw new Error("cannot_delete_self");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  // Hard delete (cascade supprime progress / events / accounts / sessions)
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function inviteUser(formData: FormData) {
  const { tenantId } = await requireAdmin();
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const service = formData.get("service") as string;
  const role = (formData.get("role") as Role) || "LEARNER";
  if (!email || !email.includes("@")) throw new Error("invalid_email");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("email_taken");

  await db.user.create({
    data: {
      tenantId,
      email,
      name: name || null,
      service: service || null,
      role,
    },
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

// =====================================================
// CHALLENGE EQUIPE
// =====================================================
export async function startChallenge(formData: FormData) {
  const { tenantId } = await requireAdmin();
  const title =
    (formData.get("title") as string) || "Cyber-Challenge des équipes";
  const description = formData.get("description") as string;
  const durationDays = parseInt(
    (formData.get("durationDays") as string) || "7",
    10,
  );

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  // Desactive tout autre challenge en cours
  await db.teamChallenge.updateMany({
    where: { tenantId, isActive: true },
    data: { isActive: false },
  });

  await db.teamChallenge.create({
    data: { tenantId, title, description, startDate, endDate, isActive: true },
  });
  revalidatePath("/admin/challenge");
  revalidatePath("/apprendre");
  revalidatePath("/classement");
  return { ok: true };
}

export async function stopChallenge(challengeId: string) {
  const { tenantId } = await requireAdmin();
  const c = await db.teamChallenge.findUnique({ where: { id: challengeId } });
  if (!c || c.tenantId !== tenantId) throw new Error("not_found");
  await db.teamChallenge.update({
    where: { id: challengeId },
    data: { isActive: false, endDate: new Date() },
  });
  revalidatePath("/admin/challenge");
  revalidatePath("/apprendre");
  revalidatePath("/classement");
  return { ok: true };
}

// =====================================================
// GROUPES METIER (Compta, RH, Dev, Commercial...)
// =====================================================
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createGroup(formData: FormData) {
  const { tenantId } = await requireAdmin();
  const name = ((formData.get("name") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const emoji = ((formData.get("emoji") as string) ?? "🏷️").slice(0, 4);
  const color = ((formData.get("color") as string) ?? "").trim() || null;
  if (!name) throw new Error("name_required");
  let slug = slugify(name);
  if (!slug) slug = "groupe-" + Math.random().toString(36).slice(2, 6);
  // Eviter collision
  const existing = await db.group.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
  if (existing) {
    slug = slug + "-" + Math.random().toString(36).slice(2, 5);
  }
  await db.group.create({
    data: {
      tenantId,
      name,
      slug,
      emoji,
      color,
      description: description || null,
    },
  });
  revalidatePath("/admin/groupes");
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function updateGroup(groupId: string, formData: FormData) {
  const { tenantId } = await requireAdmin();
  const target = await db.group.findUnique({ where: { id: groupId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  const name = ((formData.get("name") as string) ?? target.name).trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const emoji = ((formData.get("emoji") as string) ?? target.emoji).slice(0, 4);
  const color = ((formData.get("color") as string) ?? "").trim() || null;
  const isActive = formData.get("isActive") !== null;
  await db.group.update({
    where: { id: groupId },
    data: {
      name,
      description: description || null,
      emoji,
      color,
      isActive,
    },
  });
  revalidatePath("/admin/groupes");
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function deleteGroup(groupId: string) {
  const { tenantId } = await requireAdmin();
  const target = await db.group.findUnique({ where: { id: groupId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  if (target.isSystem) throw new Error("system_group_protected");
  await db.group.delete({ where: { id: groupId } });
  revalidatePath("/admin/groupes");
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function setUserGroups(userId: string, groupIds: string[]) {
  const { tenantId } = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  // Filtre les groupes qui appartiennent bien au tenant
  const validGroups = await db.group.findMany({
    where: { id: { in: groupIds }, tenantId },
    select: { id: true },
  });
  const validIds = new Set(validGroups.map((g) => g.id));
  await db.$transaction([
    db.userGroup.deleteMany({ where: { userId } }),
    db.userGroup.createMany({
      data: Array.from(validIds).map((groupId) => ({ userId, groupId })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/groupes");
  return { ok: true };
}

export async function toggleGroupLead(
  userId: string,
  groupId: string,
  isLead: boolean,
) {
  const { tenantId } = await requireAdmin();
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group || group.tenantId !== tenantId) throw new Error("not_found");
  await db.userGroup.update({
    where: { userId_groupId: { userId, groupId } },
    data: { isLead },
  });
  revalidatePath("/admin/groupes");
  return { ok: true };
}

// =====================================================
// SECURITE : forcer 2FA, deverrouiller, declencher reset mdp
// =====================================================
export async function forceUserMfa(userId: string, force: boolean) {
  const { tenantId, userId: currentUserId } = await requireAdmin();
  if (userId === currentUserId && !force) {
    // On peut s'auto-forcer mais pas s'auto-detendre.
    throw new Error("cannot_unforce_self");
  }
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  await db.user.update({
    where: { id: userId },
    data: { mfaForced: force },
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function unlockUser(userId: string) {
  const { tenantId } = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  await db.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function adminResetUserMfa(userId: string) {
  const { tenantId } = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  await db.user.update({
    where: { id: userId },
    data: {
      mfaSecret: null,
      mfaEnabled: false,
      mfaEnabledAt: null,
      mfaBackupCodesHash: null,
    },
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

// =====================================================
// IMPORT CSV
// =====================================================
type CsvRow = { email: string; name?: string; service?: string; role?: string };

export async function bulkImportUsers(rows: CsvRow[]) {
  const { tenantId } = await requireAdmin();
  const validRoles = ["LEARNER", "MANAGER", "RSSI", "ADMIN"];

  const result = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const email = (row.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      result.errors.push(`Email invalide : "${row.email}"`);
      continue;
    }
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      result.skipped++;
      continue;
    }
    let role: Role = "LEARNER";
    if (row.role && validRoles.includes(row.role.toUpperCase())) {
      role = row.role.toUpperCase() as Role;
    }
    try {
      await db.user.create({
        data: {
          tenantId,
          email,
          name: row.name?.trim() || null,
          service: row.service?.trim() || null,
          role,
        },
      });
      result.created++;
    } catch (e: any) {
      result.errors.push(`Erreur pour ${email} : ${e?.message ?? "inconnue"}`);
    }
  }
  revalidatePath("/admin/utilisateurs");
  return result;
}
