// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Email de demande d'acces en lecture (« Voir en tant que »).
//
// Envoye quand un admin demande a consulter le compte d'un utilisateur
// pour du debug / support. L'utilisateur doit consentir explicitement.
//
// Le ton est rassurant : on insiste sur LECTURE SEULE, la duree, la
// possibilite de refuser ou revoquer a tout moment.

export type ImpersonationEmailContext = {
  adminUserName: string;
  adminUserEmail: string;
  tenantName: string;
  reason: string;
  requestedDurationMinutes: number;
  acceptUrl: string;
  rejectUrl: string;
  consentExpiresAt: Date;
};

function fmtDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(mn: number): string {
  if (mn < 60) return `${mn} minutes`;
  if (mn < 1440) {
    const h = Math.floor(mn / 60);
    return h === 1 ? "1 heure" : `${h} heures`;
  }
  return "24 heures";
}

export function renderImpersonationHTML(
  ctx: ImpersonationEmailContext,
): string {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1A1A;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">
<tr><td style="padding:24px 24px 0">
<p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#00A3A1;font-weight:bold">Demande d'accès en lecture</p>
<h1 style="margin:8px 0 16px;color:#0B3D91;font-size:22px">${escapeHtml(ctx.adminUserName)} demande à voir votre compte</h1>
</td></tr>
<tr><td style="padding:0 24px;font-size:15px">
<p>Bonjour,</p>
<p><strong>${escapeHtml(ctx.adminUserName)}</strong> (${escapeHtml(ctx.adminUserEmail)}), administrateur de l'espace <strong>${escapeHtml(ctx.tenantName)}</strong>, demande votre autorisation pour consulter votre compte Humanix Académie en <strong>lecture seule</strong>.</p>

<div style="margin:20px 0;padding:14px 16px;background:#F8F9FA;border-left:3px solid #0B3D91;border-radius:6px">
<p style="margin:0;font-size:13px;color:#555;text-transform:uppercase;font-weight:bold;letter-spacing:0.5px">Raison invoquée</p>
<p style="margin:6px 0 0;color:#333">${escapeHtml(ctx.reason)}</p>
</div>

<p><strong>Concrètement, ce qu'il pourra voir :</strong></p>
<ul>
<li>Vos progrès sur les saisons et épisodes</li>
<li>Vos certificats et badges</li>
<li>Votre historique d'activité récent</li>
<li>Les paramètres généraux de votre profil</li>
</ul>

<p><strong>Ce qu'il NE pourra PAS faire :</strong></p>
<ul>
<li>Modifier ou supprimer vos données</li>
<li>Compléter ou répondre à des modules à votre place</li>
<li>Envoyer des messages ou des emails en votre nom</li>
<li>Voir vos messages privés ou conversations Hex</li>
</ul>

<p><strong>Durée demandée :</strong> ${fmtDuration(ctx.requestedDurationMinutes)} maximum à partir de votre acceptation. Vous pouvez révoquer l'accès à tout moment depuis vos paramètres.</p>

<p style="text-align:center;margin:32px 0 8px">
<a href="${ctx.acceptUrl}" style="background:#0B3D91;color:#FFF;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:12px;display:inline-block">Autoriser l'accès en lecture</a>
</p>
<p style="text-align:center;margin:8px 0 24px">
<a href="${ctx.rejectUrl}" style="color:#555;font-size:13px">Refuser cette demande</a>
</p>

<p style="font-size:13px;color:#555">Si vous ne reconnaissez pas <strong>${escapeHtml(ctx.adminUserName)}</strong> ou si cette demande vous semble suspecte, refusez-la simplement. Votre compte reste inchangé et l'administrateur sera notifié du refus.</p>

<p style="font-size:13px;color:#888">Cette demande de consentement expire le <strong>${fmtDateTime(ctx.consentExpiresAt)}</strong>. Au-delà, il faudra une nouvelle demande.</p>
</td></tr>
<tr><td style="padding:24px;font-size:12px;color:#888;border-top:1px solid #EEE">
Cet email vous est envoyé parce qu'un administrateur a explicitement demandé l'accès en lecture à votre compte. Conformément au RGPD, cet accès est conditionné à votre consentement explicite, limité dans le temps, et tracé dans le journal d'audit. Vous pouvez exercer vos droits sur vos données à tout moment via <a href="mailto:rgpd@humanix-cybersecurity.fr" style="color:#0B3D91">rgpd@humanix-cybersecurity.fr</a>.
<br><br>
Humanix-Cybersecurity · 30340 Salindres
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function renderImpersonationText(
  ctx: ImpersonationEmailContext,
): string {
  return [
    "Bonjour,",
    "",
    `${ctx.adminUserName} (${ctx.adminUserEmail}), administrateur de l'espace ${ctx.tenantName}, demande votre autorisation pour consulter votre compte Humanix Académie en LECTURE SEULE.`,
    "",
    "Raison invoquée :",
    `« ${ctx.reason} »`,
    "",
    "Ce qu'il pourra voir :",
    "- Vos progrès sur les saisons et épisodes",
    "- Vos certificats et badges",
    "- Votre historique d'activité récent",
    "- Les paramètres généraux de votre profil",
    "",
    "Ce qu'il NE pourra PAS faire :",
    "- Modifier ou supprimer vos données",
    "- Compléter des modules à votre place",
    "- Envoyer des messages en votre nom",
    "- Voir vos conversations privées avec Hex",
    "",
    `Durée demandée : ${fmtDuration(ctx.requestedDurationMinutes)} maximum.`,
    "",
    `Autoriser :  ${ctx.acceptUrl}`,
    `Refuser   :  ${ctx.rejectUrl}`,
    "",
    `Cette demande expire le ${fmtDateTime(ctx.consentExpiresAt)}.`,
    "",
    "Si la demande vous semble suspecte, refusez-la. Votre compte reste inchangé.",
    "",
    "Conformément au RGPD, cet accès est conditionné à votre consentement explicite et tracé en audit.",
    "Humanix-Cybersecurity - rgpd@humanix-cybersecurity.fr",
  ].join("\n");
}

export function buildImpersonationSubject(
  ctx: ImpersonationEmailContext,
): string {
  return `${ctx.adminUserName} demande à voir votre compte Humanix - votre accord est requis`;
}

export async function sendImpersonationRequestEmail(args: {
  to: string;
  ctx: ImpersonationEmailContext;
}): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  const { sendEmail, isEmailConfigured } = await import("@/lib/email");
  const isDemo = process.env.DEMO_MODE === "true" || !isEmailConfigured();
  const fromEmail = process.env.EMAIL_FROM ?? "hex@humanix-cybersecurity.fr";

  const subject = buildImpersonationSubject(args.ctx);
  const html = renderImpersonationHTML(args.ctx);
  const text = renderImpersonationText(args.ctx);

  if (isDemo) {
    return { ok: true, simulated: true };
  }

  try {
    const sendRes = await sendEmail({
      from: fromEmail,
      to: args.to,
      subject,
      html,
      text,
    });
    if (!sendRes.ok) {
      return { ok: false, error: sendRes.reason };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 200) };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
