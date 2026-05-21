// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Pages "landing" (acquisition) ou la priorite est la conversion,
// donc on supprime au maximum les popups non-essentielles.
//
// Sur ces pages : SEULES la CookieBanner (legal) et MascotPeek (delay 10s,
// position bas-gauche) sont autorisees. Les popups "feature discovery"
// (PWA install, HexChat tooltip) sont reportees aux pages app (post-login).
//
// Si tu ajoutes une nouvelle page d'acquisition, ajoute-la ici.

export const LANDING_PATHS_EXACT = new Set<string>([
  "/",
  "/tarifs",
  "/comparatif",
  "/famille",
  "/diagnostic-nis2",
  "/inscription",
  "/connexion",
  "/observatoire-fuites",
  "/cyber-meteo",
  "/anecdotes",
  "/audit-flash",
  "/librairie",
]);

export const LANDING_PATHS_PREFIX = [
  "/librairie/",
  "/diagnostic-nis2/",
  "/badges/",
  "/securite",
  "/cgu",
  "/cgv",
  "/mentions-legales",
  "/confidentialite",
  "/cookies",
];

/**
 * Retourne true si le chemin courant est une page d'acquisition
 * (donc : suppress popups non-essentielles).
 */
export function isLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (LANDING_PATHS_EXACT.has(pathname)) return true;
  return LANDING_PATHS_PREFIX.some((p) => pathname.startsWith(p));
}
