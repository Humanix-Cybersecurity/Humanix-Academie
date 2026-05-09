// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Chiffrement AES-256-GCM des passwords SMTP stockes en BDD.
//
// MODELE :
//   - Cle derivee deterministiquement de AUTH_SECRET via HKDF (info
//     "smtp-password-v1") -> isole la cle SMTP du JWT secret.
//   - IV aleatoire 12 octets par chiffrement (jamais reutilise).
//   - Tag d'authentification 16 octets (AES-GCM) : detecte la
//     manipulation post-stockage.
//   - Format stocke : base64url(iv) + ":" + base64url(ciphertext+tag)
//     -> stockage texte simple, deux champs separes par ":".
//
// SECURITE :
//   - Si AUTH_SECRET change, tous les passwords SMTP existants deviennent
//     illisibles (l'admin doit reconfigurer). C'est volontaire : un
//     attaquant qui leak la BDD sans le secret ne peut rien dechiffrer.
//   - Pas de "clef statique en repo" : la securite repose entierement
//     sur la confidentialite de AUTH_SECRET.
//
// ROTATION : voir docs/SMTP_KEY_ROTATION.md (a creer si besoin). Pour
// l'instant : pas de rotation automatique.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits - recommande pour GCM
const KEY_LENGTH = 32; // 256 bits
const HKDF_INFO = "smtp-password-v1"; // version la cle, permet rotation future

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 16) {
    throw new Error(
      "AUTH_SECRET trop court (>=16 chars requis) pour chiffrer les passwords SMTP.",
    );
  }
  // HKDF : derive une cle 256 bits separee du secret JWT, contextualisee.
  // Pas de sel : on ne stocke pas plusieurs cles, juste une derivee.
  const derived = hkdfSync(
    "sha256",
    Buffer.from(secret),
    Buffer.alloc(0), // pas de sel
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

/**
 * Chiffre un password en clair pour stockage. Retourne une string opaque
 * de la forme "iv_b64:ciphertext_b64" prete a etre stockee en BDD.
 */
export function encryptSmtpPassword(plaintext: string): string {
  if (!plaintext) {
    throw new Error("password vide");
  }
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // On concatene ciphertext + tag pour avoir un seul blob a decoder
  const combined = Buffer.concat([enc, tag]);
  return `${b64url(iv)}:${b64url(combined)}`;
}

/**
 * Dechiffre un password stocke. Lance une erreur si :
 *   - format incorrect (pas le ":")
 *   - tag d'authentification invalide (manipulation post-stockage)
 *   - AUTH_SECRET a change depuis le chiffrement
 */
export function decryptSmtpPassword(stored: string): string {
  if (!stored || !stored.includes(":")) {
    throw new Error("format invalide (attendu : iv:cipher)");
  }
  const [ivB64, combinedB64] = stored.split(":");
  const iv = b64urlDecode(ivB64);
  const combined = b64urlDecode(combinedB64);
  if (iv.length !== IV_LENGTH) {
    throw new Error("IV de mauvaise longueur");
  }
  // Le tag est les 16 derniers octets, le reste est le ciphertext
  const TAG_LENGTH = 16;
  if (combined.length < TAG_LENGTH + 1) {
    throw new Error("ciphertext trop court");
  }
  const enc = combined.subarray(0, combined.length - TAG_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Test rapide de l'integrite de la cle : on chiffre+dechiffre une string
 * connue. Utile pour le diagnostic au boot.
 */
export function selfTest(): boolean {
  try {
    const sample = "test-smtp-password-12345!";
    const enc = encryptSmtpPassword(sample);
    const dec = decryptSmtpPassword(enc);
    return dec === sample;
  } catch {
    return false;
  }
}
