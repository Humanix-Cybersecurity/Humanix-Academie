// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /post-login - page de routage canonique après authentification réussie.
// Server component qui :
//   - Lit la session
//   - Pas de session → redirect vers /connexion
//   - Session avec rôle ADMIN+ → /admin (sur le sous-domaine du tenant home)
//   - Session LEARNER → /apprendre (sur le sous-domaine du tenant home)
//
// Pourquoi cette page existe :
// Avant Phase 4, /connexion et /inscription envoyaient TOUS les users vers
// /apprendre. Un ADMIN qui se loggait passait donc par /apprendre puis
// devait naviguer manuellement vers /admin. Cette page centralise la
// logique : un seul callbackUrl partout = "/post-login".
//
// REFONTE 2026-05-23 (multi-tenant) :
// Avant : redirect("/apprendre") ou redirect("/admin") sur le host courant.
// Conséquence : un user community qui s'inscrit sur humanix-academie.fr
// arrivait sur humanix-academie.fr/apprendre au lieu de
// humanix-community.humanix-academie.fr/apprendre. Idem pour les magic
// links et les admins de tenants payants.
//
// Maintenant : on resout le tenant HOME du user (via session.user.tenantId)
// et on redirige vers le sous-domaine correspondant. Le cookie de session
// est domain-shared (cf. fix #600) donc la session survit le redirect
// cross-subdomain.
//
// CAS SUPERADMIN : on le laisse sur l'host courant (probably root) parce
// qu'il navigue cross-tenant via /superadmin. Forcer le redirect vers
// "son" tenant home serait contre-productif.
//
// CAS host courant = sous-domaine du tenant home : pas de redirect inutile,
// on garde l'user où il est.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pathForRole } from "@/lib/role-redirect";

// dynamic = la décision dépend de la session, jamais cacher.
export const dynamic = "force-dynamic";

/**
 * Construit l'URL absolue vers `<slug>.<rootDomain><path>`.
 *
 * Retourne null si :
 *   - NEXT_PUBLIC_APP_URL non configure
 *   - hostname est localhost / IP (dev - pas de routage par sous-domaine)
 *
 * @example
 *   buildTenantUrl("acme", "/admin")
 *     // -> "https://acme.humanix-academie.fr/admin"
 */
function buildTenantUrl(slug: string, path: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!base) return null;
  try {
    const url = new URL(base);
    const hostname = url.hostname.replace(/^www\./, "");
    // En dev (localhost / IP) on ne route pas par sous-domaine - pas
    // possible techniquement, le browser refuse les cookies cross-port.
    if (
      hostname === "localhost" ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
      hostname.includes(":")
    ) {
      return null;
    }
    return `${url.protocol}//${slug}.${hostname}${path}`;
  } catch {
    return null;
  }
}

export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  const role = (session.user as { role?: string }).role;
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  const targetPath = pathForRole(role);

  // SUPERADMIN : on ne le redirige pas vers son tenant home (il navigue
  // cross-tenant via /superadmin). Garde l'host courant.
  if (role === "SUPERADMIN") {
    redirect(targetPath);
  }

  // Pas de tenantId (cas degrade - ne devrait pas arriver post-auth) ->
  // fallback comportement legacy sur l'host courant.
  if (!tenantId) {
    redirect(targetPath);
  }

  // Lookup le tenant pour avoir le slug.
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, isActive: true },
  });

  // Tenant introuvable ou desactive : fallback root.
  if (!tenant || !tenant.isActive) {
    redirect(targetPath);
  }

  // Si on est deja sur le bon sous-domaine, pas la peine de redirect
  // cross-domain (evite un round-trip inutile + un flash UI).
  const h = await headers();
  const currentHost = (h.get("host") ?? "").split(":")[0].toLowerCase();
  const currentSlug = h.get("x-tenant-slug");
  if (currentSlug === tenant.slug || currentHost.startsWith(`${tenant.slug}.`)) {
    redirect(targetPath);
  }

  // Construit l'URL cross-subdomain vers le tenant home + redirect.
  // Le cookie de session etant domain-shared (.humanix-academie.fr), la
  // session survit le redirect - l'user arrive deja connecte sur son
  // sous-domaine.
  const tenantUrl = buildTenantUrl(tenant.slug, targetPath);
  if (!tenantUrl) {
    // En dev (localhost) on garde le comportement legacy.
    redirect(targetPath);
  }
  redirect(tenantUrl);
}
