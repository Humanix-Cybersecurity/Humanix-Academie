// SPDX-License-Identifier: AGPL-3.0-or-later
// Verification de licence Ed25519 — utilise par l'app runtime.
//
// Securite :
//   - On ne fait JAMAIS confiance a la signature seule. On verifie aussi :
//     - format conforme (parse OK)
//     - version supportee (v: 1)
//     - dates issuedAt/expiresAt coherentes
//     - domaine match (si cluster-locked)
//   - La cle publique est embarquee dans le code (lib/license/public-key.ts).
//     Une env HUMANIX_LICENSE_PUBLIC_KEY peut override (utile pour tests
//     ou self-host avec sa propre PKI — l'AGPL le permet).
//
// Performance : le cache (cache.ts) memorise la derniere verification
// pour eviter de recalculer Ed25519 a chaque request.

import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { canonicalJson, decodeLicense } from "./format.js";
import { PUBLIC_KEY_PEM } from "./public-key.js";
import type {
  License,
  LicenseCheckResult,
  LicenseError,
  LicensePayload,
} from "./types.js";

/**
 * Verifie une string licence complete.
 * Retourne soit { valid: true, license } soit { valid: false, error }.
 *
 * @param licenseString La string au format HUMANIX-LICENSE-v1.X.Y
 * @param expectedDomain Optionnel : le domaine courant pour le cluster-lock
 * @param now Optionnel : date courante pour les tests (default: new Date())
 */
export function verifyLicenseString(
  licenseString: string,
  expectedDomain?: string,
  now: Date = new Date(),
): LicenseCheckResult {
  if (!licenseString || typeof licenseString !== "string") {
    return { valid: false, error: "missing" };
  }

  const license = decodeLicense(licenseString);
  if (!license) {
    return { valid: false, error: "malformed" };
  }

  if (license.v !== 1) {
    return { valid: false, error: "unsupported_version" };
  }

  // Verification cryptographique avant tout (signature)
  if (!verifySignature(license)) {
    return { valid: false, error: "bad_signature" };
  }

  // Dates
  const issued = parseDate(license.issuedAt);
  const expires = parseDate(license.expiresAt);
  if (!issued || !expires) {
    return { valid: false, error: "malformed" };
  }
  if (now < issued) {
    return { valid: false, error: "not_yet_valid" };
  }
  if (now > expires) {
    return { valid: false, error: "expired" };
  }

  // Cluster-lock domain (optionnel)
  if (license.domain && expectedDomain) {
    // Match strict ou sous-domaine. Ex : "humanix.fr" autorise "academie.humanix.fr"
    const expected = normalizeDomain(expectedDomain);
    const allowed = normalizeDomain(license.domain);
    if (expected !== allowed && !expected.endsWith(`.${allowed}`)) {
      return { valid: false, error: "domain_mismatch" };
    }
  }

  // Warning si expire dans <= 14 jours
  let warning: string | undefined;
  const daysUntilExpiry = Math.ceil(
    (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntilExpiry <= 14) {
    warning = `Licence expire dans ${daysUntilExpiry} jour(s). Pensez au renouvellement.`;
  }

  return { valid: true, license, warning };
}

function verifySignature(license: License): boolean {
  const pubPem = process.env.HUMANIX_LICENSE_PUBLIC_KEY ?? PUBLIC_KEY_PEM;
  if (!pubPem || pubPem.includes("REPLACE_BEFORE_PROD")) {
    // Cle publique non configuree → on echoue pour eviter d'accepter
    // n'importe quoi avec une cle de placeholder.
    return false;
  }

  let publicKey;
  try {
    publicKey = createPublicKey({ key: pubPem, format: "pem", type: "spki" });
  } catch {
    return false;
  }

  // Reconstruction du payload exactement comme il a ete signe
  const payload: LicensePayload = {
    v: license.v,
    licenseId: license.licenseId,
    issuedTo: license.issuedTo,
    domain: license.domain,
    plan: license.plan,
    maxSeats: license.maxSeats,
    featuresOverride: license.featuresOverride,
    issuedAt: license.issuedAt,
    expiresAt: license.expiresAt,
  };
  const message = Buffer.from(canonicalJson(payload), "utf-8");

  // Decode signature base64url
  const sig = base64UrlDecodeToBuffer(license.signature);
  if (!sig) return false;

  try {
    return cryptoVerify(null, message, publicKey, sig);
  } catch {
    return false;
  }
}

function base64UrlDecodeToBuffer(s: string): Buffer | null {
  if (!s) return null;
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeDomain(d: string): string {
  return d
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/:.*$/, "")
    .trim();
}

/** Map LicenseError → message i18n FR. */
export function describeLicenseError(error: LicenseError): string {
  const map: Record<LicenseError, string> = {
    missing: "Aucune licence configuree (HUMANIX_LICENSE_KEY absente).",
    malformed: "Format de licence invalide.",
    bad_signature:
      "Signature invalide. La licence a ete modifiee ou ne provient pas de Humanix Cybersecurity.",
    expired: "Licence expiree. Contactez Humanix pour le renouvellement.",
    not_yet_valid:
      "Licence pas encore valide (date d'emission dans le futur). Verifiez l'horloge serveur.",
    domain_mismatch:
      "Licence emise pour un autre domaine. Une licence est cluster-lockee.",
    unsupported_version:
      "Version de licence non supportee. Mettez a jour Humanix Academie.",
  };
  return map[error];
}
