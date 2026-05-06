// SPDX-License-Identifier: AGPL-3.0-or-later
// Hash de mot de passe - scrypt (Node natif, pas de dependance externe).
// scrypt est resistant aux ASIC/GPU et standardise (RFC 7914).
// Format de stockage : "scrypt$N$r$p$saltBase64$hashBase64" (auto-portant).
//
// Politique :
//  - N=2^15, r=8, p=1 (recommande OWASP 2024 pour serveurs web)
//  - keylen=64, saltlen=16
//  - Compare en temps constant (timingSafeEqual)
//
// Pourquoi pas bcrypt/argon2 : on prefere zero dep native vs ajout NPM.
// scrypt est suffisant et c'est ce qu'utilise Node Auth.js par defaut.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 1 << 15; // 32768
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
// Default Node maxmem = 32MB, exactly equal to 128 * N * r * p which makes
// the call fail intermittently. We bump to 64MB for safety, also useful when
// hashing many codes in sequence (e.g. 10 backup codes).
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

/**
 * Verifie qu'un mot de passe respecte la politique minimale.
 * On reste pragmatique pour PME : 10 chars + 3 classes sur 4.
 * Le RSSI peut imposer plus via la 2FA (qui couvre le risque mdp faible).
 */
export function validatePasswordPolicy(plain: string): {
  ok: boolean;
  reason?: string;
} {
  if (typeof plain !== "string") return { ok: false, reason: "invalid" };
  if (plain.length < 10) {
    return { ok: false, reason: "Minimum 10 caractères." };
  }
  if (plain.length > 200) {
    return { ok: false, reason: "Maximum 200 caractères." };
  }
  let classes = 0;
  if (/[a-z]/.test(plain)) classes++;
  if (/[A-Z]/.test(plain)) classes++;
  if (/[0-9]/.test(plain)) classes++;
  if (/[^a-zA-Z0-9]/.test(plain)) classes++;
  if (classes < 3) {
    return {
      ok: false,
      reason:
        "Au moins 3 types de caractères parmi : minuscule, majuscule, chiffre, symbole.",
    };
  }
  return { ok: true };
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const derived = scryptSync(plain.normalize("NFKC"), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  let actual: Buffer;
  try {
    actual = scryptSync(plain.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Genere un set de codes de secours 2FA.
 * Format : 10 codes de 10 chars base32 (Crockford). Lisibles, sans
 * confusion 0/O/1/I. Renvoie le plain (a montrer une fois a l'user)
 * et un JSON-array de hashes (a stocker en BDD).
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateBackupCodes(count = 10): {
  plain: string[];
  hashedJson: string;
} {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buf = randomBytes(10);
    let code = "";
    for (let j = 0; j < 10; j++) {
      code += CROCKFORD[buf[j] % 32];
    }
    // Format lisible : ABCDE-FGHJK
    const formatted = code.slice(0, 5) + "-" + code.slice(5);
    plain.push(formatted);
    hashes.push(hashPassword(formatted));
  }
  return { plain, hashedJson: JSON.stringify(hashes) };
}

/**
 * Verifie un code de secours et renvoie la nouvelle liste de hashes
 * (le code utilise est retire). null si code invalide.
 */
export function consumeBackupCode(
  code: string,
  hashedJson: string,
): { newHashedJson: string } | null {
  if (!hashedJson) return null;
  let hashes: string[];
  try {
    hashes = JSON.parse(hashedJson);
    if (!Array.isArray(hashes)) return null;
  } catch {
    return null;
  }
  const normalized = code.trim().toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    if (verifyPassword(normalized, hashes[i])) {
      const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
      return { newHashedJson: JSON.stringify(remaining) };
    }
  }
  return null;
}
