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
  /** Headers custom (ex: List-Unsubscribe one-click pour les newsletters) */
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; reason: string; details?: string };

/**
 * Renvoie true si au moins un provider email est configure et
 * fonctionnel cote env. False si DEMO_MODE est actif (pas d'envoi reel
 * en demo).
 */
export function isEmailConfigured(): boolean {
  if (process.env.DEMO_MODE === "true") return false;
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
  // Demain on pourra brancher un autre provider via EMAIL_PROVIDER.
  // Pour l'instant on a uniquement Scaleway TEM.
  return sendViaScalewayTem(params);
}
