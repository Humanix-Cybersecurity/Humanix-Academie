// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Inventaire des comptes a privileges (ANSSI HG mesure 7).
//
// "Disposer d'un inventaire exhaustif des comptes privilegies et le maintenir
// a jour" - guide d'hygiene informatique ANSSI v2 (2017).
//
// Couvre :
//   - les User dont le role natif est ADMIN, RSSI ou SUPERADMIN
//   - les TenantMembership croisees (operateur ayant un role privilegie dans
//     un AUTRE tenant que son home), typiquement les SUPERADMIN Humanix qui
//     accompagnent des tenants clients.
//
// Sortie : liste plate, groupable par tenant, exportable en CSV pour audit
// annuel (revue des comptes privilegies, mesure ANSSI HG 38).

import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export type PrivilegedAccount = {
  // Tenant ou l'utilisateur exerce le role privilegie (peut etre son home
  // tenant OU un autre tenant via TenantMembership).
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  // Identite utilisateur.
  userId: string;
  email: string;
  name: string | null;
  // Role exerce DANS CE TENANT (peut differer du role natif si membership).
  effectiveRole: Role;
  // Type d'attribution :
  //   - "native"     : le tenantId === User.tenantId (role natif)
  //   - "membership" : le tenantId est externe, attribue via TenantMembership
  source: "native" | "membership";
  // Date d'attribution (createdAt User si native, grantedAt si membership).
  grantedAt: Date;
  // Qui a accorde ce role (uniquement pour membership).
  grantedByEmail: string | null;
  grantedByName: string | null;
  // Hygiene securite :
  mfaEnabled: boolean;
  hasWebAuthn: boolean;
  emailVerified: boolean;
  // Dernier login (peut etre null si jamais connecte).
  lastLoginAt: Date | null;
  // Risque : un compte privilegie sans MFA + jamais logue + cree il y a > 90j
  // est un dormant a risque eleve. Calcule cote consommateur (pages, export).
  isActive: boolean;
};

const PRIVILEGED_ROLES: Role[] = ["ADMIN", "RSSI", "SUPERADMIN"];

/**
 * Recupere tous les comptes a privileges de la plateforme, sources confondues
 * (role natif + TenantMembership). Tri : tenantName, role decroissant, email.
 *
 * NOTE PERFORMANCE : on materialise tout en memoire car le nombre de comptes
 * privilegies reste tres faible (< 1000 a horizon 3 ans). Si la plateforme
 * scale au-dela, paginer + indexer (deja indexe sur TenantMembership[tenantId, role]).
 */
export async function listPrivilegedAccounts(): Promise<PrivilegedAccount[]> {
  // 1) Roles natifs : User.role in PRIVILEGED_ROLES
  const nativeUsers = await db.user.findMany({
    where: {
      role: { in: PRIVILEGED_ROLES },
      isActive: true,
    },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      webauthnCredentials: { select: { id: true }, take: 1 },
    },
    orderBy: [{ tenant: { name: "asc" } }, { role: "desc" }, { email: "asc" }],
  });

  // 2) Memberships croisees : TenantMembership avec role privilegie
  const memberships = await db.tenantMembership.findMany({
    where: { role: { in: PRIVILEGED_ROLES } },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      user: {
        include: {
          webauthnCredentials: { select: { id: true }, take: 1 },
        },
      },
      grantedByUser: { select: { email: true, name: true } },
    },
    orderBy: [{ tenant: { name: "asc" } }, { role: "desc" }],
  });

  const accounts: PrivilegedAccount[] = [];

  for (const u of nativeUsers) {
    accounts.push({
      tenantId: u.tenant.id,
      tenantName: u.tenant.name,
      tenantSlug: u.tenant.slug,
      userId: u.id,
      email: u.email,
      name: u.name,
      effectiveRole: u.role,
      source: "native",
      grantedAt: u.createdAt,
      grantedByEmail: null,
      grantedByName: null,
      mfaEnabled: u.mfaEnabled,
      hasWebAuthn: u.webauthnCredentials.length > 0,
      emailVerified: u.emailVerified !== null,
      lastLoginAt: u.lastLoginAt,
      isActive: u.isActive,
    });
  }

  for (const m of memberships) {
    accounts.push({
      tenantId: m.tenant.id,
      tenantName: m.tenant.name,
      tenantSlug: m.tenant.slug,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      effectiveRole: m.role,
      source: "membership",
      grantedAt: m.grantedAt,
      grantedByEmail: m.grantedByUser?.email ?? null,
      grantedByName: m.grantedByUser?.name ?? null,
      mfaEnabled: m.user.mfaEnabled,
      hasWebAuthn: m.user.webauthnCredentials.length > 0,
      emailVerified: m.user.emailVerified !== null,
      lastLoginAt: m.user.lastLoginAt,
      isActive: m.user.isActive,
    });
  }

  // Tri final : tenantName asc, role rank desc (SUPERADMIN > ADMIN > RSSI),
  // puis email asc.
  const roleRank: Record<Role, number> = {
    LEARNER: 0,
    MANAGER: 1,
    RSSI: 2,
    ADMIN: 3,
    SUPERADMIN: 4,
  };
  accounts.sort((a, b) => {
    const tn = a.tenantName.localeCompare(b.tenantName);
    if (tn !== 0) return tn;
    const rr = roleRank[b.effectiveRole] - roleRank[a.effectiveRole];
    if (rr !== 0) return rr;
    return a.email.localeCompare(b.email);
  });

  return accounts;
}

