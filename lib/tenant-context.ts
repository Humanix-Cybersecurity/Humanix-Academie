// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helpers server-side pour resoudre le tenant courant depuis :
//   1. Le header `x-tenant-slug` injecte par le proxy (multi-tenant SaaS)
//   2. La session NextAuth (session.user.tenantId)
//
// Et pour valider la coherence entre les deux sources :
//   - Si le user est connecte sur tenant ACME mais tape l'URL beta.humanix-academie.fr
//     -> redirect vers /admin de SON tenant (acme.humanix-academie.fr) ou 403
//
// Usage typique dans un server component :
//
//   import { resolveTenantContext } from "@/lib/tenant-context";
//   const ctx = await resolveTenantContext();
//   if (ctx.kind === "tenant_unknown") return notFound();
//   if (ctx.kind === "tenant_mismatch") redirect(ctx.redirectTo);
//   const tenantId = ctx.tenant.id;

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Type local pour la session NextAuth retournee par auth() sans args.
// On evite Awaited<ReturnType<typeof auth>> qui resout sur la signature
// "middleware handler" du fait des overloads NextAuth v5.
type SessionLike = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    tenantId?: string;
  };
} | null;

type TenantBase = {
  id: string;
  slug: string;
  name: string;
  plan: string;
};

export type TenantContext =
  | {
      /** Pas de subdomain dans l'URL (humanix-academie.fr ou demo.humanix-academie.fr). */
      kind: "no_subdomain";
      slug: null;
      tenant: null;
      session: SessionLike;
    }
  | {
      /** Subdomain present mais pas de tenant correspondant en BDD. */
      kind: "tenant_unknown";
      slug: string;
      tenant: null;
      session: SessionLike;
    }
  | {
      /** Subdomain match un tenant + user connecte sur le bon tenant. */
      kind: "tenant_match";
      slug: string;
      tenant: TenantBase;
      session: SessionLike;
    }
  | {
      /** Subdomain match un tenant mais user connecte sur un AUTRE tenant. */
      kind: "tenant_mismatch";
      slug: string;
      tenant: TenantBase;
      session: SessionLike;
      /**
       * URL ou rediriger l'user (subdomain de SON tenant).
       */
      redirectTo: string;
    }
  | {
      /** Subdomain match un tenant mais user pas connecte. */
      kind: "tenant_anonymous";
      slug: string;
      tenant: TenantBase;
      session: null;
    };

/**
 * Resout le contexte tenant courant en lisant le header `x-tenant-slug`
 * (injecte par proxy.ts) et la session.
 *
 * SECURITE : valide la coherence entre le subdomain et le tenant connecte.
 * Si un user de tenant A tape l'URL de tenant B avec son cookie, on detecte
 * le mismatch et on redirige (pas de leak de data cross-tenant).
 */
export async function resolveTenantContext(): Promise<TenantContext> {
  // Cast explicite : NextAuth v5 a plusieurs overloads pour `auth`,
  // et ReturnType resout sur le middleware handler. Sans args, c'est bien
  // une promesse de Session | null.
  const session = (await (auth as unknown as () => Promise<SessionLike>)()) ?? null;
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug");

  // Pas de subdomain = naked domain ou subdomain reserve
  if (!slug) {
    return { kind: "no_subdomain", slug: null, tenant: null, session };
  }

  // Lookup le tenant par slug
  const tenant = await db.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, plan: true },
  });

  if (!tenant) {
    return { kind: "tenant_unknown", slug, tenant: null, session };
  }

  // Pas de session : on retourne le contexte tenant pour permettre
  // aux pages publiques (/connexion brandee tenant) de s'afficher.
  if (!session?.user) {
    return { kind: "tenant_anonymous", slug, tenant, session: null };
  }

  // Session existe : verifier coherence subdomain <-> tenantId session
  const sessionTenantId =
    typeof session.user.tenantId === "string" ? session.user.tenantId : null;

  if (sessionTenantId === tenant.id) {
    return { kind: "tenant_match", slug, tenant, session };
  }

  // Mismatch : user connecte sur un autre tenant. On construit l'URL de SON
  // tenant pour redirect.
  const userTenant = sessionTenantId
    ? await db.tenant.findUnique({
        where: { id: sessionTenantId },
        select: { slug: true },
      })
    : null;

  const protocol =
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://") ? "http" : "https";
  const rootDomain = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.replace(/^www\./, "")
    : "humanix-academie.fr";

  const redirectTo = userTenant?.slug
    ? `${protocol}://${userTenant.slug}.${rootDomain}/admin`
    : `${protocol}://${rootDomain}/admin`;

  return { kind: "tenant_mismatch", slug, tenant, session, redirectTo };
}
