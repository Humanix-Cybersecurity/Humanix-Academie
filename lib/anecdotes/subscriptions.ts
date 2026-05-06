// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers d'inscription / desinscription a la newsletter Cyber-Anecdote du Lundi.
// Utilise par : formulaire public, auto-subscribe au login, endpoint /unsubscribe.

import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";

const CONSENT_TEXT_V1 =
  "Je m'abonne a la Cyber-Anecdote du Lundi de Humanix. 1 email/semaine, desinscription en 1 clic.";

export type SubscribeInput = {
  email: string;
  source?: string; // homepage / footer / audit-flash / tenant / manual
  tenantId?: string | null;
  ipHash?: string | null;
};

export async function subscribe(input: SubscribeInput) {
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false as const, error: "Email invalide." };
  }

  const existing = await db.anecdoteSubscription.findUnique({
    where: { email },
  });

  // Si deja abonne actif : on ne fait rien (mais on retourne ok pour ne pas leaker l'info)
  if (existing && existing.isActive) {
    return { ok: true as const, alreadySubscribed: true };
  }

  const consentTextHash = createHash("sha256")
    .update(CONSENT_TEXT_V1)
    .digest("hex");

  if (existing && !existing.isActive) {
    // Reactivation
    await db.anecdoteSubscription.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        unsubscribedAt: null,
        source: input.source ?? existing.source,
        consentTextHash,
        ipHash: input.ipHash ?? existing.ipHash,
      },
    });
    return { ok: true as const, reactivated: true };
  }

  await db.anecdoteSubscription.create({
    data: {
      email,
      source: input.source ?? "manual",
      tenantId: input.tenantId ?? null,
      unsubscribeToken: generateUnsubscribeToken(),
      consentTextHash,
      ipHash: input.ipHash ?? null,
    },
  });

  return { ok: true as const, created: true };
}

export async function unsubscribeByToken(
  token: string,
): Promise<{ ok: boolean; email?: string }> {
  const sub = await db.anecdoteSubscription.findUnique({
    where: { unsubscribeToken: token },
  });
  if (!sub) return { ok: false };
  if (!sub.isActive) return { ok: true, email: sub.email }; // deja desinscrit
  await db.anecdoteSubscription.update({
    where: { id: sub.id },
    data: { isActive: false, unsubscribedAt: new Date() },
  });
  return { ok: true, email: sub.email };
}

function generateUnsubscribeToken(): string {
  return "anu_" + randomBytes(20).toString("hex");
}

function isValidEmail(email: string): boolean {
  // Volontairement permissif (validation finale par Scaleway TEM)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}
