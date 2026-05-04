// SPDX-License-Identifier: AGPL-3.0-or-later
// Format de licence transportable.
//
// Format texte canonique :
//   HUMANIX-LICENSE-v1.<base64url(JSON_payload)>.<base64url(signature)>
//
// Avantages :
//   - lisible (commence par "HUMANIX-LICENSE-v1" → reconnaissance immediate)
//   - copy/pastable (1 seule ligne, pas de retours chariot)
//   - pas de PII en clair (le JSON est b64-encoded mais reste decodable)
//   - aligne sur la philosophie JWT (header implicite : Ed25519)

import type { License, LicensePayload } from "./types.js";

const PREFIX = "HUMANIX-LICENSE-v1";

/**
 * Serialise un payload + signature en string transportable.
 * NB : ne fait PAS la signature elle-meme (cf. sign.ts).
 */
export function encodeLicense(payload: LicensePayload, signatureB64: string): string {
  const payloadJson = canonicalJson(payload);
  const payloadB64 = base64UrlEncode(payloadJson);
  return `${PREFIX}.${payloadB64}.${signatureB64}`;
}

/**
 * Parse une string licence vers ses 3 parties.
 * Retourne null si le format est manifestement invalide (pas de signature
 * verifiee a ce stade, juste la structure).
 */
export function decodeLicense(licenseString: string): License | null {
  if (typeof licenseString !== "string") return null;
  const trimmed = licenseString.trim();
  if (!trimmed.startsWith(`${PREFIX}.`)) return null;

  // PREFIX a 3 segments separes par "." (HUMANIX-LICENSE-v1)
  // Donc avec payload + signature on attend 5 segments au total :
  // ["HUMANIX-LICENSE-v1", "...", "..."]
  // Mais split sur "." casse "v1". On reconstitue.
  // Solution simple : on retire le prefixe puis on split sur "." en 2.
  const rest = trimmed.slice(PREFIX.length + 1); // "<payload>.<signature>"
  const sepIdx = rest.indexOf(".");
  if (sepIdx === -1) return null;

  const payloadB64 = rest.slice(0, sepIdx);
  const signatureB64 = rest.slice(sepIdx + 1);
  if (!payloadB64 || !signatureB64) return null;

  let payloadJson: string;
  try {
    payloadJson = base64UrlDecode(payloadB64);
  } catch {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }
  if (!isLicensePayload(payload)) return null;

  return { ...payload, signature: signatureB64 };
}

/**
 * Reproduit le JSON exactement comme il a ete signe.
 * Important : la signature couvre une representation deterministe (clefs
 * triees alphabetiquement). encodeURI/decodeURI ou JSON.stringify natif
 * ne sont pas deterministes selon les versions Node.
 */
export function canonicalJson(payload: LicensePayload): string {
  // L'ordre des clefs est fige : alphabetique, sans espaces.
  const ordered: Record<string, unknown> = {};
  for (const k of Object.keys(payload).sort()) {
    ordered[k] = (payload as Record<string, unknown>)[k];
  }
  return JSON.stringify(ordered);
}

function base64UrlEncode(s: string): string {
  return Buffer.from(s, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf-8");
}

function isLicensePayload(v: unknown): v is LicensePayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.licenseId === "string" &&
    typeof o.issuedTo === "string" &&
    (o.domain === null || typeof o.domain === "string") &&
    typeof o.plan === "string" &&
    (o.maxSeats === null || typeof o.maxSeats === "number") &&
    Array.isArray(o.featuresOverride) &&
    o.featuresOverride.every((x) => typeof x === "string") &&
    typeof o.issuedAt === "string" &&
    typeof o.expiresAt === "string"
  );
}
