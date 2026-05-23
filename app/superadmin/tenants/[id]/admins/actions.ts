// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions pour /superadmin/tenants/[id]/admins
//
// Permet a un SUPERADMIN de :
//   - Inviter un nouvel admin (cree un User natif du tenant avec role=ADMIN)
//   - Promouvoir un user existant du tenant en admin
//   - Ajouter un admin externe via TenantMembership (user existant dans
//     n'importe quel tenant)
//   - Retirer un membership externe
//
// Toutes les actions :
//   - Exigent role=SUPERADMIN cote server (defense en profondeur ; le
//     layout /superadmin redirige deja, mais on revalide)
//   - Auditees dans AuditLog avec AuditAction dediee
//   - Respectent la hierarchie RBAC (lib/role-hierarchy.ts)
//
// Ajoute 2026-05-23 dans le sprint multi-tenant membership.

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { auditLog, AuditActions } from "@/lib/audit";
import {
  canAssignRole,
  assertCanChangeRole,
} from "@/lib/role-hierarchy";
import { sendInviteMagicLink } from "@/lib/invite-email";

async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role as string;
  if (role !== "SUPERADMIN") throw new Error("forbidden");
  return {
    userId: session.user!.id as string,
    email: session.user!.email as string | undefined,
    role: role as Role,
  };
}

/**
 * Ajoute un admin EXTERNE via TenantMembership.
 *
 * Le user cible doit deja exister sur la plateforme (n'importe quel tenant).
 * Si l'email donne ne correspond a aucun user, on retourne un message
 * neutre — pour eviter l'enumeration (RGPD).
 *
 * Si le user est deja natif du tenant cible, on retourne une erreur claire
 * (il faut le promouvoir via changeUserRole sur /admin/utilisateurs, pas
 * lui ajouter un membership redondant).
 *
 * Si un membership existe deja, on retourne already_member.
 */
export async function addExternalAdminMembership(
  tenantId: string,
  formData: FormData,
): Promise<
  | { ok: true; userId: string }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "forbidden"
        | "tenant_not_found"
        | "user_not_found_neutral"
        | "already_native"
        | "already_member"
        | "invalid_role"
        | "forbidden_role_hierarchy"
        | "self_membership_forbidden";
    }
> {
  let actor: Awaited<ReturnType<typeof requireSuperadmin>>;
  try {
    actor = await requireSuperadmin();
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { ok: false, error: "tenant_not_found" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "ADMIN") as Role;
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;

  // Role assigne : doit etre dans le set admin et <= rang de l'operateur.
  if (!["MANAGER", "RSSI", "ADMIN"].includes(roleRaw)) {
    return { ok: false, error: "invalid_role" };
  }
  if (!canAssignRole(actor.role, roleRaw)) {
    return { ok: false, error: "forbidden_role_hierarchy" };
  }

  // Lookup user par email (sans reveler l'existence si introuvable).
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, tenantId: true, role: true, isActive: true },
  });
  if (!user) {
    return { ok: false, error: "user_not_found_neutral" };
  }

  // Defense en profondeur : meme si SUPERADMIN peut tout, on bloque
  // explicitement l'auto-membership via cette UI (cree de la confusion
  // dans l'audit). Pour qu'un SUPERADMIN ajoute SON propre access a un
  // tenant, c'est deja le cas via le bypass SUPERADMIN.
  if (user.id === actor.userId) {
    return { ok: false, error: "self_membership_forbidden" };
  }

  // Si le user est natif du tenant cible, c'est une promotion classique,
  // pas un membership externe. On refuse pour eviter la duplication.
  if (user.tenantId === tenantId) {
    return { ok: false, error: "already_native" };
  }

  // Hierarchie : le SUPERADMIN doit pouvoir assigner le role par rapport
  // au role courant du user dans son home (sinon on creerait une elevation
  // par effet de bord).
  try {
    assertCanChangeRole(actor.role, user.role, roleRaw);
  } catch {
    return { ok: false, error: "forbidden_role_hierarchy" };
  }

  // Tente la creation ; @@unique(userId, tenantId) garantit l'idempotence.
  try {
    await db.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId,
        role: roleRaw,
        grantedBy: actor.userId,
        note,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "already_member" };
    }
    throw e;
  }

  await auditLog({
    action: AuditActions.TENANT_MEMBERSHIP_GRANTED,
    actor: { userId: actor.userId, email: actor.email, role: actor.role },
    tenantId,
    target: { type: "user", id: user.id, label: email },
    message: `Membership ${roleRaw} accorde dans tenant ${tenant.slug}`,
    metadata: { role: roleRaw, note, fromHomeTenantId: user.tenantId },
  });

  revalidatePath(`/superadmin/tenants/${tenantId}/admins`);
  return { ok: true, userId: user.id };
}

/**
 * Retire un membership externe (= revoque l'acces admin cross-tenant).
 * N'affecte pas le user dans son home tenant.
 */
export async function revokeExternalAdminMembership(
  tenantId: string,
  membershipUserId: string,
): Promise<
  | { ok: true }
  | { ok: false; error: "unauthorized" | "forbidden" | "not_found" }