/**
 * Groupe l'inventaire par tenant pour l'affichage.
 */
export function groupByTenant(
  accounts: PrivilegedAccount[],
): {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  accounts: PrivilegedAccount[];
}[] {
  const map = new Map<string, PrivilegedAccount[]>();
  for (const a of accounts) {
    const arr = map.get(a.tenantId) ?? [];
    arr.push(a);
    map.set(a.tenantId, arr);
  }
  return Array.from(map.entries()).map(([tenantId, arr]) => ({
    tenantId,
    tenantName: arr[0].tenantName,
    tenantSlug: arr[0].tenantSlug,
    accounts: arr,
  }));
}

/**
 * Detecte les comptes "dormants a risque eleve" :
 *   - jamais logue (lastLoginAt = null) ET cree il y a plus de 90 jours, OU
 *   - dernier login il y a plus de 180 jours, OU
 *   - MFA desactive ET email non verifie.
 *
 * Ces comptes doivent etre revus a chaque audit annuel ANSSI HG.
 */
export function detectDormantAccounts(
  accounts: PrivilegedAccount[],
  now: Date = new Date(),
): PrivilegedAccount[] {
  const ms = (days: number) => days * 24 * 3600 * 1000;
  return accounts.filter((a) => {
    if (!a.mfaEnabled && !a.emailVerified) return true;
    if (a.lastLoginAt === null) {
      return now.getTime() - a.grantedAt.getTime() > ms(90);
    }
    return now.getTime() - a.lastLoginAt.getTime() > ms(180);
  });
}

/**
 * Export CSV de l'inventaire pour audit annuel (mesure ANSSI HG 38).
 * Format compatible Excel / Numbers. Caractere separateur : ";" (FR).
 */
export function toCsv(accounts: PrivilegedAccount[]): string {
  const header = [
    "tenant_name",
    "tenant_slug",
    "user_email",
    "user_name",
    "role",
    "source",
    "granted_at_iso",
    "granted_by_email",
    "mfa_enabled",
    "webauthn_enrolled",
    "email_verified",
    "last_login_iso",
    "is_active",
  ].join(";");

  const lines = accounts.map((a) => {
    const f = (v: string | number | boolean | Date | null): string => {
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v.toISOString();
      const s = String(v);
      // Escape : si valeur contient ; " ou \n -> entourer de "" + escape "
      if (s.includes(";") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    return [
      f(a.tenantName),
      f(a.tenantSlug),
      f(a.email),
      f(a.name),
      f(a.effectiveRole),
      f(a.source),
      f(a.grantedAt),
      f(a.grantedByEmail),
      f(a.mfaEnabled),
      f(a.hasWebAuthn),
      f(a.emailVerified),
      f(a.lastLoginAt),
      f(a.isActive),
    ].join(";");
  });

  return [header, ...lines].join("\n") + "\n";
}
