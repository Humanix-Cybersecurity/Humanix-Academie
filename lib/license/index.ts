// SPDX-License-Identifier: AGPL-3.0-or-later
// API publique du module licence — **server-only par construction**.
//
// Ce module importe `node:crypto` (cf. verify.ts). NE JAMAIS l'importer
// depuis un fichier "use client" — le build Webpack/Next echouerait avec
// UnhandledSchemeError sur "node:crypto".
//
// Cote app runtime (Server Components, Server Actions, route handlers),
// on importe uniquement depuis ce fichier :
//   import {
//     getActiveLicense,        // licence en env, verifiee
//     getEffectivePlan,         // plan = licence-override ?? DB
//     isFeatureLicensed,        // helper pour les features-override
//   } from "@/lib/license";
//
// Sign.ts (signature) n'est PAS reexporte ici car il n'a rien a faire
// dans le runtime de l'app — il est utilise uniquement par le CLI.

import { db } from "@/lib/db";
import { normalizePlan, type PlanId } from "@/lib/plans";
import { verifyLicenseCached } from "./cache";
import type { LicenseCheckResult } from "./types";

export type {
  License,
  LicensePayload,
  LicenseCheckResult,
  LicenseError,
} from "./types";

export { LICENSE_ERROR_LABEL } from "./types";
export { describeLicenseError, verifyLicenseString } from "./verify";
export { verifyLicenseCached, resetLicenseCache } from "./cache";

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

/**
 * Plan effectif du tenant en combinant licence Ed25519 + DB.
 *
 * Si HUMANIX_LICENSE_KEY est configurée et valide (signature, dates,
 * domaine), son plan écrase la valeur DB. Sinon, fallback sur la valeur
 * DB du tenant (pure DB, comme `getTenantPlan` de `@/lib/plans`).
 *
 * **À utiliser dans les Server Components qui veulent un comportement
 * licence-aware** (ex: page admin qui montre le plan effectif, route
 * handler qui plan-gate une feature, etc.).
 *
 * Attention : ce module est server-only (importe node:crypto via verify.ts).
 * Ne JAMAIS importer depuis un "use client".
 */
export async function getEffectivePlan(tenantId: string): Promise<PlanId> {
  const license = getActiveLicense();
  if (license.valid) {
    return normalizePlan(license.license.plan);
  }
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  return normalizePlan(tenant?.plan);
}

function safeExtractDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
