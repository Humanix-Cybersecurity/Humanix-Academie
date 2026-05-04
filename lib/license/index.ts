// SPDX-License-Identifier: AGPL-3.0-or-later
// API publique du module licence.
//
// Cote app runtime, on importe uniquement depuis ce fichier :
//   import { getActiveLicense, isFeatureLicensed } from "@/lib/license";
//
// Sign.ts (signature) n'est PAS reexporte ici car il n'a rien a faire
// dans le runtime de l'app — il est utilise uniquement par le CLI.

export type {
  License,
  LicensePayload,
  LicenseCheckResult,
  LicenseError,
} from "./types.js";

export { LICENSE_ERROR_LABEL } from "./types.js";
export { describeLicenseError, verifyLicenseString } from "./verify.js";
export { verifyLicenseCached, resetLicenseCache } from "./cache.js";

import { verifyLicenseCached } from "./cache.js";
import type { LicenseCheckResult } from "./types.js";

/**
 * Recupere la licence active depuis l'env HUMANIX_LICENSE_KEY.
 * Verifie la signature, l'expiration, et le cluster-lock domain.
 *
 * Utilisation typique :
 *   const result = getActiveLicense();
 *   if (!result.valid) {
 *     // licence absente/invalide → fallback plan trial / decouverte
 *   } else {
 *     // result.license.plan, result.license.maxSeats, etc.
 *   }
 */
export function getActiveLicense(): LicenseCheckResult {
  const licenseString = process.env.HUMANIX_LICENSE_KEY;
  // On extrait le domaine de NEXT_PUBLIC_APP_URL pour le cluster-lock
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL;
  const expectedDomain = appUrl ? safeExtractDomain(appUrl) : undefined;
  return verifyLicenseCached(licenseString, expectedDomain);
}

/**
 * Helper haut-niveau : la feature donnee est-elle activee par la licence
 * active ? Verifie d'abord featuresOverride (whitelist explicite) puis
 * fallback sur le plan de la licence.
 *
 * NB : si pas de licence active, retourne false. C'est le comportement
 * "fail-closed" : sans licence, on ne donne acces a rien de premium.
 */
export function isFeatureLicensed(featureName: string): boolean {
  const result = getActiveLicense();
  if (!result.valid) return false;
  // Override prioritaire si non vide
  if (result.license.featuresOverride.length > 0) {
    return result.license.featuresOverride.includes(featureName);
  }
  // Sinon, c'est au plan-gating de FEATURE_MIN_PLAN de trancher.
  // On retourne true et on laisse planHasFeature() decider via le plan
  // de la licence (cf. lib/plans.ts:planHasFeatureFromLicense).
  return true;
}

function safeExtractDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
