// SPDX-License-Identifier: AGPL-3.0-or-later
//
// getCurrentTenantId() — resout le tenant ACTIF pour la requete en cours,
// en respectant la possibilite de naviguer cross-tenant via TenantMembership.
//
// LOGIQUE :
//
//   1. On lit le sous-domaine via le header `x-tenant-slug` (injecte par
//      le proxy multi-tenant). Si present et que le user a un acces
//      (natif, SUPERADMIN, ou membership), on retourne ce tenant.
//
//   2. Sinon, on fallback sur `session.user.tenantId` (le tenant home
//      du user). C'est le comportement legacy.
//
//   3. Si rien n'est dispo, on throw.
//
// USAGE TYPIQUE (server actions, server components admin) :
//
//   const tenantId = await getCurrentTenantId();
//   const users = await db.user.findMany({ where: { tenantId } });
//
// AVANT cette fonction, le code utilisait `session.user.tenantId` partout.
// Le probleme : un SUPERADMIN avec membership sur tenant Acme qui navigue
// sur `acme.humanix-academie.fr/admin` voyait quand meme les donnees de
// SON tenant home (Humanix), pas celles d'Acme.
//
// Cette fonction corrige ca de facon centralisee. Migration progressive :
// les pages admin les plus critiques sont migrees dans cette PR, les
// autres seront migrees au fil de l'eau.
//
// SECURITE : ne PAS utiliser cote client. La resolution depend du header
// `x-tenant-slug` injecte par le proxy, qui n'est pas modifiable cote
// client (le proxy le pose lui-meme).
//
// Ajoute 2026-05-23 (Sprint 2 multi-tenant membership).

import "server-only";
import { resolveTenantContext } from "@/lib/tenant-context";

/**
 * Resout le tenantId actif pour la requete en cours.
 *
 * Priorité :
 *   1. Sous-domaine resolu via `resolveTenantContext` si l'user y a acces
 *      (natif, SUPERADMIN, ou membership).
 *   2. Sinon, fallback sur le tenant home de l'user (session.user.tenantId).
 *
 * @throws Error("no_tenant") si aucune source n'est dispo (user non
 *         connecte ET pas de sous-domaine resolu).
 */
export async function getCurrentTenantId(): Promise<string> {
  const ctx = await resolveTenantContext();

  // Cas 1 : sous-domaine resolu + user a acces (natif/SUPERADMIN/membership).
  // resolveTenantContext renvoie tenant_match dans ce cas (cf. modif
  // 2026-05-23 qui reconnait les memberships).
  if (ctx.kind === "tenant_match" && ctx.tenant) {
    return ctx.tenant.id;
  }

  // Cas 2 : fallback sur tenant home de l'user. Couvre :
  //   - kind === "no_subdomain" (navigation depuis humanix-academie.fr direct)
  //   - kind === "tenant_unknown" (sous-domaine inexistant, ne devrait pas
  //     arriver en pratique mais securise)
  //   - kind === "tenant_mismatch" (user n'a pas d'acces au tenant du
  //     sous-domaine — on revient sur son home tenant comme protection)
  const sessionTenantId =
    typeof ctx.session?.user?.tenantId === "string"
      ? ctx.session.user.tenantId
      : null;

  if (sessionTenantId) {
    return sessionTenantId;
  }

  throw new Error("no_tenant");
}

/**
 * Variante qui ne throw pas — retourne null en cas d'echec.
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
 * Indique si le tenant actif est DIFFERENT du tenant home de l'user
 * connecte. Utilise par l'UI pour afficher un banner "tu es en mode
 * cross-tenant via membership".
 *
 * Returns :
 *   - { isHome: true } : l'user navigue sur son tenant home (cas normal)
 *   - { isHome: false, activeTenantId, homeTenantId } : navigation cross-tenant
 *   - null : impossible a determiner (pas de session ou pas de tenant)
 */
export async function getTenantContextSummary(): Promise<
  | { isHome: true; activeTenantId: string; homeTenantId: string }
  | { isHome: false; activeTenantId: string; homeTenantId: string }
  | null
> {
  const ctx = await resolveTenantContext();
  const homeTenantId =
    typeof ctx.session?.user?.tenantId === "string"
      ? ctx.session.user.tenantId
      : null;
  if (!homeTenantId) return null;

  let activeTenantId: string;
  if (ctx.kind === "tenant_match" && ctx.tenant) {
    activeTenantId = ctx.tenant.id;
  } else {
    activeTenantId = homeTenantId;
  }

  return {
    isHome: activeTenantId === homeTenantId,
    activeTenantId,
    homeTenantId,
  } as
    | { isHome: true; activeTenantId: string; homeTenantId: string }
    | { isHome: false; activeTenantId: string; homeTenantId: string };
}
