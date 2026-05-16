// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Resolution subdomain -> tenantId pour le multi-tenant SaaS.
// -----------------------------------------------------------------------------
// PRINCIPE :
//   acme.humanix-academie.fr   -> tenant slug "acme"  -> tenant.id "tnt_xxx"
//   beta.humanix-academie.fr   -> tenant slug "beta"
//   humanix-academie.fr        -> pas de tenant (landing publique)
//   demo.humanix-academie.fr   -> mode demo (deja cable, slug demo-pme)
//
// Utilise par :
//   - proxy.ts             : validation early (reject si subdomain inconnu)
//   - lib/auth.ts          : session.tenantId resolu via host header
//   - app/admin/layout.tsx : check coherence subdomain <-> tenant connecte
//
// SECURITE : un user de tenant A connecte qui tape l'URL d'un tenant B
// (ex : evil.humanix-academie.fr pour B avec son cookie de A) DOIT etre
// rejete. Le proxy fait ce check.

const RESERVED_SUBDOMAINS = new Set<string>([
  // Sites/services nous-memes
  "www",
  "demo",
  "app",
  "api",
  "admin",
  "auth",
  "dashboard",
  "console",
  // Static / CDN / assets
  "static",
  "assets",
  "cdn",
  "img",
  "media",
  // Communications
  "mail",
  "email",
  "smtp",
  "pop",
  "imap",
  "ns1",
  "ns2",
  // Operationnel
  "plausible",
  "matomo",
  "stats",
  "monitor",
  "metrics",
  "grafana",
  "prometheus",
  "beszel",
  "status",
  // Marketing / produit
  "blog",
  "docs",
  "help",
  "support",
  "kb",
  "academy",
  "learn",
  // Admin / RH
  "billing",
  "invoice",
  "shop",
  "store",
  "buy",
  // Securite / conformite
  "security",
  "trust",
  "rgpd",
  "dpo",
  "legal",
  // Autres infra typiques
  "test",
  "dev",
  "staging",
  "preprod",
  "qa",
  "lab",
  "sandbox",
  "git",
  "repo",
  "ci",
  "ops",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export function isReservedSubdomain(slug: string): boolean {
  return RESERVED_SUBDOMAINS.has(slug.toLowerCase());
}

export function isValidTenantSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !isReservedSubdomain(slug);
}

/**
 * Extrait le subdomain potentiellement-tenant depuis un host header.
 * Retourne null si :
 *   - host est le naked domain (humanix-academie.fr)
 *   - host est un subdomain reserve (www, demo, api, etc.)
 *   - host n'est pas un subdomain de notre racine
 *
 * Exemples (avec rootDomain="humanix-academie.fr") :
 *   "acme.humanix-academie.fr"           -> "acme"
 *   "ACME.humanix-academie.fr"           -> "acme" (lowercase)
 *   "humanix-academie.fr"                -> null
 *   "www.humanix-academie.fr"            -> null (reserve)
 *   "evil.attacker.com"                  -> null (autre racine)
 *   "deep.sub.humanix-academie.fr"       -> null (un seul niveau accepte)
 *   "localhost:3000"                     -> null
 *   "127.0.0.1"                          -> null
 */
export function extractTenantSlug(
  host: string | null | undefined,
  rootDomain: string,
): string | null {
  if (!host) return null;

  // Strip port (ex: "acme.humanix-academie.fr:443")
  const hostname = host.split(":")[0].toLowerCase().trim();
  const root = rootDomain.toLowerCase().trim();

  // Naked domain -> pas de tenant
  if (hostname === root) return null;

  // Doit etre <slug>.<rootDomain>, pas <a>.<b>.<rootDomain>
  const suffix = `.${root}`;
  if (!hostname.endsWith(suffix)) return null;

  const candidate = hostname.slice(0, -suffix.length);

  // Pas de sous-sous-domaine (un seul niveau)
  if (candidate.includes(".")) return null;

  // Subdomain reserve (www, api, demo, etc.) -> pas un tenant
  if (isReservedSubdomain(candidate)) return null;

  // Format slug valide (a-z, 0-9, -)
  if (!SLUG_RE.test(candidate)) return null;

  return candidate;
}

/**
 * Domaine racine utilise pour resoudre les subdomains.
 * Configurable via NEXT_PUBLIC_APP_URL (ex: "https://humanix-academie.fr").
 * Fallback "humanix-academie.fr" si pas de var.
 */
export function getRootDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return "humanix-academie.fr";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "humanix-academie.fr";
  }
}
