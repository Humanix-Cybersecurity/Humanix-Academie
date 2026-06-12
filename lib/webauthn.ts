// SPDX-License-Identifier: AGPL-3.0-or-later
// WebAuthn / FIDO2 - wrapper autour de @simplewebauthn/server.
//
// Architecture :
//  - Le challenge est genere cote serveur, signe HMAC-SHA256 et passe en
//    cookie HTTPOnly (5 min TTL). Pas de stockage en BDD pour les challenges.
//  - Apres verification, le credential est stocke dans WebAuthnCredential.
//  - Pour le step-up super-admin, on signe un cookie distinct "webauthn-fresh"
//    apres login, valide 30 min.
//
// RP_ID : domaine effectif (ex: "humanix-academie.fr").
// On le derive de AUTH_URL pour eviter une variable d'env supplementaire,
// mais on autorise WEBAUTHN_RP_ID en override (utile en dev local
// avec localhost, ou si on veut couvrir un sous-domaine specifique).
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
// SimpleWebAuthn v11+ : le package `@simplewebauthn/types` a ete merge dans
// `@simplewebauthn/server` (et `/browser`). On importe donc les types
// directement depuis `/server`. Ref :
// https://simplewebauthn.dev/docs/advanced/server-changelog#v1100
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

export type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 min
export const FRESH_AUTH_TTL_MS = 30 * 60 * 1000; // 30 min step-up

export const WEBAUTHN_REGISTER_COOKIE = "wac_reg";
export const WEBAUTHN_LOGIN_COOKIE = "wac_login";
export const WEBAUTHN_FRESH_COOKIE = "wac_fresh";

export function getRpId(): string {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  const url = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return "localhost";
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

export function getRpName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME ?? "Humanix Académie";
}

export function getOrigin(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

/**
 * Construit + valide l'origin pour la requete courante.
 *
 * Pour le multi-tenant : un user peut signer une challenge WebAuthn depuis
 * un sous-domaine de tenant (ex: humanix-community.humanix-academie.fr).
 * Le browser envoie l'origin du sub-domain dans la signature, donc
 * `expectedOrigin` cote serveur doit matcher ce sub-domain (pas le root
 * configure dans AUTH_URL).
 *
 * SECURITE : on revalide que l'host est soit le rpID exact, soit un
 * sub-domain du rpID. Cela empeche un attaquant qui controlerait un
 * autre domaine de jouer une signature replay-cross-domain.
 *
 * @param headersList Headers de la requete courante (next/headers)
 * @returns { ok: true, origin } si valide ; { ok: false } sinon
 */
export function buildRequestOrigin(headersList: {
  get: (name: string) => string | null;
}):
  | { ok: true; origin: string }
  | { ok: false; reason: string } {
  const host = headersList.get("host");
  if (!host) return { ok: false, reason: "no_host_header" };
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const rpId = getRpId();
  // Strip port pour la comparaison
  const hostName = host.split(":")[0];
  if (hostName !== rpId && !hostName.endsWith(`.${rpId}`)) {
    return { ok: false, reason: "origin_not_under_rpid" };
  }
  return { ok: true, origin: `${protocol}://${host}` };
}

// -----------------------------------------------------------------------------
// HMAC challenge stocké en cookie. On signe { challenge, userId, expiresAt }
// pour eviter un fetch BDD a chaque /options - /verify.
// -----------------------------------------------------------------------------
type ChallengeEnvelope = {
  challenge: string;
  userId: string;
  expiresAt: number;
};

function getSecret(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET non defini");
  return Buffer.from(s, "utf-8");
}

export function signChallenge(env: ChallengeEnvelope): string {
  const payload = Buffer.from(JSON.stringify(env), "utf-8").toString(
    "base64url",
  );
  const mac = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifyChallenge(token: string): ChallengeEnvelope | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const expected = createHmac("sha256", getSecret())
    .update(parts[0])
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(parts[1], "base64url");
  } catch {
    return null;
  }
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }
  let env: ChallengeEnvelope;
  try {
    env = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (typeof env.expiresAt !== "number" || env.expiresAt < Date.now()) {
    return null;
  }
  return env;
}

// -----------------------------------------------------------------------------
// REGISTER - generation des options pour enroller une nouvelle cle
// -----------------------------------------------------------------------------
export async function buildRegisterOptions(
  userId: string,
  userEmail: string,
): Promise<{
  options: PublicKeyCredentialCreationOptionsJSON;
  cookieValue: string;
}> {
  const existing = await db.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: getRpName(),
    rpID: getRpId(),
    userName: userEmail,
    userID: new Uint8Array(Buffer.from(userId, "utf-8")),
    timeout: 60_000,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: parseTransports(c.transports),
    })),
    authenticatorSelection: {
      // residentKey: "preferred" pour permettre passkeys synchronisees,
      // mais on accepte aussi les cles hardware-only (et-Fusion par ex.)
      residentKey: "preferred",
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  });

  const env: ChallengeEnvelope = {
    challenge: options.challenge,
    userId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  };
  return { options, cookieValue: signChallenge(env) };
}

