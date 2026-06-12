// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Email de demande de rattachement RGPD-safe.
//
// Envoye quand un admin essaie d'inviter une adresse qui existe deja
// dans un AUTRE tenant. L'admin ne sait pas si l'email existe, mais
// si oui, son proprietaire recoit ce mail et peut accepter / refuser
// le rattachement a l'espace de l'admin.
//
// Conception :
//  - Le texte explicite que le destinataire a un compte Humanix actif
//    (on ne lui apprend rien : il sait deja qu'il est inscrit)
//  - Le bouton « Accepter » mene a une page de confirmation explicite
//  - Le lien « Refuser » est aussi visible (consentement explicite)
//  - Le mail mentionne ses droits RGPD : son refus ne change rien a
//    son compte existant.

export type TransferRequestEmailContext = {
  requestedByUserName: string;
  requestedByTenantName: string;
  personalMessage: string | null;
  acceptUrl: string;
  rejectUrl: string;
  expiresAt: Date;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function renderTransferRequestHTML(
  ctx: TransferRequestEmailContext,
): string {
  const personal =
    ctx.personalMessage && ctx.personalMessage.trim().length > 0
      ? `<blockquote style="margin:24px 0;padding:16px 20px;border-left:3px solid #0B3D91;background:#F8F9FA;font-style:italic;color:#333">${escapeHtml(ctx.personalMessage)}</blockquote>`
      : "";

  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1A1A;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">
<tr><td style="padding:24px 24px 0">
<p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#00A3A1;font-weight:bold">Demande de rattachement</p>
<h1 style="margin:8px 0 16px;color:#0B3D91;font-size:22px">Rejoindre un espace Humanix Académie</h1>
</td></tr>
<tr><td style="padding:0 24px;font-size:15px">
<p>Bonjour,</p>
<p><strong>${escapeHtml(ctx.requestedByUserName)}</strong>, administrateur de l'espace <strong>${escapeHtml(ctx.requestedByTenantName)}</strong>, souhaite que votre compte Humanix Académie soit rattaché à cet espace.</p>
${personal}
<p>Concrètement :</p>
<ul>
<li>Votre compte actuel ne sera pas dupliqué - votre email et votre mot de passe restent les mêmes.</li>
<li>Vos progrès, certificats et badges sont conservés.</li>
<li>Vous accéderez désormais aux saisons et règles définies par <strong>${escapeHtml(ctx.requestedByTenantName)}</strong>.</li>
<li>Vous pouvez accepter <em>ou</em> refuser sans aucune conséquence sur votre compte actuel.</li>
</ul>
<p style="text-align:center;margin:32px 0">
<a href="${ctx.acceptUrl}" style="background:#0B3D91;color:#FFF;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:12px;display:inline-block">Accepter le rattachement</a>
</p>
<p style="text-align:center;margin:8px 0 24px">
<a href="${ctx.rejectUrl}" style="color:#555;font-size:13px">Refuser cette demande</a>
</p>
<p style="font-size:13px;color:#555">Si vous ne reconnaissez pas <strong>${escapeHtml(ctx.requestedByUserName)}</strong> ou si cette demande vous semble suspecte, refusez-la simplement. Votre compte reste inchangé.</p>
<p style="font-size:13px;color:#888">Cette demande expire le <strong>${fmtDate(ctx.expiresAt)}</strong>. Au-delà, il faudra une nouvelle demande.</p>
</td></tr>
<tr><td style="padding:24px;font-size:12px;color:#888;border-top:1px solid #EEE">
Cet email vous est envoyé parce qu'une demande de rattachement a été faite par un administrateur. Conformément au RGPD, votre compte ne sera transféré qu'avec votre consentement explicite. Vous pouvez à tout moment exercer vos droits sur vos données via <a href="mailto:rgpd@humanix-cybersecurity.fr" style="color:#0B3D91">rgpd@humanix-cybersecurity.fr</a>.
<br><br>
Humanix-Cybersecurity · 30340 Salindres
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function renderTransferRequestText(
  ctx: TransferRequestEmailContext,
): string {
  const personal = ctx.personalMessage
    ? `\n\nMessage personnel :\n"${ctx.personalMessage}"\n`
    : "";
  return [
    "Bonjour,",
    "",
    `${ctx.requestedByUserName}, administrateur de l'espace ${ctx.requestedByTenantName}, souhaite que votre compte Humanix Académie soit rattaché à cet espace.`,
    personal,
    "Concrètement :",
    "- Votre compte actuel ne sera pas dupliqué (email + mot de passe inchangés).",
    "- Vos progrès, certificats et badges sont conservés.",
    `- Vous accéderez désormais aux saisons et règles de ${ctx.requestedByTenantName}.`,
    "- Vous pouvez accepter OU refuser sans conséquence sur votre compte actuel.",
    "",
    `Accepter :  ${ctx.acceptUrl}`,
    `Refuser  :  ${ctx.rejectUrl}`,
    "",
    `Demande valable jusqu'au ${fmtDate(ctx.expiresAt)}.`,
    "",
    "Si vous ne reconnaissez pas l'administrateur ou si cette demande vous semble suspecte, refusez-la simplement.",
    "",
    "Conformément au RGPD, votre compte ne sera transféré qu'avec votre consentement explicite.",
    "Humanix-Cybersecurity - rgpd@humanix-cybersecurity.fr",
  ].join("\n");
}

export function buildTransferRequestSubject(
  ctx: TransferRequestEmailContext,
): string {
  return `Rejoindre l'espace ${ctx.requestedByTenantName} sur Humanix Académie ?`;
}

/**
 * Envoi via la facade lib/email (Scaleway TEM ou mock en demo).
 */
export async function sendTransferRequestEmail(args: {
  to: string;
  ctx: TransferRequestEmailContext;
}): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  const { sendEmail, isEmailConfigured } = await import("@/lib/email");
  const isDemo = process.env.DEMO_MODE === "true" || !isEmailConfigured();
  const fromEmail = process.env.EMAIL_FROM ?? "hex@humanix-cybersecurity.fr";

  const subject = buildTransferRequestSubject(args.ctx);
  const html = renderTransferRequestHTML(args.ctx);
  const text = renderTransferRequestText(args.ctx);

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
