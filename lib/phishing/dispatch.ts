// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Envoi d'UN mail de phishing simulé, pour les trois traitements qui en
// envoient : le lancement depuis l'interface (lib/phishing/launch.ts), le
// cron phishing-launch et le cron phishing-drip.
//
// POURQUOI UN SEUL POINT DE PASSAGE
//
//   Ces trois traitements peuvent se retrouver sur les mêmes lignes : un
//   lancement encore en cours quand le cron passe, un cron rappelé par son
//   propre lanceur (curl --retry) alors que le premier appel tourne
//   toujours, un lancement coupé par une livraison puis repris. Chacun
//   envoyait de son côté sans savoir ce que faisaient les autres, et la
//   même personne pouvait recevoir le message deux fois.
//
// LA RÈGLE
//
//   1. Réserver : un UPDATE conditionnel pose mailAttemptedAt, et seulement
//      si le mail n'est ni déjà parti ni réservé depuis moins de dix
//      minutes. De deux appels concurrents, PostgreSQL n'en laisse passer
//      qu'un ; l'autre obtient zéro ligne et s'abstient.
//   2. Envoyer.
//   3. Noter l'envoi (mailDispatchedAt), APRÈS l'acceptation du message par
//      le serveur SMTP.
//
//   Un processus coupé entre 1 et 3 laisse une réservation qui expire toute
//   seule : le mail est repris au passage suivant, personne n'est oublié.
//   Le seul doublon possible est celui de la personne dont le message
//   venait d'être accepté quand la coupure est tombée (entre 2 et 3). Noter
//   AVANT d'envoyer supprimerait ce doublon, mais perdrait le message à
//   chaque coupure : on préfère un message en trop à un message jamais
//   reçu.
//
//   Un envoi refusé garde sa réservation jusqu'à son expiration. Elle
//   témoigne qu'un traitement travaillait sur la campagne, même quand aucun
//   envoi n'aboutit : c'est ce que regarde le cron phishing-launch pour ne
//   pas reprendre un lancement qui tourne encore.

import { db } from "@/lib/db";
import { injectTrackingPixel } from "@/lib/phishing";
import {
  renderEmailHtml,
  type ResolvedEmailTemplate,
} from "@/lib/phishing/email-template";
import { sendMailViaTenantSmtp, type SmtpSendError } from "@/lib/smtp/sender";

/**
 * Durée de validité d'une réservation.
 *
 * Très au-dessus de ce que peut durer une tentative (le transport SMTP
 * abandonne après 15 s sans connexion, 10 s sans salutation, 30 s
 * d'inactivité), donc une réservation plus vieille appartient à un
 * processus mort. Très en dessous de l'heure qui sépare deux passages des
 * crons, donc elle est toujours libérée au passage suivant.
 */
export const ATTEMPT_LEASE_MS = 10 * 60 * 1000;

/** Une tentative commencée avant cet instant ne réserve plus rien. */
export function attemptLeaseCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - ATTEMPT_LEASE_MS);
}

export type DispatchInput = {
  resultId: string;
  trackToken: string;
  tenantId: string;
  template: Pick<ResolvedEmailTemplate, "emailSubject" | "emailHtmlTemplate">;
  recipient: { email: string; name: string | null };
};

export type DispatchOutcome =
  | { status: "sent" }
  /** Pas à nous de l'envoyer : déjà parti, ou réservé par un autre traitement. */
  | { status: "taken" }
  | { status: "failed"; reason: SmtpSendError; details?: string };

export async function dispatchLure(
  input: DispatchInput,
): Promise<DispatchOutcome> {
  const startedAt = new Date();
  const claim = await db.phishingResult.updateMany({
    where: {
      id: input.resultId,
      mailDispatchedAt: null,
      OR: [
        { mailAttemptedAt: null },
        { mailAttemptedAt: { lt: attemptLeaseCutoff(startedAt) } },
      ],
    },
    data: { mailAttemptedAt: startedAt },
  });
  if (claim.count === 0) return { status: "taken" };

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-academie.fr"
  ).replace(/\/$/, "");
  const firstName = (input.recipient.name?.split(" ")[0] ?? "").trim();
  const trackingUrl = `${baseUrl}/phishing/${input.trackToken}`;
  // Pixel de suivi des ouvertures, ajouté en fin de message : voir
  // injectTrackingPixel() dans lib/phishing.ts.
  const pixelUrl = `${baseUrl}/api/phishing/track/open/${input.trackToken}`;
  const html = injectTrackingPixel(
    renderEmailHtml(input.template, firstName, trackingUrl),
    pixelUrl,
  );

  const sendResult = await sendMailViaTenantSmtp(input.tenantId, {
    to: input.recipient.email,
    subject: input.template.emailSubject,
    html,
  });
  if (!sendResult.ok) {
    return {
      status: "failed",
      reason: sendResult.reason,
      details: sendResult.details,
    };
  }

  await db.phishingResult.update({
    where: { id: input.resultId },
    data: { mailDispatchedAt: new Date() },
  });
  return { status: "sent" };
}
