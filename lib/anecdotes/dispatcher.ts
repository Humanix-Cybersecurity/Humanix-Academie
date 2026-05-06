// SPDX-License-Identifier: AGPL-3.0-or-later
// Dispatcher de la newsletter "Cyber-Anecdote du Lundi".
//
// Logique :
//  1. Trouver la prochaine anecdote a envoyer :
//     - priorite : anecdote programmee pour aujourd'hui (scheduledFor = today)
//     - sinon : prochaine anecdote active jamais publiee, par incidentDate desc
//  2. Recuperer tous les abonnes actifs.
//  3. Envoyer en batch (Scaleway TEM rate-limit court, on temporise).
//  4. Mettre a jour anecdote.publishedAt + sentCount + sub.lastSentAt.
//
// Idempotence :
//  - Si publishedAt est deja set ET dans les 6 derniers jours, on refuse de re-envoyer
//    (evite les doublons en cas de double trigger cron).
//
// DEMO_MODE :
//  - Si DEMO_MODE=true ou pas de provider email configure : on simule (no-op).

import { db } from "@/lib/db";
import {
  renderAnecdoteEmailHTML,
  renderAnecdoteEmailText,
  buildSubject,
  AnecdoteEmailContext,
} from "./email-template";

export type DispatchResult = {
  ok: boolean;
  reason?: string;
  anecdoteSlug?: string;
  totalSubscribers: number;
  sent: number;
  simulated: number;
  errors: number;
  errorDetails?: { email: string; message: string }[];
};

const RATE_LIMIT_DELAY_MS = 120; // ~8 req/s, sous le quota Scaleway TEM

export async function dispatchWeeklyAnecdote(options?: {
  // Force le re-envoi (utile pour test admin)
  force?: boolean;
  // Specifier explicitement quelle anecdote envoyer (sinon auto-selection)
  anecdoteId?: string;
}): Promise<DispatchResult> {
  const { force = false, anecdoteId } = options ?? {};

  // 1. Selection de l'anecdote
  const anecdote = anecdoteId
    ? await db.weeklyAnecdote.findUnique({ where: { id: anecdoteId } })
    : await pickNextAnecdote();

  if (!anecdote) {
    return {
      ok: false,
      reason: "Aucune anecdote disponible à publier.",
      totalSubscribers: 0,
      sent: 0,
      simulated: 0,
      errors: 0,
    };
  }

  // 2. Garde-fou idempotence (sauf si force=true)
  if (!force && anecdote.publishedAt) {
    const sixDaysMs = 6 * 24 * 3600 * 1000;
    if (Date.now() - anecdote.publishedAt.getTime() < sixDaysMs) {
      return {
        ok: false,
        reason: `Anecdote déjà envoyée le ${anecdote.publishedAt.toISOString()}. Utilisez force=true pour passer outre.`,
        anecdoteSlug: anecdote.slug,
        totalSubscribers: 0,
        sent: 0,
        simulated: 0,
        errors: 0,
      };
    }
  }

  // 3. Recuperation des abonnes actifs
  const subs = await db.anecdoteSubscription.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      unsubscribeToken: true,
    },
  });

  const result: DispatchResult = {
    ok: true,
    anecdoteSlug: anecdote.slug,
    totalSubscribers: subs.length,
    sent: 0,
    simulated: 0,
    errors: 0,
    errorDetails: [],
  };

  if (subs.length === 0) {
    // Pas d'abonnes : on ne marque pas l'anecdote comme publiee
    return { ...result, ok: true, reason: "Aucun abonné actif." };
  }

  const { sendEmail, isEmailConfigured } = await import("@/lib/email");
  const isDemo = process.env.DEMO_MODE === "true" || !isEmailConfigured();
  const fromEmail = process.env.EMAIL_FROM ?? "hex@humanix-cybersecurity.fr";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // 4. Envoi batch sequentiel avec rate limit
  for (const sub of subs) {
    const ctx: AnecdoteEmailContext = {
      recipientName: null,
      unsubscribeUrl: `${appUrl}/api/anecdotes/unsubscribe/${sub.unsubscribeToken}`,
      webViewUrl: `${appUrl}/anecdotes/${anecdote.slug}`,
    };
    const subject = buildSubject(anecdote);
    const html = renderAnecdoteEmailHTML(anecdote, ctx);
    const text = renderAnecdoteEmailText(anecdote, ctx);

    try {
      if (isDemo) {
        result.simulated++;
      } else {
        const sendRes = await sendEmail({
          from: fromEmail,
          to: sub.email,
          subject,
          html,
          text,
          // Liste de desinscription one-click (Gmail/Outlook respectent ce header)
          headers: {
            "List-Unsubscribe": `<${ctx.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (sendRes.ok) {
          result.sent++;
        } else {
          result.errors++;
          result.errorDetails?.push({
            email: sub.email,
            message: sendRes.reason,
          });
        }
      }
      // Update sub stats
      await db.anecdoteSubscription.update({
        where: { id: sub.id },
        data: {
          emailsReceived: { increment: 1 },
          lastSentAt: new Date(),
        },
      });
      // Petit delai pour respecter le quota provider
      if (!isDemo) await sleep(RATE_LIMIT_DELAY_MS);
    } catch (e: any) {
      result.errors++;
      result.errorDetails?.push({
        email: sub.email,
        message: String(e?.message ?? e).slice(0, 200),
      });
    }
  }

  // 5. Marquer l'anecdote comme publiee
  await db.weeklyAnecdote.update({
    where: { id: anecdote.id },
    data: {
      publishedAt: new Date(),
      sentCount: { increment: result.sent + result.simulated },
    },
  });

  return result;
}

async function pickNextAnecdote() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Priorite 1 : anecdote planifiee pour aujourd'hui
  const scheduled = await db.weeklyAnecdote.findFirst({
    where: {
      isActive: true,
      publishedAt: null,
      scheduledFor: { gte: today, lt: tomorrow },
    },
    orderBy: { scheduledFor: "asc" },
  });
  if (scheduled) return scheduled;

  // Priorite 2 : prochaine anecdote active jamais publiee
  return db.weeklyAnecdote.findFirst({
    where: { isActive: true, publishedAt: null },
    orderBy: { incidentDate: "desc" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
