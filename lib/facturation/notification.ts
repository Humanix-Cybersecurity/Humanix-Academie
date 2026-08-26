// SPDX-License-Identifier: AGPL-3.0-or-later
// Notification au client quand une facture est emise.
//
// LE MAIL NE PORTE PAS LA FACTURE, IL PORTE UN LIEN.
//
//   Deux raisons. La messagerie ne gere pas les pieces jointes -- ni la facade
//   lib/email, ni le connecteur Scaleway TEM. Et surtout : une piece comptable
//   qui circule en clair dans des boites mail est une copie de plus, sans
//   controle d'acces, indexee par le fournisseur. Le lien exige une session
//   ADMIN pour telecharger.
//
// ELLE NE LEVE JAMAIS.
//
//   Appelee juste apres l'emission, elle-meme declenchee par le webhook Mollie.
//   Un probleme d'envoi ne doit ni annuler la facture, ni faire rejouer le
//   webhook. Une facture emise sans mail reste consultable dans la console ;
//   un webhook en boucle de rejeu, lui, reprovisionne.

import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/subdomain-tenant";
import { formaterEuros } from "./montants";

export type ResultatNotification =
  | { etat: "envoyee"; destinataires: number }
  | { etat: "ignoree"; motif: string };

function echapper(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jour(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(d);
}

export async function notifierFactureEmise(params: {
  tenantId: string;
  factureId: string;
  numero: string;
  emiseLe: Date;
  totalTtcCentimes: number;
}): Promise<ResultatNotification> {
  try {
    if (!isEmailConfigured()) {
      return { etat: "ignoree", motif: "email_non_configure" };
    }

    // Seuls les ADMIN recoivent : la facturation leur est reservee, et le
    // lien serait refuse a un RSSI ou un apprenant (403 sur la route de
    // telechargement). Envoyer a quelqu'un qui ne peut pas ouvrir serait
    // pire que ne rien envoyer.
    const destinataires = await db.user.findMany({
      where: { tenantId: params.tenantId, role: "ADMIN", isActive: true },
      select: { email: true, name: true },
      take: 10,
    });
    const adresses = destinataires
      .map((u) => u.email)
      .filter(
        (e): e is string => Boolean(e) && !e.endsWith("@anonymized.local"),
      );
    if (adresses.length === 0) {
      return { etat: "ignoree", motif: "aucun_admin_actif" };
    }

    const tenant = await db.tenant.findUnique({
      where: { id: params.tenantId },
      select: { name: true },
    });

    const base = getAppBaseUrl();
    const lien = `${base}/admin/billing#factures`;
    const montant = formaterEuros(params.totalTtcCentimes);

    const res = await sendEmail({
      to: adresses,
      subject: `Votre facture ${params.numero} — ${montant}`,
      html: gabarit({
        numero: params.numero,
        date: jour(params.emiseLe),
        montant,
        tenantName: tenant?.name ?? "votre espace",
        lien,
      }),
      text: [
        `Votre facture ${params.numero} est disponible.`,
        ``,
        `Date    : ${jour(params.emiseLe)}`,
        `Montant : ${montant} TTC`,
        ``,
        `Elle se telecharge depuis votre console, au format PDF et au format`,
        `Factur-X (XML) pour votre plateforme de facturation :`,
        lien,
        ``,
        `Nous n'attachons pas la facture a ce message : elle reste derriere`,
        `votre acces administrateur.`,
      ].join("\n"),
      // Transactionnel : ce mail n'est pas de la prospection, on ne peut pas
      // s'en desinscrire -- mais les en-tetes attendus par Gmail et Outlook
      // doivent quand meme etre poses.
      unsubscribe: { kind: "transactional" },
    });

    if (!res.ok) {
      console.error("[facturation] notification non envoyee", res);
      return { etat: "ignoree", motif: res.reason };
    }
    return { etat: "envoyee", destinataires: adresses.length };
  } catch (e) {
    console.error("[facturation] notification en erreur", e);
    return {
      etat: "ignoree",
      motif: e instanceof Error ? e.message : "erreur_inconnue",
    };
  }
}

function gabarit(c: {
  numero: string;
  date: string;
  montant: string;
  tenantName: string;
  lien: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #EAF3F8; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
    <div style="font-size: 48px; text-align: center; line-height: 1;">🧾</div>
    <h1 style="color: #0B3D91; margin: 16px 0 8px; text-align: center; font-size: 22px;">Votre facture ${echapper(c.numero)}</h1>
    <p style="color: #555; line-height: 1.6;">Bonjour,</p>
    <p style="color: #555; line-height: 1.6;">La facture de votre abonnement <strong>${echapper(c.tenantName)}</strong> est disponible dans votre console.</p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr><td style="color: #999; padding: 6px 0; font-size: 14px;">Numéro</td><td style="text-align: right; padding: 6px 0; font-weight: bold; color: #0B3D91;">${echapper(c.numero)}</td></tr>
      <tr><td style="color: #999; padding: 6px 0; font-size: 14px;">Date</td><td style="text-align: right; padding: 6px 0;">${echapper(c.date)}</td></tr>
      <tr><td style="color: #999; padding: 6px 0; font-size: 14px;">Montant TTC</td><td style="text-align: right; padding: 6px 0; font-weight: bold; font-size: 18px; color: #0B3D91;">${echapper(c.montant)}</td></tr>
    </table>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${echapper(c.lien)}" style="display: inline-block; background: #00A3A1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold;">Télécharger ma facture →</a>
    </div>

    <p style="color: #555; line-height: 1.6; font-size: 14px;">Elle est disponible au format <strong>PDF</strong> et au format <strong>Factur-X</strong> (XML), exploitable par votre plateforme de facturation.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
    <p style="color: #999; font-size: 13px; line-height: 1.5;">Nous n'attachons pas la facture à ce message : elle reste derrière votre accès administrateur. Une question ? Répondez à cet email.</p>
  </div>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Relance : un paiement attend sa facture, mais les coordonnees manquent.
//
// POURQUOI CE SECOND MAIL EXISTE
//
//   notifierFactureEmise() part APRES l'emission. Or l'emission est refusee
//   tant que l'acheteur n'a pas de denomination ni d'adresse (article 242
//   nonies A) -- et cette adresse, on ne la devine pas. Sans ce mail, un
//   client encaisse reste sans facture et sans jamais savoir pourquoi : le
//   bandeau qui le lui dirait est sur une page qu'il n'a aucune raison
//   d'ouvrir.
//
//   Le mail ne demande donc pas de payer. Il demande les deux lignes qui
//   debloquent une facture deja due.

export async function notifierCoordonneesRequises(params: {
  tenantId: string;
  /** Nombre de paiements encaisses qui attendent d'etre factures. */
  paiementsEnAttente: number;
  /** Somme TTC de ces paiements, pour que le client reconnaisse de quoi on parle. */
  totalTtcCentimes: number;
}): Promise<ResultatNotification> {
  try {
    if (!isEmailConfigured()) {
      return { etat: "ignoree", motif: "email_non_configure" };
    }
    if (params.paiementsEnAttente <= 0) {
      // Rien a reclamer : envoyer serait une relance sans objet.
      return { etat: "ignoree", motif: "aucun_paiement_en_attente" };
    }

    // Memes destinataires que la notification de facture, et pour la meme
    // raison : le formulaire de coordonnees est derriere un acces ADMIN.
    const destinataires = await db.user.findMany({
      where: { tenantId: params.tenantId, role: "ADMIN", isActive: true },
      select: { email: true, name: true },
      take: 10,
    });
    const adresses = destinataires
      .map((u) => u.email)
      .filter(
        (e): e is string => Boolean(e) && !e.endsWith("@anonymized.local"),
      );
    if (adresses.length === 0) {
      return { etat: "ignoree", motif: "aucun_admin_actif" };
    }

    const tenant = await db.tenant.findUnique({
      where: { id: params.tenantId },
      select: { name: true },
    });

    const base = getAppBaseUrl();
    const lien = `${base}/admin/billing#factures`;
    const montant = formaterEuros(params.totalTtcCentimes);
    const pluriel = params.paiementsEnAttente > 1;

    const res = await sendEmail({
      to: adresses,
      subject: pluriel
        ? `Vos factures vous attendent, il manque vos coordonnées`
        : `Votre facture vous attend, il manque vos coordonnées`,
      html: gabaritCoordonnees({
        tenantName: tenant?.name ?? "votre espace",
        montant,
        pluriel,
        nombre: params.paiementsEnAttente,
        lien,
      }),
      text: [
        pluriel
          ? `${params.paiementsEnAttente} paiements que vous avez reglés attendent leur facture.`
          : `Le paiement que vous avez reglé attend sa facture.`,
        ``,
        `Montant concerné : ${montant} TTC`,
        ``,
        `Il nous manque votre dénomination et votre adresse de facturation.`,
        `Ce sont des mentions obligatoires : sans elles, la facture ne peut pas`,
        `être émise. Nous ne les devinons pas.`,
        ``,
        `Renseignez-les ici, la facture part dans la foulée :`,
        lien,
      ].join("\n"),
      unsubscribe: { kind: "transactional" },
    });

    if (!res.ok) {
      console.error("[facturation] relance coordonnees non envoyee", res);
      return { etat: "ignoree", motif: res.reason };
    }
    return { etat: "envoyee", destinataires: adresses.length };
  } catch (e) {
    console.error("[facturation] relance coordonnees en erreur", e);
    return {
      etat: "ignoree",
      motif: e instanceof Error ? e.message : "erreur_inconnue",
    };
  }
}

function gabaritCoordonnees(c: {
  tenantName: string;
  montant: string;
  pluriel: boolean;
  nombre: number;
  lien: string;
}): string {
  const quoi = c.pluriel
    ? `${c.nombre} paiements réglés attendent leur facture`
    : `Un paiement réglé attend sa facture`;
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #EAF3F8; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
    <div style="font-size: 48px; text-align: center; line-height: 1;">📄</div>
    <h1 style="color: #0B3D91; margin: 16px 0 8px; text-align: center; font-size: 22px;">${echapper(quoi)}</h1>
    <p style="color: #555; line-height: 1.6;">Bonjour,</p>
    <p style="color: #555; line-height: 1.6;">Pour <strong>${echapper(c.tenantName)}</strong>, il nous manque votre <strong>dénomination</strong> et votre <strong>adresse de facturation</strong>.</p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr><td style="color: #999; padding: 6px 0; font-size: 14px;">Montant concerné</td><td style="text-align: right; padding: 6px 0; font-weight: bold; font-size: 18px; color: #0B3D91;">${echapper(c.montant)}</td></tr>
    </table>

    <p style="color: #555; line-height: 1.6;">Ce sont des mentions obligatoires sur une facture. Sans elles, nous ne pouvons pas l&rsquo;émettre, et nous ne les devinons pas.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${echapper(c.lien)}" style="display: inline-block; background: #00A3A1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold;">Renseigner mes coordonnées →</a>
    </div>

    <p style="color: #555; line-height: 1.6; font-size: 14px;">Le formulaire prend une minute. La facture est émise dans la foulée, au format <strong>PDF</strong> et <strong>Factur-X</strong>.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
    <p style="color: #999; font-size: 13px; line-height: 1.5;">Vous avez déjà payé : ce message ne réclame aucun règlement. Une question ? Répondez à cet email.</p>
  </div>
</body></html>`;
}
