// SPDX-License-Identifier: AGPL-3.0-or-later
// Cache memoire de la verification de licence.
//
// Pourquoi : Ed25519 verify coute ~1 ms par appel. Si on verifie a chaque
// request HTTP (potentiellement 100+/sec en pic), on perd 100 ms/sec
// CPU pour rien — la licence ne change qu'au demarrage ou via UI admin.
//
// Strategie : on memorise le resultat pour 5 minutes. Ttl court pour que
// l'expiration "naturelle" de licence soit detectee rapidement (sinon
// une licence expirant a 23h59 resterait active jusqu'au prochain restart).

import { verifyLicenseString } from "./verify.js";
import type { LicenseCheckResult } from "./types.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  result: LicenseCheckResult;
  cachedAt: number;
  cacheKey: string;
};

let cache: CacheEntry | null = null;

/**
 * Verifie la licence active en utilisant le cache memoire si possible.
 * @param licenseString La string de licence (ou undefined si non configuree)
 * @param expectedDomain Domaine courant pour le cluster-lock
 */
export function verifyLicenseCached(
  licenseString: string | undefined,
  expectedDomain?: string,
): LicenseCheckResult {
  const key = `${licenseString ?? ""}|${expectedDomain ?? ""}`;
  const now = Date.now();

  if (cache && cache.cacheKey === key && now - cache.cachedAt < CACHE_TTL_MS) {
    return cache.result;
  }

  const result = licenseString
    ? verifyLicenseString(licenseString, expectedDomain)
    : ({ valid: false, error: "missing" } as const);

  cache = { result, cachedAt: now, cacheKey: key };
  return result;
}

/** Reset du cache. Utile en tests et apres un upload de nouvelle licence. */
export function resetLicenseCache(): void {
  cache = null;
}
