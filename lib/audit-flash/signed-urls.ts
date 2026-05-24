// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Signature HMAC-SHA256 des URLs Audit Flash PDF.
//
// === Pourquoi (pentest fix #4, 2026-05-24) ===
//
// AVANT : l'URL `/api/audit-flash/<cuid>/pdf` etait une capability-URL sans
// expiration. Le CUID seul donnait acces au PDF qui contient PII complete
// (nom, email, entreprise, secteur, taille) + posture cyber (score, top
// risques, NIS2). Probleme double :
//   - Si le CUID fuite (Slack, screenshot, log proxy), acces eternel
//   - Pas d'audit trail des acces (qui a consulte, depuis quelle IP)
//
// APRES : URL signee HMAC-SHA256 avec expiration 30 jours par defaut.
// L'attaquant qui intercepte une URL ne peut l'utiliser que dans la
// fenetre d'expiration ET ne peut pas en forger d'autres (clef secrete).
//
// === Format de l'URL ===
//
//   /api/audit-flash/<cuid>/pdf?exp=<unix_ts>&sig=<hex_sha256>
//
//   - `exp` : timestamp Unix d'expiration (en secondes)
//   - `sig` : HMAC-SHA256(submissionId + "|" + exp, AUDIT_FLASH_URL_SECRET)
//
// === Secret de signature ===
//
// Variable d'env `AUDIT_FLASH_URL_SECRET` (rotation annuelle PSSI M15).
// Si manquante, on fallback sur AUTH_SECRET (par derivation HKDF-like)
// pour ne pas casser les deploiements existants.
//
// === Compatibilite ascendante ===
//
// Les anciennes URLs sans signature sont REJETEES en prod. Pour permettre
// la migration progressive (utilisateurs qui ont l'ancien lien dans leur
// boite mail), une fenetre de grace de 7 jours est implementee via
// `gracePeriodEnd` qui doit etre defini explicitement au deploiement.
// Apres expiration de la grace, toutes les URLs non signees retournent 401.

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Duree de validite par defaut d'un lien PDF signe : 30 jours.
 * Choix : assez long pour que l'utilisateur puisse retelecharger plus
 * tard sans refaire l'audit, assez court pour limiter l'exposition en
 * cas de fuite.
 */
export const DEFAULT_TTL_SECONDS = 30 * 24 * 3600; // 30 jours

/**
 * Recupere le secret de signature. Priorite :
 *   1. AUDIT_FLASH_URL_SECRET (recommande, rotation independante)
 *   2. AUTH_SECRET avec derivation (fallback compatibilite)
 *
 * En dev local sans AUTH_SECRET, lance une erreur claire pour eviter de
 * signer avec une valeur vide (qui rendrait toutes les URLs forgeables).
 */
function getSigningSecret(): string {
  const explicit = process.env.AUDIT_FLASH_URL_SECRET?.trim();
  if (explicit && explicit.length >= 32) return explicit;

  const authSecret = process.env.AUTH_SECRET?.trim();
  if (authSecret && authSecret.length >= 16) {
    // Derivation par HMAC pour ne pas reutiliser AUTH_SECRET tel quel
    // (mauvais hygiene crypto : un secret = un usage).
    return createHmac("sha256", authSecret)
      .update("humanix:audit-flash:url-signing:v1")
      .digest("hex");
  }

  throw new Error(
    "audit-flash signed URL : ni AUDIT_FLASH_URL_SECRET ni AUTH_SECRET configure (minimum 32 chars / 16 chars resp.)",
  );
}

/**
 * Calcule la signature HMAC-SHA256 pour un (submissionId, exp).
 */
function computeSignature(submissionId: string, exp: number): string {
  const secret = getSigningSecret();
  const payload = `${submissionId}|${exp}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Construit une URL signee pour le PDF.
 *
 * @param submissionId CUID de la soumission AuditFlashSubmission
 * @param ttlSeconds duree de validite (defaut 30 jours)
 * @param baseUrl optionnel, ex: https://humanix-academie.fr (sinon
 *                chemin relatif)
 * @returns URL relative ou absolue avec query params `?exp=...&sig=...`
 */
export function buildSignedPdfUrl(
  submissionId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  baseUrl?: string,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = computeSignature(submissionId, exp);
  const path = `/api/audit-flash/${submissionId}/pdf?exp=${exp}&sig=${sig}`;
  return baseUrl ? `${baseUrl}${path}` : path;
}

export type VerifyResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; reason: "missing_sig" | "missing_exp" | "expired" | "bad_signature" };

/**
 * Verifie la signature et l'expiration d'une URL signee.
 *
 * Implementation timing-safe pour eviter les attaques par chronometrage
 * sur la comparaison de la signature.
 */
export function verifySignedPdfUrl(
  submissionId: string,
  exp: string | null,
  sig: string | null,
  now: Date = new Date(),
): VerifyResult {
  if (!exp) return { ok: false, reason: "missing_exp" };
  if (!sig) return { ok: false, reason: "missing_sig" };

  const expNum = Number.parseInt(exp, 10);
  if (!Number.isFinite(expNum) || expNum <= 0) {
    return { ok: false, reason: "missing_exp" };
  }

  // 1. Expiration : verifier d'abord (rejet rapide, pas de calcul HMAC inutile)
  const nowSec = Math.floor(now.getTime() / 1000);
  if (expNum < nowSec) {
    return { ok: false, reason: "expired" };
  }

  // 2. Signature : comparison timing-safe
  const expected = computeSignature(submissionId, expNum);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(sig, "hex");
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "bad_signature" };
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, reason: "bad_signature" };
  }

  return { ok: true, expiresAt: new Date(expNum * 1000) };
}
