// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper pour recuperer le nonce CSP per-request dans un Server Component
// ou un Route Handler.
//
// Le nonce est genere par `proxy.ts` (edge runtime) a chaque requete,
// puis injecte dans :
//   - le header request `x-csp-nonce` (lu ici)
//   - le header response `Content-Security-Policy` (script-src 'nonce-XXX')
//
// Usage typique (Server Component) :
//
//   import { getCspNonce } from "@/lib/csp-nonce";
//
//   export default async function MyPage() {
//     const nonce = await getCspNonce();
//     return (
//       <script
//         nonce={nonce}
//         dangerouslySetInnerHTML={{ __html: "/* code inline */" }}
//       />
//     );
//   }
//
// Sans cet attribut nonce, le navigateur bloque l'execution du script
// (CSP "script-src 'nonce-XXX' 'strict-dynamic'", sans 'unsafe-inline'
// effectif sur navigateurs CSP3-aware).

import { headers } from "next/headers";

/**
 * Lit le nonce CSP de la requete courante. Retourne `undefined` si
 * la requete n'a pas passe par le middleware (tests, dev edge cases) -
 * dans ce cas, on omet l'attribut `nonce` du script, et le CSP statique
 * fallback de next.config.mjs s'applique.
 */
export async function getCspNonce(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-csp-nonce") ?? undefined;
}
