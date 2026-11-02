// SPDX-License-Identifier: AGPL-3.0-or-later
//
// getCurrentTenantId() - resout l'espace (tenant) ACTIF pour la requete en
// cours, en respectant la navigation croisee via TenantMembership.
//
// LOGIQUE :
//
//   1. Le sous-domaine (header `x-tenant-slug` pose par le proxy) designe
//      l'espace vise. Si l'utilisateur y a acces (natif, SUPERADMIN, acces
//      externe), c'est l'espace actif.
//   2. Sans sous-domaine, l'espace actif est l'espace d'origine
//      (session.user.tenantId).
//   3. Un sous-domaine auquel l'utilisateur n'a PAS acces n'est jamais
//      remplace en silence par son espace d'origine : getCurrentTenantId()
//      leve une erreur, et app/admin/layout.tsx renvoie vers le bon hote.
//      Avant le 2026-11-02, le repli silencieux faisait agir l'administration
//      sur l'espace d'origine alors que le bandeau annoncait l'autre espace.
//
// ROLE EFFECTIF : dans un espace qui n'est pas celui d'origine, le role est
// celui de l'acces externe (ou SUPERADMIN). Il doit etre au moins egal au
// role d'origine : les pages d'administration verifient encore le role
// d'origine, un acces externe de rang inferieur leur ferait accorder trop.
// Ce cas est signale `downgraded` et n'ouvre pas l'administration.
//
// USAGE TYPIQUE (server actions, server components admin, routes API) :
//
//   const tenantId = await getCurrentTenantId();
//   const users = await db.user.findMany({ where: { tenantId } });
//
// Le test app/admin/espace-actif.test.ts interdit toute lecture directe de
// session.user.tenantId dans app/admin et app/api/admin : c'est ici, et
// seulement ici, que l'espace actif se decide.
//
// SECURITE : ne PAS utiliser cote client. La resolution depend du header
// `x-tenant-slug` pose par le proxy, que le client ne peut pas forger
// (proxy.ts supprime toute valeur entrante avant de poser la sienne).
//
// Ajoute 2026-05-23 (Sprint 2 multi-tenant membership), complete le
// 2026-11-02 (fin de la migration, role effectif, plus de repli silencieux).

import "server-only";
import type { Role } from "@prisma/client";
import { resolveTenantContext } from "@/lib/tenant-context";
import { getEffectiveRole } from "@/lib/tenant-membership";
import { ROLE_RANK } from "@/lib/role-hierarchy";

export type CurrentTenantAccess = {
  userId: string;
  /** Espace d'origine de l'utilisateur (session.user.tenantId). */
  homeTenantId: string;
  homeRole: Role;
  /** Espace vise par la requete : celui du sous-domaine, sinon l'origine. */
  tenantId: string;
  /** Role effectif dans l'espace vise ; null si aucun acces. */
  role: Role | null;
  /**
   * home       : l'espace vise est l'espace d'origine ;
   * cross      : acces legitime a un autre espace, role au moins egal ;
   * mismatch   : aucun acces a l'espace du sous-domaine ;
   * downgraded : acces externe de rang inferieur au role d'origine.
   */
  status: "home" | "cross" | "mismatch" | "downgraded";
  /** Hote de l'espace d'origine, pour rediriger en cas de mismatch. */
  redirectTo: string | null;
};

/**
 * Resout l'espace vise ET le role effectif de l'utilisateur connecte.
 * Renvoie null sans session (ou sans espace d'origine en session).
 */
export async function getCurrentTenantAccess(): Promise<CurrentTenantAccess | null> {
  const ctx = await resolveTenantContext();
  const user = ctx.session?.user;
  if (
    !user ||
    typeof user.id !== "string" ||
    typeof user.tenantId !== "string"
  ) {
    return null;
  }
  const homeRole = (user.role as Role | undefined) ?? "LEARNER";
  const base = { userId: user.id, homeTenantId: user.tenantId, homeRole };

  if (ctx.kind === "tenant_mismatch") {
    return {
      ...base,
      tenantId: ctx.tenant.id,
      role: null,
      status: "mismatch",
      redirectTo: ctx.redirectTo,
    };
  }

  // Pas de sous-domaine, sous-domaine inconnu, ou sous-domaine de l'espace
  // d'origine : l'espace actif est l'origine, avec le role de la session.
  if (
    ctx.kind !== "tenant_match" ||
    !ctx.tenant ||
    ctx.tenant.id === user.tenantId
  ) {
    return {
      ...base,
      tenantId: user.tenantId,
      role: homeRole,
      status: "home",
      redirectTo: null,
    };
  }

  const role = await getEffectiveRole(user.id, ctx.tenant.id);
  if (!role) {
    // resolveTenantContext a reconnu un acces, mais le role ne se resout
    // plus (compte desactive entre-temps) : on traite comme un mismatch.
    return {
      ...base,
      tenantId: ctx.tenant.id,
      role: null,
      status: "mismatch",
      redirectTo: null,
    };
  }
  if (ROLE_RANK[role] < ROLE_RANK[homeRole]) {
    return {
      ...base,
      tenantId: ctx.tenant.id,
      role,
      status: "downgraded",
      redirectTo: null,
    };
  }
  return {
    ...base,
    tenantId: ctx.tenant.id,
    role,
    status: "cross",
    redirectTo: null,
  };
}

/**
 * Resout le tenantId actif pour la requete en cours.
 *
 * @throws Error("no_tenant") sans session (ou sans espace en session) ;
 *         Error("tenant_mismatch") si le sous-domaine designe un espace
 *         auquel l'utilisateur n'a pas acces : on ne se replie JAMAIS en
 *         silence sur l'espace d'origine ;
 *         Error("tenant_access_downgraded") si l'acces externe est de rang
 *         inferieur au role d'origine.
 */
export async function getCurrentTenantId(): Promise<string> {
  const access = await getCurrentTenantAccess();
  if (!access) throw new Error("no_tenant");
  if (access.status === "mismatch") throw new Error("tenant_mismatch");
  if (access.status === "downgraded") {
    throw new Error("tenant_access_downgraded");
  }
  return access.tenantId;
}

/**
 * Variante qui ne throw pas - retourne null en cas d'echec.
 * Pratique pour les server components qui veulent gerer le cas
 * "pas de tenant" sans crash.
 */
export async function getCurrentTenantIdOrNull(): Promise<string | null> {
  try {
    return await getCurrentTenantId();
  } catch {
    return null;
  }
}

/**
 * Indique si l'espace actif est DIFFERENT de l'espace d'origine de
 * l'utilisateur connecte. Utilise par l'UI pour afficher un bandeau « mode
 * cross-tenant ».
 *
 * Returns :
 *   - { isHome: true } : navigation sur l'espace d'origine (cas normal)
 *   - { isHome: false, activeTenantId, homeTenantId } : navigation croisee
 *   - null : impossible a determiner (pas de session, pas d'espace, ou acces
 *     refuse a l'espace du sous-domaine)
 */
export async function getTenantContextSummary(): Promise<
  | { isHome: true; activeTenantId: string; homeTenantId: string }
  | { isHome: false; activeTenantId: string; homeTenantId: string }
  | null
> {
  const access = await getCurrentTenantAccess();
  if (!access) return null;
  if (access.status === "mismatch" || access.status === "downgraded") {
    return null;
  }
  return {
    isHome: access.status === "home",
    activeTenantId: access.tenantId,
    homeTenantId: access.homeTenantId,
  } as
    | { isHome: true; activeTenantId: string; homeTenantId: string }
    | { isHome: false; activeTenantId: string; homeTenantId: string };
}
