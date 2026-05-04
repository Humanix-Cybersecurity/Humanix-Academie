// SPDX-License-Identifier: AGPL-3.0-or-later
// Signature de licence avec Ed25519.
//
// Ce module n'est utilise QUE par le CLI Humanix (scripts/license-tool.ts)
// pour generer des licences signees. Il N'EST PAS importe par l'app
// runtime (qui n'a pas la cle privee, et ne doit jamais l'avoir).
//
// L'app runtime importe uniquement verify.ts (avec la cle publique).

import { createPrivateKey, generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { canonicalJson, encodeLicense } from "./format.js";
import type { LicensePayload } from "./types.js";

/**
 * Signe un payload avec la cle privee fournie en PEM.
 * Retourne la string licence complete (HUMANIX-LICENSE-v1.payload.sig).
 */
export function signLicense(
  payload: LicensePayload,
  privateKeyPem: string,
): string {
  const privateKey = createPrivateKey({
    key: privateKeyPem,
    format: "pem",
    type: "pkcs8",
  });

  const message = Buffer.from(canonicalJson(payload), "utf-8");
  // Ed25519 ne prend pas d'algo de hash en parametre (built-in SHA-512)
  const signature = cryptoSign(null, message, privateKey);
  const signatureB64 = signature
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return encodeLicense(payload, signatureB64);
}

/**
 * Genere une nouvelle paire de cles Ed25519. Sortie au format PEM.
 *
 * Usage :
 *   - 1 seule fois par environnement (prod, staging)
 *   - sauvegarder la PRIV en lieu sur (1Password, Bitwarden, HSM)
 *   - committer la PUB dans lib/license/public-key.ts
 *
 * NE JAMAIS committer la PRIV. NE JAMAIS la transmettre par email/Slack.
 */
export function generateKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey
      .export({ format: "pem", type: "spki" })
      .toString(),
    privateKeyPem: privateKey
      .export({ format: "pem", type: "pkcs8" })
      .toString(),
  };
}
