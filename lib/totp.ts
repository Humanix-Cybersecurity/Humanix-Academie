// SPDX-License-Identifier: AGPL-3.0-or-later
// TOTP (Time-based One-Time Password) - RFC 6238 + base32 RFC 4648.
// Implementation locale, zero dependance externe. Compatible Google
// Authenticator, Authy, 1Password, Microsoft Authenticator, FreeOTP.
//
// Parametres standards :
//  - HMAC-SHA1 (le standard Google Authenticator)
//  - Pas 30 secondes
//  - 6 chiffres
//  - Window ±1 (tolerance ~30s d'horloge desync)
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const PERIOD_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // ±1 = accepte t-30s, t, t+30s

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function base32Decode(str: string): Buffer {
  const cleaned = str.replace(/=+$/, "").toUpperCase().replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) throw new Error("Invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/**
 * Genere un secret aleatoire (20 octets = 160 bits, recommande RFC 4226).
 * Encode en base32 pour usage Authenticator.
 */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = code % 10 ** DIGITS;
  return mod.toString().padStart(DIGITS, "0");
}

/**
 * Genere le code TOTP courant (debug / tests / display).
 */
export function generateTotpCode(
  base32Secret: string,
  now: number = Date.now(),
): string {
  const secret = base32Decode(base32Secret);
  const counter = Math.floor(now / 1000 / PERIOD_SECONDS);
  return hotp(secret, counter);
}

/**
 * Verifie un code TOTP soumis par l'utilisateur.
 * Comparaison en temps constant, fenetre de tolerance.
 */
export function verifyTotpCode(
  base32Secret: string,
  submitted: string,
  now: number = Date.now(),
): boolean {
  if (!base32Secret || !submitted) return false;
  const cleaned = submitted.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  let secret: Buffer;
  try {
    secret = base32Decode(base32Secret);
  } catch {
    return false;
  }
  const counter = Math.floor(now / 1000 / PERIOD_SECONDS);
  for (let w = -WINDOW; w <= WINDOW; w++) {
    const expected = hotp(secret, counter + w);
    const a = Buffer.from(expected);
    const b = Buffer.from(cleaned);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/**
 * URI otpauth:// pour generation de QR code par l'app Authenticator.
 * Format : otpauth://totp/{label}?secret={S}&issuer={I}&algorithm=SHA1&digits=6&period=30
 */
export function buildOtpAuthUri(params: {
  secret: string;
  accountName: string; // ex: email user
  issuer: string; // ex: "Humanix Academie"
}): string {
  const label = `${encodeURIComponent(params.issuer)}:${encodeURIComponent(params.accountName)}`;
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
