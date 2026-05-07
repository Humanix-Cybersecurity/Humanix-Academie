// SPDX-License-Identifier: AGPL-3.0-or-later
// Middleware Next.js (edge runtime) - defense en profondeur sur les routes
// administratives.
//
// IMPORTANT : ce middleware NE remplace PAS la validation cote serveur.
// L'auth reelle est faite par :
//   - app/admin/layout.tsx : auth() + redirect /connexion si pas authentifie
//   - chaque app/api/admin/**/route.ts : auth() + role check
//
// Le middleware ajoute juste un filtre edge rapide qui rejette les requetes
// sans cookie de session AVANT meme que Next.js compile la page ou execute
// la route. Benefices :
//   - Reduit la surface d'attaque (pas d'execution Node.js sur requetes
//     non-authentifiees vers /admin/**)
//   - Reduit la charge serveur sur scans / bots
//   - Audit RGAA/NIS2 : montre une couche middleware explicite
//
// On ne valide PAS la signature du cookie ici (ca demanderait d'importer
// next-auth dans l'edge runtime - couteux et bloque par Prisma adapter).
// Le but est juste de rejeter le cas evident "aucun cookie".
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // Routes admin pages : redirect /connexion si pas de session cookie.
  if (pathname.startsWith("/admin")) {
    if (!hasSessionCookie(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/connexion";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Routes admin API : 401 JSON si pas de session cookie.
  if (pathname.startsWith("/api/admin")) {
    if (!hasSessionCookie(req)) {
      return NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      );
    }
  }

  return NextResponse.next();
}

// Matcher : on n'execute le middleware que sur les paths concernes
// (perf : evite l'execution sur /, /tarifs, /api/health, assets statiques).
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
