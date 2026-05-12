// SPDX-License-Identifier: AGPL-3.0-or-later
// Middleware Next.js (edge runtime) - 2 responsabilites distinctes :
//
//   1. RESOLUTION SUBDOMAIN -> TENANT SLUG (multi-tenant SaaS)
//      Pour <slug>.humanix-academie.fr :
//        - extrait le slug
//        - inject le header `x-tenant-slug` dans la requete downstream
//        - les server components / route handlers le lisent via headers()
//      L'edge runtime NE peut PAS faire de query Prisma, donc le lookup DB
//      est laisse aux Node runtimes (layouts, route handlers).
//
//   2. AUTH GUARD edge sur /admin/* et /api/admin/*
//      Defense en profondeur : rejet rapide des requetes sans session cookie
//      AVANT meme que Next.js compile la page. L'auth reelle reste cote
//      server (auth() dans les layouts). Reduit la surface d'attaque
//      sur scans / bots.
//
// On ne valide PAS la signature du cookie ici (ca demanderait d'importer
// next-auth dans l'edge runtime - couteux et bloque par Prisma adapter).
// Le but est juste de rejeter le cas evident "aucun cookie".

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  extractTenantSlug,
  getRootDomain,
} from "@/lib/subdomain-tenant";

// Noms de cookies utilises par Auth.js v5.
// - Dev : "authjs.session-token"
// - Prod (HTTPS) : "__Secure-authjs.session-token"
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

function hasSessionCookie(req: NextRequest): boolean {
  for (const name of SESSION_COOKIE_NAMES) {
    if (req.cookies.has(name)) return true;
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // === 1. RESOLUTION SUBDOMAIN -> TENANT SLUG ===
  // Extrait le slug du host header (ex: "acme.humanix-academie.fr" -> "acme").
  // Inject ensuite dans `x-tenant-slug` que les server components peuvent lire :
  //
  //   import { headers } from "next/headers";
  //   const slug = (await headers()).get("x-tenant-slug");
  //
  // Si pas de subdomain valide (naked domain, www, demo, api...) -> pas de header.
  const host = req.headers.get("host");
  const slug = extractTenantSlug(host, getRootDomain());

  // === 2. AUTH GUARD admin pages ===
  if (pathname.startsWith("/admin")) {
    if (!hasSessionCookie(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/connexion";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // === 3. AUTH GUARD admin API ===
  if (pathname.startsWith("/api/admin")) {
    if (!hasSessionCookie(req)) {
      return NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      );
    }
  }

  // === 4. PROPAGATION du tenant slug aux server components ===
  // On clone les headers de la requete et on inject `x-tenant-slug` si present.
  // Le `Set-Cookie`-style ici ne marche pas (NextRequest est immutable), il
  // faut passer par une nouvelle response avec headers modifies.
  if (slug) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-tenant-slug", slug);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

// Matcher : execute sur tous les paths SAUF les assets statiques et le
// healthcheck. Le subdomain doit etre detecte sur tout (landing, /apprendre,
// /admin, /api, etc.) car n'importe quelle URL d'un tenant peut etre tapee.
//
// Exclus :
//   - _next/static (chunks JS/CSS)
//   - _next/image  (Next image optimizer)
//   - favicon.ico
//   - api/health   (UptimeRobot, monitoring -- ne doit pas dependre du tenant)
//   - api/debug    (diagnostic temporaire -- a supprimer une fois bug fixe)
//   - api/payments/webhook (Payplug, signature externe -- pas de host check)
//   - .well-known  (security.txt, ACME challenges)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/debug|api/payments/webhook|\\.well-known).*)",
  ],
};
