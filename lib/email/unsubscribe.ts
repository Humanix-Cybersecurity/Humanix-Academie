// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helpers pour gerer le List-Unsubscribe (RFC 2369) + List-Unsubscribe-Post
// (RFC 8058 one-click) sur tous nos emails sortants.
//
// DEUX MODES :
//
//   1. TRANSACTIONNEL (magic link, password reset, payment receipt) :
//      Header List-Unsubscribe avec un mailto: uniquement (pas de POST).
//      Conforme RFC 2369. L'utilisateur peut signaler qu'il ne souhaite plus
//      recevoir ces mails, on traite ca a la main (rare). Cela satisfait les
//      verifications mail-tester / Gmail Postmaster sans casser la fonction
//      (un magic link n'est PAS opt-in, il est demande activement par l'user).
//
//   2. MARKETING / NEWSLETTER (cyber-anecdote, notifs admin opt-in...) :
//      Header List-Unsubscribe avec une URL HTTPS signee HMAC + header
//      List-Unsubscribe-Post: List-Unsubscribe=One-Click. Conforme RFC 8058.
//      Gmail/Outlook affichent un bouton "Se desinscrire" natif et appellent
//      directement notre endpoint en POST, sans confirmation.
//
// SECURITE :
//   - Le token HMAC est signe avec AUTH_SECRET. Pas de stockage en BDD
//     necessaire (stateless). Avantage : zero recherche DB pour valider.
//   - Le token contient { email, list, iat, exp } -> impossible de forger,
//     impossible de reutiliser apres expiration.
//   - Apres validation, on POSE l'opt-out dans EmailOptOut (cf. schema
//     Prisma). C'est lui qui gate les envois ulterieurs.
//
// EXCEPTION HISTORIQUE :
//   La newsletter "Cyber-Anecdote du Lundi" a son propre flow base sur
//   AnecdoteSubscription.unsubscribeToken (token DB random). C'est OK,
//   on garde son endpoint dedie /api/anecdotes/unsubscribe/[token].
//   Le nouveau systeme est utilise pour TOUS les autres mails.

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Listes opt-in supportees. Toute nouvelle liste marketing/notif doit etre
 * ajoutee ici (le type est strict pour eviter les fautes de frappe).
 *
 * - "transactional" : login (magic link), password reset, payment receipts.
 *   Mailto only (pas de one-click), juste pour satisfaire les checks mail.
 * - "anecdote"      : Cyber-Anecdote du Lundi. Geree par AnecdoteSubscription
 *   (table dediee). On accepte cette valeur ici uniquement pour validation
 *   uniforme - l'endpoint /api/unsubscribe redirige vers le flow Anecdote
 *   pour eviter la double base de verite.
 * - "admin-alerts"  : notifs admin opt-in (futures). Stockees dans EmailOptOut.
 * - "marketing"     : nouveautes produit, conseils mensuels. Idem.
 */
export type EmailListId =
  | "transactional"
  | "anecdote"
  | "admin-alerts"
  | "marketing";

const VALID_LISTS = new Set<EmailListId>([
  "transactional",
  "anecdote",
  "admin-alerts",
  "marketing",
]);

const TOKEN_VERSION = 1;
const DEFAULT_TTL_DAYS = 365; // 1 an, largement suffisant pour un click un mois apres reception

function getSigningKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 16) {
    throw new Error(
      "AUTH_SECRET trop court (>=16 chars requis) pour signer les tokens unsubscribe.",
    );
  }
  return Buffer.from(secret);
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

type TokenPayload = {
  v: number;
  email: string;
  list: EmailListId;
  iat: number; // unix seconds
  exp: number;
};

/**
 * Genere un token HMAC-signe pour l'unsubscribe one-click d'un email donne
 * d'une liste donnee. Stateless (pas de DB).
 */
