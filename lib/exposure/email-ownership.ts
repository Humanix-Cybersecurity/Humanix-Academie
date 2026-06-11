// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Vérification de propriété d'email par OTP — STATELESS, ZÉRO PERSISTANCE.
//
// Réconcilie deux contraintes du module Exposition :
//   #1 self-check only : on ne révèle l'exposition qu'au propriétaire de
//      l'email (anti-doxxing) -> il faut prouver la possession.
//   #2 tier gratuit ZÉRO PII persistée -> on ne peut RIEN stocker en BDD.
//
// Solution : OTP transmis par email (Scaleway TEM, souverain), et binding
// porté par un COOKIE httpOnly signé HMAC chez l'utilisateur lui-même.
// Aucune ligne en base, aucun email en log.
//
// Cookie : `v1.<emailHash>.<issuedAt>.<binding>` où
//   emailHash = sha256(email lowercased)        (lie le cookie à CET email)
//   binding   = hmac(secret, emailHash|otp|issuedAt)
// Le binding est inforgeable (secret serveur) ET irréversible : un attaquant
// ne peut ni deviner l'OTP depuis le cookie, ni réutiliser l'OTP pour un autre
// email. L'OTP (6 chiffres) ne vit QUE dans l'email reçu par le propriétaire.

import { cookies } from "next/headers";
import { createHmac, createHash, timingSafeEqual, randomInt } from "node:crypto";
import { sendEmail } from "@/lib/email";

const COOKIE_NAME = "humanix-exposure-otp";
const OTP_TTL_SECONDS = 10 * 60; // 10 min
const VERSION = "v1";

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET manquant/trop court pour l'OTP exposition.");
  }
  return s;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

function hmac(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Génère un OTP numérique à 6 chiffres (cryptographiquement aléatoire). */
function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export type RequestOtpResult =
  | { ok: true }
  | { ok: false; reason: "invalid_email" | "email_not_sent" };

/**
 * Génère un OTP, l'envoie par email, et pose le cookie de binding signé.
 * NE PERSISTE RIEN en base.
 */
export async function requestEmailOtp(
  emailRaw: string,
): Promise<RequestOtpResult> {
  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@") || !email.includes(".")) {
    return { ok: false, reason: "invalid_email" };
  }

  const otp = generateOtp();
  const issuedAt = Date.now().toString();
  const emailHash = sha256(email);
  const binding = hmac(`${emailHash}|${otp}|${issuedAt}`);
  const cookieValue = `${VERSION}.${emailHash}.${issuedAt}.${binding}`;

  const sent = await sendEmail({
    to: email,
    subject: "Ton code de vérification Humanix",
    text: `Ton code de vérification est : ${otp}\n\nIl est valable 10 minutes. Si tu n'as pas demandé cette vérification, ignore cet email.\n\nHumanix Académie — on vérifie que c'est bien toi avant d'afficher quoi que ce soit (anti-doxxing).`,
    html: `<p>Ton code de vérification est :</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${otp}</p><p>Il est valable 10 minutes. Si tu n'as pas demandé cette vérification, ignore cet email.</p><p style="color:#666;font-size:13px">Humanix Académie — on vérifie que c'est bien toi avant d'afficher quoi que ce soit (anti-doxxing).</p>`,
  });

  // En dev/demo, sendEmail renvoie ok:false (dev_mode/demo_mode) : on pose
  // quand même le cookie pour ne pas bloquer le flow local, mais en prod un
  // échec d'envoi réel est une erreur.
  if (!sent.ok && sent.reason !== "dev_mode" && sent.reason !== "demo_mode") {
    return { ok: false, reason: "email_not_sent" };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OTP_TTL_SECONDS,
    path: "/",
  });

  return { ok: true };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "no_cookie" | "expired" | "email_mismatch" | "bad_code" };

/**
 * Vérifie un OTP soumis par l'utilisateur contre le cookie de binding.
 * Consomme le cookie en cas de succès. STATELESS, aucune lecture BDD.
 */
export async function verifyEmailOtp(
  emailRaw: string,
  otp: string,
): Promise<VerifyOtpResult> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return { ok: false, reason: "no_cookie" };

  const parts = raw.split(".");
  if (parts.length !== 4) return { ok: false, reason: "no_cookie" };
  const [version, emailHash, issuedAtStr, binding] = parts;
  if (version !== VERSION) return { ok: false, reason: "no_cookie" };

  const issuedAtMs = Number(issuedAtStr);
  if (!Number.isFinite(issuedAtMs)) return { ok: false, reason: "no_cookie" };
  if (Date.now() - issuedAtMs > OTP_TTL_SECONDS * 1000) {
    return { ok: false, reason: "expired" };
  }

  // L'OTP doit correspondre à CET email (anti-réutilisation cross-email).
  const email = normalizeEmail(emailRaw);
  if (sha256(email) !== emailHash) {
    return { ok: false, reason: "email_mismatch" };
  }

  // Recompute le binding avec l'OTP soumis : comparaison constant-time.
  const expected = hmac(`${emailHash}|${(otp ?? "").trim()}|${issuedAtStr}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(binding);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_code" };
  }

  // Succès : on consomme le cookie (usage unique).
  cookieStore.delete(COOKIE_NAME);
  return { ok: true };
}