> {
  let actor: Awaited<ReturnType<typeof requireSuperadmin>>;
  try {
    actor = await requireSuperadmin();
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  const m = await db.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: membershipUserId, tenantId } },
    include: { user: { select: { email: true } } },
  });
  if (!m) return { ok: false, error: "not_found" };

  await db.tenantMembership.delete({
    where: { userId_tenantId: { userId: membershipUserId, tenantId } },
  });

  await auditLog({
    action: AuditActions.TENANT_MEMBERSHIP_REVOKED,
    actor: { userId: actor.userId, email: actor.email, role: actor.role },
    tenantId,
    target: { type: "user", id: membershipUserId, label: m.user.email },
    message: `Membership ${m.role} revoque`,
    metadata: { previousRole: m.role },
  });

  revalidatePath(`/superadmin/tenants/${tenantId}/admins`);
  return { ok: true };
}

/**
 * Modifie le role d'un membership existant (ex. MANAGER -> ADMIN).
 */
export async function updateExternalAdminMembershipRole(
  tenantId: string,
  membershipUserId: string,
  newRole: Role,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "forbidden"
        | "not_found"
        | "invalid_role"
        | "forbidden_role_hierarchy";
    }
> {
  let actor: Awaited<ReturnType<typeof requireSuperadmin>>;
  try {
    actor = await requireSuperadmin();
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  if (!["MANAGER", "RSSI", "ADMIN"].includes(newRole)) {
    return { ok: false, error: "invalid_role" };
  }
  if (!canAssignRole(actor.role, newRole)) {
    return { ok: false, error: "forbidden_role_hierarchy" };
  }

  const m = await db.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: membershipUserId, tenantId } },
    include: { user: { select: { email: true, role: true } } },
  });
  if (!m) return { ok: false, error: "not_found" };

  try {
    assertCanChangeRole(actor.role, m.user.role, newRole);
  } catch {
    return { ok: false, error: "forbidden_role_hierarchy" };
  }

  const previousRole = m.role;
  await db.tenantMembership.update({
    where: { userId_tenantId: { userId: membershipUserId, tenantId } },
    data: { role: newRole },
  });

  await auditLog({
    action: AuditActions.TENANT_MEMBERSHIP_UPDATED,
    actor: { userId: actor.userId, email: actor.email, role: actor.role },
    tenantId,
    target: { type: "user", id: membershipUserId, label: m.user.email },
    message: `Membership: ${previousRole} -> ${newRole}`,
    metadata: { from: previousRole, to: newRole },
  });

  revalidatePath(`/superadmin/tenants/${tenantId}/admins`);
  return { ok: true };
}

/**
 * Invite un NOUVEL admin (= cree un user natif du tenant avec un role
 * admin et envoie le magic link).
 *
 * Si l'email existe deja sur la plateforme (n'importe quel tenant), on
 * retourne already_exists pour orienter l'admin vers la fonction
 * "ajouter un admin externe" (membership) plutot que de fork.
 */
export async function inviteNewTenantAdmin(
  tenantId: string,
  formData: FormData,
): Promise<
  | { ok: true; userId: string }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "forbidden"
        | "tenant_not_found"
        | "invalid_email"
        | "invalid_role"
        | "already_exists"
        | "forbidden_role_hierarchy"
        | "email_send_failed";
    }
> {
  let actor: Awaited<ReturnType<typeof requireSuperadmin>>;
  try {
    actor = await requireSuperadmin();
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { ok: false, error: "tenant_not_found" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const roleRaw = String(formData.get("role") ?? "ADMIN") as Role;

  if (!email || !email.includes("@") || email.length > 200) {
    return { ok: false, error: "invalid_email" };
  }
  if (!["MANAGER", "RSSI", "ADMIN"].includes(roleRaw)) {
    return { ok: false, error: "invalid_role" };
  }
  if (!canAssignRole(actor.role, roleRaw)) {
    return { ok: false, error: "forbidden_role_hierarchy" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "already_exists" };
  }

  const user = await db.user.create({
    data: {
      email,
      name,
      tenantId,
      role: roleRaw,
      isActive: true,
    },
  });

  await auditLog({
    action: AuditActions.USER_CREATED_BY_SUPERADMIN,
    actor: { userId: actor.userId, email: actor.email, role: actor.role },
    tenantId,
    target: { type: "user", id: user.id, label: email },
    message: `Nouvel admin natif ${roleRaw} cree dans tenant ${tenant.slug}`,
    metadata: { role: roleRaw, via: "superadmin_admins_panel" },
  });

  // Envoi magic link (fire-and-forget : si l'email echoue, on log mais
  // on ne casse pas l'invitation — le SUPERADMIN peut renvoyer plus tard).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const res = await sendInviteMagicLink({
    email,
    recipientName: name,
    inviterName: actor.email ?? "Humanix Admin",
    tenantName: tenant.name,
    baseUrl,
  });
  if (!res.ok) {
    console.error(
      "[superadmin-admins] invite email failed",
      "reason" in res ? res.reason : "unknown",
    );
    // On considere ca comme un succes partiel : le user est cree, il faut
    // juste retenter l'envoi du mail.
  }

  revalidatePath(`/superadmin/tenants/${tenantId}/admins`);
  return { ok: true, userId: user.id };
}
