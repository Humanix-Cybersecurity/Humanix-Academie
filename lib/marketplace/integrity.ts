// Integrite : hash SHA-256 du payload normalise pour publication
// SERVER-ONLY (utilise node:crypto)
import { createHash } from "node:crypto";

/**
 * Calcule un hash deterministe du payload d'un module.
 * - Cles JSON triees (stable)
 * - Espaces normalises
 * - Sortie : hex SHA-256, 64 caracteres
 *
 * Usage : signer le module au moment de l'approbation pour figer son contenu.
 */
export function computeContentHash(payload: unknown): string {
  const canonical = canonicalJSON(payload);
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Serialise un objet JSON de maniere canonique (cles triees recursivement).
 * Indispensable pour que deux payloads "egaux" produisent le meme hash.
 */
function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJSON).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) => JSON.stringify(k) + ":" + canonicalJSON((value as any)[k]),
  );
  return "{" + parts.join(",") + "}";
}

/**
 * Format lisible du hash pour affichage : 8 premiers + 8 derniers
 */
export function shortHash(hash: string): string {
  if (hash.length < 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}
