// Helpers crypto SERVER-ONLY (utilisent node:crypto)
// Ne JAMAIS importer ce fichier depuis un composant client.
// L'import node:crypto fait deja echouer le bundle client.
import { randomBytes, createHash } from "node:crypto";

export function generateTrackingToken(): string {
  return "phx_" + randomBytes(16).toString("hex");
}

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export function generateApiKey(): { plain: string; prefix: string; hashed: string } {
  const random = randomBytes(24).toString("base64url");
  const plain = `hxa_${random}`;
  return {
    plain,
    prefix: plain.slice(0, 12),
    hashed: hashApiKey(plain),
  };
}
