// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helpers pour la gestion des memberships croises — un user (typiquement
// SUPERADMIN) peut avoir un role admin dans D'AUTRES tenants que son home.
//
// CONTEXTE : Florian a demande 2026-05-23 de pouvoir "se mettre en admin
// d'un tenant en plus de ses fonctions de SUPERADMIN", et plus largement,
// que "etre admin de plusieurs tenants soit possible".
//
// MODELE : User.tenantId/.role = home (un user a TOUJOURS un tenant home).
//          TenantMembership(userId, tenantId, role) = membership additionnel
//          dans un tenant != home.
//
// SECURITE :
//   - Seul un SUPERADMIN peut creer/supprimer un TenantMembership
//   - Hierarchie RBAC : le role assigne <= role de l'operateur
//   - Hierarchie RBAC : l'operateur doit avoir un rang strict > role
//     existant du user cible dans son home (sinon on permettrait a un
//     ADMIN tenant A de gagner du pouvoir via membership tenant B)
//   - Audit obligatoire : AuditAction.TENANT_MEMBERSHIP_GRANTED/REVOKED
//   - Pas de self-grant : on ne peut pas s'ajouter soi-meme un membership
//     (le SUPERADMIN cree des memberships pour les SUPERADMIN, y compris
//     lui-meme via une autre route SUPERADMIN ; mais on bloque les
//     auto-ajouts via UI normale par defense en profondeur)
//
// USAGE :
//   - getEffectiveRole(userId, tenantId) : renvoie le role effectif d'un
//     user dans un tenant donne, ou null si pas d'acces.
//   - canActAsAdminInTenant(userId, tenantId) : true si user peut agir
//     comme admin dans ce tenant (home ADMIN/RSSI/SUPERADMIN OU SUPERADMIN
//     OU membership avec role MANAGER+).
//   - listTenantAdmins(tenantId) : liste enrichie des admins natifs +
//     externes (membership) d'un tenant.

import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLE_RANK } from "@/lib/role-hierarchy";

/**
 * Roles consideres comme "admin" (acces au panneau /admin).
 * MANAGER inclus pour la lecture, ADMIN/RSSI/SUPERADMIN pour les operations.
 */
const ADMIN_ROLES: Role[] = ["MANAGER", "RSSI", "ADMIN", "SUPERADMIN"];

/**
 * Renvoie le role effectif d'un user dans un tenant donne.
 *
 * Resolution :
 *   1. Si user.role === SUPERADMIN, renvoie SUPERADMIN (bypass total).
 *   2. Si user.tenantId === tenantId, renvoie user.role (membre natif).
 *   3. Sinon, cherche un TenantMembership(userId, tenantId).
 *      Si trouve, renvoie son role.
 *   4. Sinon, null.
 *
 * @returns Role effectif, ou null si aucun acces.
 */
export async function getEffectiveRole(
  userId: string,
  tenantId: string,
): Promise<Role | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantId: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  if (user.role === "SUPERADMIN") return "SUPERADMIN";
  if (user.tenantId === tenantId) return user.role;
  const membership = await db.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

/**
 * Verifie qu'un user peut agir comme admin (rang >= MANAGER) dans un tenant.
 */
export async function canActAsAdminInTenant(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const role = await getEffectiveRole(userId, tenantId);
  return role !== null && ADMIN_ROLES.includes(role);
}

/**
 * Verifie qu'un user a un acces (quelconque) a un tenant — natif ou via
 * membership. Utilise par resolveTenantContext pour autoriser la
 * navigation cross-tenant.
 */
export async function hasTenantAccess(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const role = await getEffectiveRole(userId, tenantId);
  return role !== null;
}

/**
 * Type d'admin renvoye par listTenantAdmins :
 *   - "native"   : User.tenantId === tenantId
 *   - "external" : via TenantMembership
 */
export type TenantAdminEntry = {
  userId: string;
  email: string;
  name: string | null;
  effectiveRole: Role;
  source: "native" | "external";
  /** Pour les externes : son tenant home. Null pour les natifs. */
  homeTenantId: string | null;
  homeTenantName: string | null;
  /** Pour les externes : qui a accorde le membership. */
  grantedBy: string | null;
  grantedAt: Date | null;
  isActive: boolean;
};

/**
 * Liste l'ensemble des admins (natifs + externes) d'un tenant.
 *
 * Retourne :
 *   - Tous les users dont .tenantId === tenantId ET .role IN [MANAGER, RSSI,
 *     ADMIN, SUPERADMIN] (admins natifs)
 *   - Tous les users qui ont un TenantMembership sur ce tenant avec role
 *     IN [MANAGER, RSSI, ADMIN] (admins externes)
 *
 * Note : les memberships avec role=LEARNER sont ignores (pas d'admin).
 */
export async function listTenantAdmins(
  tenantId: string,
): Promise<TenantAdminEntry[]> {
  const [natives, memberships] = await Promise.all([
    db.user.findMany({
      where: {
        tenantId,
        role: { in: ADMIN_ROLES },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    }),
    db.tenantMembership.findMany({
      where: {
        tenantId,
        role: { in: ADMIN_ROLES },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            tenantId: true,
            isActive: true,
          },
        },
      },
    }),
  ]);

  // Lookup les home tenants des externes en un coup
  const homeTenantIds = Array.from(
    new Set(memberships.map((m) => m.user.tenantId)),
  );
  const homeTenants = homeTenantIds.length
    ? await db.tenant.findMany({
        where: { id: { in: homeTenantIds } },
        select: { id: true, name: true },
      })
    : [];
  const homeTenantByid = new Map(
    homeTenants.map((t) => [t.id, t]),
  );

  const result: TenantAdminEntry[] = [];

  for (const u of natives) {
    result.push({
      userId: u.id,
      email: u.email,
      name: u.name,
      effectiveRole: u.role,
      source: "native",
      homeTenantId: null,
      homeTenantName: null,
      grantedBy: null,
      grantedAt: null,
      isActive: u.isActive,
    });
  }

  for (const m of memberships) {
    const home = homeTenantByid.get(m.user.tenantId);
    result.push({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      effectiveRole: m.role,
      source: "external",
      homeTenantId: m.user.tenantId,
      homeTenantName: home?.name ?? null,
      grantedBy: m.grantedBy,
      grantedAt: m.grantedAt,
      isActive: m.user.isActive,
    });
  }

  // Tri : natifs avant, puis par role descendant (SUPERADMIN -> MANAGER),
  // puis par email pour stabilite.
  return result.sort((a, b) => {
    if (a.source !== b.source) return a.source === "native" ? -1 : 1;
    const rankDiff = ROLE_RANK[b.effectiveRole] - ROLE_RANK[a.effectiveRole];
    if (rankDiff !== 0) return rankDiff;
    return a.email.localeCompare(b.email);
  });
}

/**
 * Liste les tenants ou un user a un membership additionnel (= acces admin
 * cross-tenant). Utile pour l'affichage profil et le switcher de tenant.
 *
 * Ne renvoie PAS le tenant home (qui est dans User.tenantId).
 */
export async function listUserMemberships(userId: string): Promise<
  Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: Role;
    grantedAt: Date;
  }>
> {
  const memberships = await db.tenantMembership.findMany({
    where: { userId },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { grantedAt: "desc" },
  });
  return memberships.map((m) => ({
    tenantId: m.tenant.id,
    tenantName: m.tenant.name,
    tenantSlug: m.tenant.slug,
    role: m.role,
    grantedAt: m.grantedAt,
  }));
}
