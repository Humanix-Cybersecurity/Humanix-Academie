// SPDX-License-Identifier: AGPL-3.0-or-later
// Generation et verification des tokens de reinitialisation de mot de passe.
//
// Securite :
//  - Token = 32 octets base64url (192 bits d'entropie)
//  - On stocke uniquement sha256(token) en BDD
//  - Expiration 1h
//  - Usage unique (usedAt set apres consommation)
//  - Anti-enumeration : on repond toujours pareil que l'email existe ou non
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hashApiKey } from "@/lib/crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export function hashResetToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export async function createPasswordResetToken(params: {
  userId: string;
  ipHash?: string | null;
  userAgent?: string | null;
}): Promise<{ plain: string; expiresAt: Date }> {
  const plain = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(plain);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.passwordResetToken.create({
    data: {
      userId: params.userId,
      tokenHash,
      expiresAt,
      requestedIpHash: params.ipHash ?? null,
      requestedUa: params.userAgent ?? null,
    },
  });
  return { plain, expiresAt };
}

export async function consumePasswordResetToken(
  plainToken: string,
): Promise<{ userId: string } | null> {
  const tokenHash = hashResetToken(plainToken);
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  await db.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return { userId: row.userId };
}

/**
 * Hash IP RGPD-safe. Reuse du hashApiKey (sha256) pour un hash deterministe.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return hashApiKey(ip);
}
