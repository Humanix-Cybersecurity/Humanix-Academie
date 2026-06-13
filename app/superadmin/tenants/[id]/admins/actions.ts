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
import { canAssignRole } from "@/lib/role-hierarchy";
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
 * neutre - pour eviter l'enumeration (RGPD).
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

  // NB : on AUTORISE le self-membership. Cas d'usage signale par Florian
  // 2026-05-23 : le SUPERADMIN doit pouvoir s'auto-declarer admin d'un
  // tenant pour apparaitre dans la liste des admins de ce tenant et que
  // ses actions soient tracees comme legitimes (et non pas "bypass
  // SUPERADMIN tolere"). Le garde precedent self_membership_forbidden
  // etait trop conservateur - il bloquait le cas d'usage principal.
  // L'action reste auditee (audit trail trace qui a accorde quoi a qui).

  // Cas USER NATIF DU TENANT CIBLE : on ne cree pas un membership externe
  // (n'aurait pas de sens : il est deja dans ce tenant en tant que natif),
  // mais on PROMEUT directement son role natif. C'est le cas principal
  // sur le tenant humanix-community ou tous les nouveaux inscrits sont
  // des LEARNER natifs et doivent etre promus en MANAGER/RSSI/ADMIN.
  //
  // Signale par Florian 2026-05-23 :
  // "j'ai tenter de mettre un autre de mes compte qui lui est dans
  // humanix-community en admin mais il me dis de le faire par la console
  // car il est deja utilisateur du tenant. (...) c'est genant car le
  // tenant community c'est celui ou il y aura le plus d'utilisateur"
  //
  // Avant ce fix : return { ok: false, error: "already_native" } -> blocage.
  // Apres : on update le role natif + audit USER_ROLE_CHANGED.
  //
  // NB : on n'applique PAS assertCanChangeRole(actor.role, user.role, roleRaw)
  // ici. La regle canModifyRoleOf qui exige rank(actor) > rank(target) est
  // faite pour empecher un ADMIN de modifier le role d'un autre ADMIN. Mais
  // seul SUPERADMIN peut atteindre cette action (requireSuperadmin), donc
  // la check serait vide en pratique. canAssignRole (deja applique ligne 94)
  // suffit comme defense en profondeur.
  if (user.tenantId === tenantId) {
    if (user.role === roleRaw) {
      // No-op : le user a deja le bon role natif. Pas d'erreur, mais on
      // n'audite pas non plus pour eviter le bruit.
      return { ok: true, userId: user.id };
    }
    const previousRole = user.role;
    await db.user.update({
      where: { id: user.id },
      data: { role: roleRaw },
    });
    await auditLog({
      action: AuditActions.USER_ROLE_CHANGED,
      actor: { userId: actor.userId, email: actor.email, role: actor.role },
      tenantId,
      target: { type: "user", id: user.id, label: email },
      message: `Role natif ${previousRole} -> ${roleRaw} dans ${tenant.slug} (via UI superadmin)`,
      metadata: {
        from: previousRole,
        to: roleRaw,
        promotionContext: "superadmin_native_promotion",
        note,
      },
    });
    revalidatePath(`/superadmin/tenants/${tenantId}/admins`);
    revalidatePath(`/superadmin/tenants/${tenantId}/users`);
    return { ok: true, userId: user.id };
  }

  // User EXTERNE au tenant : on cree un TenantMembership normal.
  // canAssignRole (ligne 94) garantit que l'acteur ne peut pas creer un
  // membership d'un niveau superieur au sien.

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

  // NB : on n'applique PAS assertCanChangeRole(actor.role, m.user.role, newRole).
  // Comme pour addExternalAdminMembership, modifier le ROLE d'un membership
  // n'est pas une modification du role HOME du user - donc la regle
  // canModifyRoleOf qui exige rank(actor) > rank(target) ne s'applique pas.
  // canAssignRole (deja verifie ligne 247) garantit que l'acteur ne peut
  // pas creer un membership d'un niveau superieur au sien.

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
  // on ne casse pas l'invitation - le SUPERADMIN peut renvoyer plus tard).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const res = await sendInviteMagicLink({
    email,
    recipientName: name,
    inviterName: actor.email ?? "Humanix Admin",
    tenantName: tenant.name,
    baseUrl,
    tenantId,
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
