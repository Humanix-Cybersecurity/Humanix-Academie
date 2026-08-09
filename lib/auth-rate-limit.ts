// SPDX-License-Identifier: AGPL-3.0-or-later
// Freins anti-abus des flows d'authentification (#737).
//
// signIn("nodemailer") declenche un VRAI envoi via Scaleway TEM vers une
// adresse arbitraire non authentifiee : sans garde c'est un outil d'email
// bombing qui brule aussi notre reputation d'envoi. signIn("password") sans
// frein par IP permet le password spraying sous le radar du lockout
// par-compte (qui ne compte que les echecs CONSECUTIFS d'un meme compte).
//
// Modele identique a app/api/exposition/email/request-otp : double frein par
// IP et par email (hashe SHA-256 tronque, zero-PII dans les cles), backend
// in-memory lib/rate-limit (suffisant en mono-instance, cf. note la-bas).

import { createHash } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

// Magic link : 1h de fenetre. Plus lache que l'OTP d'exposition (3/h) car
// c'est LE chemin de connexion quotidien des comptes sans mot de passe —
// mais 5 mails/h max vers une meme adresse suffit a tuer le bombing, et
// 15/h par IP couvre un bureau derriere un NAT sans ouvrir le spray.
const MAGIC_WINDOW_MS = 60 * 60 * 1000;
const MAGIC_MAX_PER_IP = 15;
const MAGIC_MAX_PER_EMAIL = 5;

// Password : fenetre courte (15 min, alignee sur le lockout) mais seuils
// serres — un humain ne tape pas 20 mots de passe en 15 min depuis une IP.
const PW_WINDOW_MS = 15 * 60 * 1000;
const PW_MAX_PER_IP = 20;
const PW_MAX_PER_EMAIL = 10;

/** Cle de bucket zero-PII : hash SHA-256 tronque de l'email normalise. */
export function hashEmailKey(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex")
    .slice(0, 32);
}

/**
 * Frein d'envoi de magic link. `true` = envoi autorise.
 * Les deux buckets sont consommes a chaque appel (comme request-otp) : un
 * attaquant qui varie les emails epuise quand meme son bucket IP.
 */
export function checkMagicLinkRateLimit(
  ip: string | null,
  email: string,
): boolean {
  const ipRl = checkRateLimit(
    `auth-magic-ip:${ip ?? "unknown"}`,
    MAGIC_MAX_PER_IP,
    MAGIC_WINDOW_MS,
  );
  const emailRl = checkRateLimit(
    `auth-magic-mail:${hashEmailKey(email)}`,
    MAGIC_MAX_PER_EMAIL,
    MAGIC_WINDOW_MS,
  );
  return ipRl.ok && emailRl.ok;
}

/** Frein de tentative de connexion par mot de passe. `true` = tentative autorisee. */
export function checkPasswordRateLimit(
  ip: string | null,
  email: string,
): boolean {
  const ipRl = checkRateLimit(
    `auth-pw-ip:${ip ?? "unknown"}`,
    PW_MAX_PER_IP,
    PW_WINDOW_MS,
  );
  const emailRl = checkRateLimit(
    `auth-pw-mail:${hashEmailKey(email)}`,
    PW_MAX_PER_EMAIL,
    PW_WINDOW_MS,
  );
  return ipRl.ok && emailRl.ok;
}