export function signUnsubscribeToken(input: {
  email: string;
  list: EmailListId;
  ttlDays?: number;
}): string {
  if (!VALID_LISTS.has(input.list)) {
    throw new Error(`Liste inconnue : ${input.list}`);
  }
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Email invalide pour signature unsubscribe.");
  }
  const ttlDays = input.ttlDays ?? DEFAULT_TTL_DAYS;
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    v: TOKEN_VERSION,
    email,
    list: input.list,
    iat: now,
    exp: now + ttlDays * 86400,
  };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac("sha256", getSigningKey()).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export type VerifyResult =
  | { ok: true; email: string; list: EmailListId }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "unknown_list" | "unknown_version" };

/**
 * Verifie un token unsubscribe. Retourne l'email + liste si valide.
 * Constant-time comparison pour eviter les timing attacks.
 */
export function verifyUnsubscribeToken(token: string): VerifyResult {
  if (!token || typeof token !== "string") return { ok: false, reason: "malformed" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadB64, sigB64] = parts;

  let expected: Buffer;
  let received: Buffer;
  try {
    expected = createHmac("sha256", getSigningKey()).update(payloadB64).digest();
    received = base64UrlDecode(sigB64);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (expected.length !== received.length) {
    return { ok: false, reason: "bad_signature" };
  }
  if (!timingSafeEqual(expected, received)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (payload.v !== TOKEN_VERSION) return { ok: false, reason: "unknown_version" };
  if (!VALID_LISTS.has(payload.list)) return { ok: false, reason: "unknown_list" };
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };
  return { ok: true, email: payload.email, list: payload.list };
}

/**
 * Construit l'URL HTTPS one-click d'unsubscribe pour un email + liste.
 * Utilise NEXT_PUBLIC_APP_URL comme base (doit etre la meme que celle
 * presentee aux destinataires, sinon le navigateur peut bloquer).
 */
export function buildOneClickUnsubscribeUrl(
  email: string,
  list: EmailListId,
): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-academie.fr";
  const token = signUnsubscribeToken({ email, list });
  return `${base.replace(/\/$/, "")}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Headers RFC 8058 pour les mails marketing (one-click).
 * Met dans List-Unsubscribe a la fois l'URL HTTPS (pour Gmail/Outlook) et
 * un mailto (pour les clients qui ne supportent pas le POST). Le header
 * List-Unsubscribe-Post indique aux clients capables qu'ils peuvent
 * directement POSTer sur l'URL.
 */
export function oneClickUnsubscribeHeaders(
  email: string,
  list: EmailListId,
): Record<string, string> {
  if (list === "anecdote") {
    // Anecdote a son propre flow base sur AnecdoteSubscription.unsubscribeToken,
    // gere par lib/anecdotes/dispatcher.ts. Cette fonction NE devrait pas etre
    // appelee pour anecdote. On lance pour eviter une double source de verite.
    throw new Error(
      "Anecdote utilise son propre token DB, pas le token HMAC universel. Voir lib/anecdotes/dispatcher.ts.",
    );
  }
  const url = buildOneClickUnsubscribeUrl(email, list);
  const supportEmail =
    process.env.SUPPORT_EMAIL ?? "contact@humanix-cybersecurity.fr";
  return {
    "List-Unsubscribe": `<${url}>, <mailto:${supportEmail}?subject=unsubscribe%20${encodeURIComponent(list)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Headers RFC 2369 pour les mails transactionnels (mailto seul, pas de
 * one-click). A utiliser sur les magic links, password reset, payment
 * receipts. Indique aux clients mail "comment se signaler comme ne voulant
 * plus recevoir ce type de mail" sans casser la fonction (un magic link
 * n'est pas opt-in, l'utilisateur l'a explicitement demande en se loguant).
 */
export function transactionalUnsubscribeHeaders(): Record<string, string> {
  const supportEmail =
    process.env.SUPPORT_EMAIL ?? "contact@humanix-cybersecurity.fr";
  return {
    "List-Unsubscribe": `<mailto:${supportEmail}?subject=stop%20transactional>`,
  };
}