// -----------------------------------------------------------------------------
// REGISTER - verification de la reponse de la cle et persistance
// -----------------------------------------------------------------------------
export async function verifyAndSaveRegistration(params: {
  userId: string;
  expectedChallenge: string;
  response: RegistrationResponseJSON;
  deviceName: string;
  /**
   * Origin attendu (ex: "https://humanix-community.humanix-academie.fr").
   * Si omis, fallback sur getOrigin() = AUTH_URL. Le caller doit avoir
   * valide que host = rpID ou sub-domain. Cf. /api/webauthn/register/verify.
   */
  expectedOrigin?: string;
}): Promise<{ ok: boolean; error?: string; credentialId?: string }> {
  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: params.expectedOrigin ?? getOrigin(),
      expectedRPID: getRpId(),
      requireUserVerification: false,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "verify_failed" };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "not_verified" };
  }
  const info = verification.registrationInfo;
  // SimpleWebAuthn v12+ : les champs `credentialID`, `credentialPublicKey`
  // et `counter` qui etaient a la racine de `registrationInfo` sont
  // desormais regroupes dans `registrationInfo.credential`. Les champs
  // `aaguid`, `userVerified` et `credentialBackedUp` restent a la racine.
  // Ref : https://simplewebauthn.dev/docs/advanced/server-changelog#v1200
  const credentialId = info.credential.id;
  const publicKey = Buffer.from(info.credential.publicKey).toString(
    "base64url",
  );
  const counter = info.credential.counter ?? 0;
  const aaguid = info.aaguid ?? null;
  const backedUp = info.credentialBackedUp ?? false;

  await db.webAuthnCredential.create({
    data: {
      userId: params.userId,
      credentialId,
      publicKey,
      counter: BigInt(counter),
      transports: (params.response.response.transports ?? []).join(",") || null,
      aaguid,
      backedUp,
      userVerified: info.userVerified ?? false,
      deviceName: params.deviceName.slice(0, 100) || "Clé de sécurité",
    },
  });
  return { ok: true, credentialId };
}

// -----------------------------------------------------------------------------
// LOGIN - generation des options
// -----------------------------------------------------------------------------
export async function buildLoginOptions(userId: string): Promise<{
  options: PublicKeyCredentialRequestOptionsJSON;
  cookieValue: string;
}> {
  const credentials = await db.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    timeout: 60_000,
    userVerification: "preferred",
    allowCredentials: credentials.map((c) => ({
      id: c.credentialId,
      transports: parseTransports(c.transports),
    })),
  });

  const env: ChallengeEnvelope = {
    challenge: options.challenge,
    userId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  };
  return { options, cookieValue: signChallenge(env) };
}

// -----------------------------------------------------------------------------
// LOGIN - verification de la reponse
// -----------------------------------------------------------------------------
export async function verifyLogin(params: {
  userId: string;
  expectedChallenge: string;
  response: AuthenticationResponseJSON;
  /**
   * Origin attendu de la signature WebAuthn (ex:
   * "https://humanix-community.humanix-academie.fr"). Si omis, on fallback
   * sur getOrigin() qui retourne le AUTH_URL global.
   *
   * SECURITE : le caller doit AVOIR VALIDE que l'origin est legitime (host
   * = rpID ou sub-domain du rpID). Cf. /api/webauthn/login/verify/route.ts.
   *
   * Ajoute 2026-05-23 : bug Florian - login depuis un sous-domaine de
   * tenant (humanix-community.humanix-academie.fr) retournait 401 parce
   * que getOrigin() = root domain mismatch avec origin signature browser.
   */
  expectedOrigin?: string;
}): Promise<{ ok: boolean; error?: string; credentialId?: string }> {
  const credId = params.response.id;
  const credential = await db.webAuthnCredential.findUnique({
    where: { credentialId: credId },
  });
  if (!credential || credential.userId !== params.userId) {
    return { ok: false, error: "credential_not_found" };
  }

  let verification: Awaited<
    ReturnType<typeof verifyAuthenticationResponse>
  >;
  try {
    verification = await verifyAuthenticationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: params.expectedOrigin ?? getOrigin(),
      expectedRPID: getRpId(),
      // SimpleWebAuthn v12+ : le parametre `authenticator` est renomme en
      // `credential` et utilise les noms canoniques WebAuthn (`id`,
      // `publicKey`) au lieu de `credentialID`/`credentialPublicKey`.
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: Number(credential.counter),
        transports: parseTransports(credential.transports),
      },
      requireUserVerification: false,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "verify_failed" };
  }
  if (!verification.verified) {
    return { ok: false, error: "not_verified" };
  }

  // Anti-replay : update du compteur signed
  await db.webAuthnCredential.update({
    where: { id: credential.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });
  return { ok: true, credentialId: credential.credentialId };
}

// -----------------------------------------------------------------------------
// FRESH AUTH - cookie signe pour le step-up super-admin
// -----------------------------------------------------------------------------
export function signFreshAuth(userId: string): string {
  const env: ChallengeEnvelope = {
    challenge: randomBytes(16).toString("base64url"),
    userId,
    expiresAt: Date.now() + FRESH_AUTH_TTL_MS,
  };
  return signChallenge(env);
}

export function verifyFreshAuth(
  token: string,
  expectedUserId: string,
): boolean {
  const env = verifyChallenge(token);
  if (!env) return false;
  return env.userId === expectedUserId;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function parseTransports(
  csv: string | null,
): AuthenticatorTransportFuture[] | undefined {
  if (!csv) return undefined;
  return csv.split(",").filter(Boolean) as AuthenticatorTransportFuture[];
}
