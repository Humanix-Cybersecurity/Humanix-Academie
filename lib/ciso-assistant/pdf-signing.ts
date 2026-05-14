// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Signature Ed25519 des PDF de preuves CISO Assistant.
//
// Strategie :
//   - Si HUMANIX_PDF_SIGNING_PRIVATE_KEY_PEM est definie en env, on l'utilise
//     (cas prod : la cle est stockee dans Vault / 1Password / variable
//     environnement injectee par l'orchestrateur).
//   - Sinon, on genere une keypair AU BOOT du process et on la garde en
//     memoire dans globalThis. Toutes les preuves emises pendant la duree
//     de vie du process partagent la meme cle. Au redemarrage du container,
//     une nouvelle keypair est generee -> les signatures precedentes
//     restent verifiables tant qu'on conserve la pubkey publiee (cf.
//     endpoint /.well-known/humanix-pdf-pubkey.pem).
//   - En prod : injecter HUMANIX_PDF_SIGNING_PRIVATE_KEY_PEM dans un secret
//     manager (Kubernetes Secret, Docker Swarm secret, etc.).
//
// La cle est SEPAREE de la cle de licensing (cf. lib/license/sign.ts) :
//   - lib/license/sign.ts : signe les LICENCES Humanix (HUMANIX_LICENSE_KEY)
//   - ICI : signe les PDF de preuves audit envoyes vers CISO Assistant
//
// Domaines disjoints -> rotation independante -> moindre privilege.

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  KeyObject,
  sign as cryptoSign,
} from "node:crypto";

const GLOBAL_KEY_SYMBOL = Symbol.for("humanix.cisoPdfSigningKey");

type KeyState = {
  privateKey: KeyObject;
  publicKey: KeyObject;
  publicKeyPem: string;
  publicKeyFingerprint: string;
  ephemeral: boolean; // true si generee au boot (vs lue depuis env)
};

function computeFingerprint(publicKey: KeyObject): string {
  const der = publicKey.export({ format: "der", type: "spki" });
  // SHA-256 du SPKI public key, format colon-separated hex (style RFC 4716).
  return createHash("sha256")
    .update(der)
    .digest("hex")
    .match(/.{1,2}/g)!
    .join(":");
}

function loadOrGenerate(): KeyState {
  const cached = (globalThis as Record<symbol, unknown>)[GLOBAL_KEY_SYMBOL] as
    | KeyState
    | undefined;
  if (cached) return cached;

  const envPem = process.env.HUMANIX_PDF_SIGNING_PRIVATE_KEY_PEM;
  let privateKey: KeyObject;
  let ephemeral = false;
  if (envPem && envPem.includes("BEGIN PRIVATE KEY")) {
    privateKey = createPrivateKey({
      key: envPem,
      format: "pem",
      type: "pkcs8",
    });
  } else {
    // Generation ephemere : on log un warning pour ne pas laisser ce mode
    // passer inapercu en prod.
    const { privateKey: gen } = generateKeyPairSync("ed25519");
    privateKey = gen;
    ephemeral = true;
    console.warn(
      "[ciso-pdf-signing] HUMANIX_PDF_SIGNING_PRIVATE_KEY_PEM absente, " +
        "generation d'une keypair Ed25519 ephemere. Au redemarrage du " +
        "process, la pubkey changera. Pour la prod : injecter la PEM " +
        "depuis un secret manager.",
    );
  }
  const publicKey = createPublicKey(privateKey);
  const publicKeyPem = publicKey
    .export({ format: "pem", type: "spki" })
    .toString();
  const fingerprint = computeFingerprint(publicKey);

  const state: KeyState = {
    privateKey,
    publicKey,
    publicKeyPem,
    publicKeyFingerprint: fingerprint,
    ephemeral,
  };
  (globalThis as Record<symbol, unknown>)[GLOBAL_KEY_SYMBOL] = state;
  return state;
}

export type PdfSignature = {
  algorithm: "Ed25519";
  /** Hex SHA-256 du PDF binaire signe (ce qui est en realite signe) */
  contentHashSha256: string;
  /** Signature Ed25519 en base64url */
  signature: string;
  /** Fingerprint SHA-256 de la pubkey (lisible humain) */
  publicKeyFingerprint: string;
  /** ISO 8601 de la signature */
  signedAt: string;
};

/**
 * Signe le SHA-256 du buffer PDF avec la cle privee Ed25519 Humanix.
 * Retourne une structure JSON qui peut etre embedded dans le PDF (page
 * "Manifeste d'intégrité") ET dans la description CISO Assistant pour
 * verification ulterieure.
 */
export function signPdfBuffer(pdfBuffer: Buffer): PdfSignature {
  const state = loadOrGenerate();
  const hash = createHash("sha256").update(pdfBuffer).digest();
  const signature = cryptoSign(null, hash, state.privateKey);
  return {
    algorithm: "Ed25519",
    contentHashSha256: hash.toString("hex"),
    signature: signature
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
    publicKeyFingerprint: state.publicKeyFingerprint,
    signedAt: new Date().toISOString(),
  };
}

/**
 * Expose la pubkey courante au format PEM. Sert le endpoint
 * /.well-known/humanix-pdf-pubkey.pem pour permettre a un auditeur tiers
 * de verifier les signatures sans appeler Humanix.
 */
export function getCurrentPublicKeyPem(): {
  pem: string;
  fingerprint: string;
  ephemeral: boolean;
} {
  const state = loadOrGenerate();
  return {
    pem: state.publicKeyPem,
    fingerprint: state.publicKeyFingerprint,
    ephemeral: state.ephemeral,
  };
}
