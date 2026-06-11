// SPDX-License-Identifier: AGPL-3.0-or-later
// Proxy Next.js (edge runtime) - 3 responsabilites distinctes.
//
// Note : depuis Next.js 16, le fichier "middleware.ts" est renomme
// "proxy.ts" (la fonction exportee s'appelle `proxy`).
// Cf. https://nextjs.org/docs/messages/middleware-to-proxy
//
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
//   3. CSP NONCE PER-REQUEST (Sprint 4 securite)
//      Genere un nonce cryptographiquement aleatoire pour chaque requete,
//      l'inject dans :
//        - le header request `x-csp-nonce` (lecture cote server components
//          via lib/csp-nonce.ts)
//        - le header response `Content-Security-Policy` (directive
//          script-src 'nonce-XXX' + 'strict-dynamic')
//      But : supprimer 'unsafe-inline' du script-src. Les scripts inline
//      du repo (theme init, JSON-LD SEO) doivent porter l'attribut
//      `nonce={nonce}` pour etre execute. Tout autre script inline est
//      bloque par le navigateur -> protection forte contre XSS reflechi.
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

/**
 * Origine Plausible cloud, deduit dynamiquement de l'env var pour ne PAS
 * hardcoder plausible.io dans le CSP : un fork peut utiliser un proxy
 * self-host ou desactiver completement Plausible.
 */
function plausibleOrigin(): string {
  const url = process.env.NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/**
 * Construit le header Content-Security-Policy en injectant le nonce
 * per-request. Strategie "Strict CSP" Google :
 *   - script-src 'nonce-XXX' 'strict-dynamic' 'unsafe-inline'
 *     -> les navigateurs CSP3-aware ignorent 'unsafe-inline' si nonce
 *        present (fallback compat pour vieux navigateurs uniquement).
 *   - style-src garde 'unsafe-inline' (Tailwind CSS-in-JS l'exige).
 *   - connect-src whitelist FR/UE souverains.
 */
function buildCsp(nonce: string): string {
  const plausible = plausibleOrigin();
  const directives = [
    "default-src 'self'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Fallback pour navigateurs pre-CSP3 (Edge ancien, IE11) — ignore
      // par les nav modernes des que nonce/strict-dynamic est present.
      "'unsafe-inline'",
      plausible,
    ]
      .filter(Boolean)
      .join(" "),
    // style-src reste avec 'unsafe-inline' (Tailwind CSS-in-JS + inline
    // styles dynamiques l'exigent).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // media-src 'blob:' : TTSButton cree un blob URL depuis le MP3 recu
    // de /api/tts/synthesize. Sans blob:, l'audio echoue silencieusement.
    "media-src 'self' blob:",
    [
      "connect-src 'self'",
      // Plausible cloud (events POST) si configure
      plausible,
      // Providers UE/FR souverains
      "https://api.mistral.ai",
      "https://api.mollie.com",
      "https://api.scaleway.com",
    ]
      .filter(Boolean)
      .join(" "),
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

/**
 * Genere un nonce CSP cryptographiquement aleatoire (96 bits, encode b64).
 * Web Crypto API native disponible dans le runtime edge Next.js.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  // base64 standard (pas urlsafe) : le nonce vit dans le HTML/header,
  // pas dans une URL.
  return btoa(String.fromCharCode(...bytes));
}

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

export function proxy(req: NextRequest) {
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

  // === 4. PROPAGATION request headers + CSP NONCE per-request ===
  // On clone les headers de la requete pour pouvoir :
  //   - Injecter `x-tenant-slug` (etape 1)
  //   - Injecter `x-csp-nonce` (lecture cote server components via
  //     lib/csp-nonce.ts -> headers().get("x-csp-nonce"))
  // Le CSP response header porte le meme nonce dans script-src 'nonce-XXX'
  // pour que le navigateur n'execute que les scripts inline qui portent
  // l'attribut `nonce={nonce}` (theme init, JSON-LD SEO).
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-csp-nonce", nonce);
  // SECURITE : on supprime TOUJOURS un x-tenant-slug entrant (forge par le
  // client) avant de poser le slug legitime derive du host. Sinon, sur le
  // domaine nu ou un sous-domaine reserve (slug=null), un header forge
  // survivrait jusqu'a resolveTenantContext. Defense en profondeur (la
  // resolution aval revalide deja l'acces via hasTenantAccess).
  requestHeaders.delete("x-tenant-slug");
  if (slug) requestHeaders.set("x-tenant-slug", slug);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
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
//   - api/payments/webhook (Mollie, pas de host check)
//   - .well-known  (security.txt, ACME challenges)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/payments/webhook|\\.well-known).*)",
  ],
};
