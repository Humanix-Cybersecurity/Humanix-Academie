// SPDX-License-Identifier: AGPL-3.0-or-later
// Facade d'envoi d'email - provider-agnostique.
//
// Pour l'instant un seul provider est implemente : Scaleway TEM (souverain
// francais). L'architecture en facade permet d'ajouter d'autres providers
// plus tard sans toucher au code metier (variable d'env EMAIL_PROVIDER).
//
// Usage :
//   import { sendEmail } from "@/lib/email";
//   await sendEmail({ to: "user@x.fr", subject: "Hi", html: "<p>...</p>" });
import { sendViaScalewayTem, isScalewayTemConfigured } from "./scaleway-tem";
import { isDevMode } from "@/lib/dev-mode";
import {
  oneClickUnsubscribeHeaders,
  transactionalUnsubscribeHeaders,
  type EmailListId,
} from "./unsubscribe";

/**
 * Spec d'unsubscribe pour un email sortant. Si fournie, sendEmail() injecte
 * automatiquement les headers RFC 2369 / 8058 appropries.
 *
 * - "transactional" : mailto only (pas de one-click, justifie pour les
 *   mails que l'user a explicitement demandes : magic link, password
 *   reset, payment receipts).
 * - "one-click" : URL HTTPS signee + List-Unsubscribe-Post. Conforme RFC 8058.
 *   Necessite un email destinataire identifiable (= mail individuel, pas
 *   broadcast a une liste anonymisee).
 */
export type EmailUnsubscribeSpec =
  | { kind: "transactional" }
  | { kind: "one-click"; email: string; list: Exclude<EmailListId, "anecdote"> };

export type SendEmailParams = {
  /** Adresse(s) destinataire */
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  /** Override l'expediteur defaut EMAIL_FROM */
  from?: string;
  /** Nom affiche de l'expediteur (defaut NEXT_PUBLIC_APP_NAME) */
  fromName?: string;
  /** Headers custom (overrides l'auto-injection unsubscribe si meme cle) */
  headers?: Record<string, string>;
  /**
   * Auto-injection des headers List-Unsubscribe / List-Unsubscribe-Post.
   *
   * IMPORTANT : ne PAS utiliser pour la newsletter Cyber-Anecdote. Cette
   * derniere a son propre flow base sur AnecdoteSubscription.unsubscribeToken
   * (token DB) et pose ses headers manuellement via lib/anecdotes/dispatcher.
   * Tout autre mail (magic link, futurs mails marketing/notif) DOIT passer
   * par cette option pour rester conforme aux specs Gmail/Outlook 2024+.
   */
  unsubscribe?: EmailUnsubscribeSpec;
};

export type SendEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; reason: string; details?: string };

/**
 * Renvoie true si au moins un provider email est configure et
 * fonctionnel cote env. False si DEMO_MODE ou DEV_MODE est actif (pas
 * d'envoi reel en demo / dev - cf. lib/dev-mode.ts).
 */
export function isEmailConfigured(): boolean {
  if (process.env.DEMO_MODE === "true") return false;
  if (isDevMode()) return false;
  return isScalewayTemConfigured();
}

/**
 * Envoie un email via le provider configure. Best-effort : retourne
 * un objet de resultat plutot qu'un throw, pour que le code metier
 * decide s'il continue ou non en cas d'echec d'envoi.
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (process.env.DEMO_MODE === "true") {
    return { ok: false, reason: "demo_mode" };
  }
  if (isDevMode()) {
    console.warn(
      `[email/dev-mode] envoi simule vers ${params.to} (subject="${params.subject}")`,
    );
    return { ok: false, reason: "dev_mode" };
  }

  // Auto-injection des headers List-Unsubscribe selon le mode demande.
  // Les headers explicites de params.headers gagnent en cas de conflit (le
  // caller peut overrider, ex: dispatcher Anecdote qui a son propre flow).
  let mergedHeaders = params.headers;
  if (params.unsubscribe) {
    let autoHeaders: Record<string, string>;
    if (params.unsubscribe.kind === "transactional") {
      autoHeaders = transactionalUnsubscribeHeaders();
    } else {
      // one-click : l'email destinataire est dans la spec
      autoHeaders = oneClickUnsubscribeHeaders(
        params.unsubscribe.email,
        params.unsubscribe.list,
      );
    }
    mergedHeaders = { ...autoHeaders, ...(params.headers ?? {}) };
  }

  // Demain on pourra brancher un autre provider via EMAIL_PROVIDER.
  // Pour l'instant on a uniquement Scaleway TEM.
  return sendViaScalewayTem({ ...params, headers: mergedHeaders });
}
