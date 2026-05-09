// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Check d'opt-out avant envoi email. A utiliser AVANT chaque sendEmail()
// pour les mails opt-in (newsletter, notifs admin, marketing). Le mail
// transactionnel (magic link, password reset) est exempte de ce check
// (legalement et techniquement requis pour la fonction).

import { db } from "@/lib/db";
import type { EmailListId } from "./unsubscribe";

/**
 * True si l'email s'est desinscrit de la liste donnee.
 *
 * Anecdote : passe par AnecdoteSubscription.isActive (table dediee).
 * Autres listes : passe par EmailOptOut.
 *
 * Usage :
 *   if (await isEmailOptedOut(user.email, "marketing")) {
 *     // skip envoi
 *     return;
 *   }
 *   await sendEmail({ ... });
 */
export async function isEmailOptedOut(
  email: string,
  list: EmailListId,
): Promise<boolean> {
  const e = email.trim().toLowerCase();

  if (list === "anecdote") {
    // Source de verite : AnecdoteSubscription.isActive=false signifie unsubscribed
    const sub = await db.anecdoteSubscription.findUnique({
      where: { email: e },
      select: { isActive: true },
    });
    if (!sub) return false; // pas inscrit = pas concerne (on ne lui enverra rien de toute facon)
    return !sub.isActive;
  }

  if (list === "transactional") {
    // Transactionnel : on n'opt-out PAS via la base. Le seul moyen est un
    // signalement manuel par mailto. On ne bloque jamais l'envoi automatique.
    return false;
  }

  // marketing / admin-alerts : on regarde EmailOptOut
  const optOut = await db.emailOptOut.findUnique({
    where: { email_list: { email: e, list } },
    select: { id: true },
  });
  return !!optOut;
}

/**
 * Marque un email comme opt-out d'une liste donnee (idempotent).
 * Pour anecdote, on bascule AnecdoteSubscription.isActive=false a la place
 * (la double source de verite n'est pas souhaitee).
 */
export async function markEmailOptedOut(
  email: string,
  list: EmailListId,
  options: {
    source?: "one-click" | "manual" | "preferences" | "support";
    ipHash?: string;
  } = {},
): Promise<void> {
  const e = email.trim().toLowerCase();
  const source = options.source ?? "one-click";

  if (list === "anecdote") {
    // Delegue au flow Anecdote existant (AnecdoteSubscription.isActive)
    await db.anecdoteSubscription.updateMany({
      where: { email: e, isActive: true },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
    return;
  }

  // upsert : si la row existe deja, no-op (idempotent)
  await db.emailOptOut.upsert({
    where: { email_list: { email: e, list } },
    create: { email: e, list, source, ipHash: options.ipHash ?? null },
    update: {}, // pas de modif si deja opt-out
  });
}
