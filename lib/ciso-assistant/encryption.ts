// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Chiffrement AES-256-GCM du password CISO Assistant.
//
// Memes garanties qu'en SMTP (lib/smtp/encryption.ts) :
//   - Cle derivee de AUTH_SECRET via HKDF -> isolation des secrets par
//     domaine (info distincte de "smtp-password-v1" -> "ciso-password-v1").
//   - IV aleatoire 12 octets par chiffrement (jamais reutilise).
//   - Tag d'authentification GCM 16 octets : detecte manipulation BDD.
//   - Format stocke : "<iv_b64url>:<ciphertext+tag_b64url>".
//
// Si AUTH_SECRET change, les passwords CISO Assistant existants deviennent
// illisibles et l'admin doit reconfigurer la connexion. Volontaire :
// resistance a une fuite de BDD seule.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;
const HKDF_INFO = "ciso-password-v1";

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 16) {
    throw new Error(
      "AUTH_SECRET trop court (>=16 chars requis) pour chiffrer le password CISO Assistant.",
    );
  }
  const derived = hkdfSync(
    "sha256",
    Buffer.from(secret),
    Buffer.alloc(0),
    Buffer.from(HKDF_INFO),
    KEY_LENGTH,
  );
  return Buffer.from(derived);
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function encryptCisoPassword(plaintext: string): string {
  if (!plaintext) {
    throw new Error("password vide");
  }
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${b64url(iv)}:${b64url(Buffer.concat([enc, tag]))}`;
}

export function decryptCisoPassword(stored: string): string {
  if (!stored || !stored.includes(":")) {
    throw new Error("format invalide (attendu : iv:cipher)");
  }
  const [ivB64, combinedB64] = stored.split(":");
  const iv = b64urlDecode(ivB64);
  const combined = b64urlDecode(combinedB64);
  if (iv.length !== IV_LENGTH) {
    throw new Error("IV de mauvaise longueur");
  }
  if (combined.length < TAG_LENGTH + 1) {
    throw new Error("ciphertext trop court");
  }
  const enc = combined.subarray(0, combined.length - TAG_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
