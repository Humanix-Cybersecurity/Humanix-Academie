// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Envoi d'un email d'invitation a un user nouvellement cree par un admin.
//
// PROBLEME RESOLU : avant ce module, inviteUser() dans app/admin/actions.ts
// creait juste le User en BDD (cas 1 : email inconnu) sans envoyer aucun
// email. L'invitee ne savait pas qu'elle avait un compte et ne pouvait
// jamais se connecter. Decouvert 2026-05-22 quand Florian a invite sa femme.
//
// COMMENT : on cree un VerificationToken compatible NextAuth nodemailer
// provider (meme hash sha256(token+secret)), on construit l'URL magic link
// qui pointe sur le callback NextAuth, on envoie l'email via notre facade
// lib/email (Scaleway TEM). Quand l'invitee clique, NextAuth verifie le
// token et la connecte automatiquement.
//
// SECURITE : on ne touche PAS a la session de l'admin qui declenche
// l'invitation. signIn() cote server modifierait les cookies de la response
// courante, ce qui logguerait l'admin en tant que l'invitee. Notre approche
// pre-cree le token + envoie l'email sans interaction avec le cookie store.

import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  getTenantBranding,
  DEFAULT_BRANDING,
} from "@/lib/branding/tenant-branding";

const TOKEN_TTL_HOURS = 72; // 3 jours pour qu'elle ait le temps de cliquer

/**
 * Hash compatible NextAuth nodemailer provider (v5 / Auth.js).
 * Le secret AUTH_SECRET est obligatoire pour que NextAuth puisse verifier
 * le token au callback. On reproduit exactement leur algorithme :
 *
 *   crypto.createHash("sha256").update(`${token}${secret}`).digest("hex")
 */
function hashToken(token: string, secret: string): string {
  return createHash("sha256").update(`${token}${secret}`).digest("hex");
}

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error(
      "AUTH_SECRET non defini - impossible de hasher le token magic link",
    );
  }
  return s;
}

export type InviteEmailContext = {
  /** Email de l'invite (sera normalise en lowercase). */
  email: string;
  /** Prenom/nom optionnel de l'invite. */
  recipientName?: string | null;
  /** Nom affiche de l'inviteur ("Florian" ou "florian@humanix.fr"). */
  inviterName: string;
  /** Nom du tenant ("Mon entreprise"). */
  tenantName: string;
  /** Base URL (https://academie.tonentreprise.fr - sans trailing slash). */
  baseUrl: string;
  /** Tenant invitant : sert à résoudre le branding marque blanche de l'email. */
  tenantId?: string;
};

/**
 * Cree un VerificationToken NextAuth + envoie l'email d'invitation.
 *
 * Returns { ok: true } meme si l'envoi a echoue silencieusement
 * (logging interne) - on ne veut PAS bloquer la creation du User cote
 * admin si Scaleway TEM est down.
 */
export async function sendInviteMagicLink(
  ctx: InviteEmailContext,
): Promise<{ ok: boolean; reason?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, reason: "email_provider_not_configured" };
  }

  const email = ctx.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, reason: "invalid_email" };
  }

  // 1. Generer un token aleatoire (raw envoye au client, hashe en BDD)
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken, getSecret());
  const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);

  // 2. Inserer en BDD au format NextAuth attendu
  await db.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires,
    },
  });

  // 3. Construire l'URL magic link compatible NextAuth callback
  const baseUrl = ctx.baseUrl.replace(/\/$/, "");
  const callbackUrl = `${baseUrl}/post-login`;
  const url = `${baseUrl}/api/auth/callback/nodemailer?callbackUrl=${encodeURIComponent(callbackUrl)}&token=${rawToken}&email=${encodeURIComponent(email)}`;

  // 4. Brand marque blanche (cascade revendeur) si tenant fourni, sinon Humanix.
  const brand = ctx.tenantId
    ? await getTenantBranding(ctx.tenantId)
    : DEFAULT_BRANDING;

  // 5. Envoyer l'email
  const res = await sendEmail({
    to: email,
    fromName: brand.emailFromName,
    subject: `🦊 ${ctx.inviterName} t'invite a rejoindre ${ctx.tenantName} sur ${brand.brandName}`,
    html: buildInviteHtml({ ...ctx, email, url, expires, brand }),
    unsubscribe: { kind: "transactional" },
  });

  if (!res.ok) {
    console.error(
      "[invite-email] send failed",
      "reason" in res ? res.reason : "unknown",
    );
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInviteHtml(params: {
  recipientName?: string | null;
  inviterName: string;
  tenantName: string;
  email: string;
  url: string;
  expires: Date;
  brand: {
    brandName: string;
    primaryColor: string;
    accentColor: string;
    hidePoweredBy: boolean;
  };
}): string {
  const greeting = params.recipientName
    ? `Bonjour ${escapeHtml(params.recipientName)},`
    : "Bonjour,";
  const expiresStr = params.expires.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1A1A;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">

<tr><td style="padding:32px 32px 16px">
<p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${params.brand.accentColor};font-weight:bold">Invitation ${escapeHtml(params.brand.brandName)}</p>
<h1 style="margin:8px 0 0;color:${params.brand.primaryColor};font-size:24px;line-height:1.3">Tu es invite·e a rejoindre<br/>${escapeHtml(params.tenantName)}</h1>
</td></tr>

<tr><td style="padding:0 32px 16px">
<p style="margin:0 0 16px;color:#333;font-size:15px">${greeting}</p>
<p style="margin:0 0 16px;color:#333;font-size:15px">
<strong>${escapeHtml(params.inviterName)}</strong> t'a invite·e a rejoindre l'espace
<strong>${escapeHtml(params.tenantName)}</strong> sur ${escapeHtml(params.brand.brandName)}, la plateforme
de sensibilisation a la cybersecurite.
</p>
<p style="margin:0 0 24px;color:#333;font-size:15px">
Pour activer ton compte et commencer ta formation, clique simplement sur le
bouton ci-dessous. Aucun mot de passe a creer - c'est un lien magique
securise qui te connecte directement.
</p>
</td></tr>

<tr><td style="padding:0 32px 24px" align="center">
<a href="${params.url}" style="display:inline-block;padding:14px 32px;background:${params.brand.primaryColor};color:#FFF;text-decoration:none;border-radius:12px;font-weight:bold;font-size:15px">Activer mon compte →</a>
</td></tr>

<tr><td style="padding:0 32px 24px">
<p style="margin:0 0 12px;color:#666;font-size:13px">
Ce lien expire le <strong>${expiresStr}</strong>. Si tu ne fais rien, ton
compte restera en attente d'activation - ton ${escapeHtml(params.inviterName.toLowerCase().includes("admin") ? "administrateur" : "inviteur·euse")} peut te renvoyer une invitation a tout moment.
</p>
<p style="margin:0;color:#666;font-size:13px">
Si tu n'es pas a l'origine de cette invitation ou que tu ne souhaites pas
rejoindre cet espace, ignore simplement ce mail. Ton adresse <strong>${escapeHtml(params.email)}</strong>
ne sera pas utilisee.
</p>
</td></tr>

<tr><td style="padding:16px 32px;background:#F8F9FA;border-top:1px solid #E5E7EB">
<p style="margin:0;color:#888;font-size:11px">
${
  params.brand.hidePoweredBy
    ? escapeHtml(params.brand.brandName)
    : `Humanix Cybersecurity SASU · Toulouse, France · contact@humanix-cybersecurity.fr<br/>Plateforme française de cybersensibilisation · AGPLv3 · Donnees hebergees en France`
}
</p>
</td></tr>

</table></td></tr></table>
</body></html>`;
}
