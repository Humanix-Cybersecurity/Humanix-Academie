// SPDX-License-Identifier: AGPL-3.0-or-later
// Templates email pour l'invitation famille.
// Inspire de lib/anecdotes/email-template : meme style minimal, RGPD-friendly.

export type FamilyInviteEmailContext = {
  sponsorUserName: string;
  sponsorTenantName: string;
  inviteeFirstName: string | null;
  personalMessage: string | null;
  redeemUrl: string;
};

export function renderFamilyInviteHTML(ctx: FamilyInviteEmailContext): string {
  const greeting = ctx.inviteeFirstName
    ? `Bonjour ${escapeHtml(ctx.inviteeFirstName)},`
    : "Bonjour,";
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
<p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#00A3A1;font-weight:bold">Invitation Cyber Famille</p>
<h1 style="margin:8px 0 16px;color:#0B3D91;font-size:22px">Un cadeau cyber pour vous</h1>
</td></tr>
<tr><td style="padding:0 24px;font-size:15px">
<p>${greeting}</p>
<p><strong>${escapeHtml(ctx.sponsorUserName || "Un proche")}</strong>, qui suit le programme de sensibilisation cyber chez <strong>${escapeHtml(ctx.sponsorTenantName)}</strong>, a souhaité partager avec vous l'accès à des articles cyber adaptés au grand public.</p>
${personal}
<p>Le programme « Cyber Famille » de Humanix Académie regroupe des contenus simples, sans jargon, pour aider votre famille à se protéger en ligne : faux mails, mots de passe, fraude téléphonique, sécurité des enfants...</p>
<p style="text-align:center;margin:32px 0">
<a href="${ctx.redeemUrl}" style="background:#0B3D91;color:#FFF;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:12px;display:inline-block">Accéder à mes articles offerts</a>
</p>
<p style="font-size:13px;color:#555">C'est <strong>gratuit</strong>, <strong>sans inscription</strong>, et il n'y a <strong>aucune publicité</strong>. Aucune donnée personnelle n'est collectée.</p>
</td></tr>
<tr><td style="padding:24px;font-size:12px;color:#888;border-top:1px solid #EEE">
Vous recevez ce mail car ${escapeHtml(ctx.sponsorUserName || "un proche")} vous a invité personnellement. Si vous ne souhaitez pas y donner suite, ignorez simplement ce message — l'invitation expirera automatiquement.
<br><br>
Humanix-Cybersecurity · 30340 Salindres · <a href="mailto:rgpd@humanix-cybersecurity.fr" style="color:#0B3D91">rgpd@humanix-cybersecurity.fr</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function renderFamilyInviteText(ctx: FamilyInviteEmailContext): string {
  const greeting = ctx.inviteeFirstName
    ? `Bonjour ${ctx.inviteeFirstName},`
    : "Bonjour,";
  const personal = ctx.personalMessage
    ? `\n\nMessage personnel :\n"${ctx.personalMessage}"\n`
    : "";
  return [
    greeting,
    "",
    `${ctx.sponsorUserName || "Un proche"}, qui suit le programme de sensibilisation cyber chez ${ctx.sponsorTenantName}, a souhaité partager avec vous l'accès gratuit à des articles cyber grand public.`,
    personal,
    "Le programme « Cyber Famille » regroupe des contenus simples (faux mails, mots de passe, fraude, sécurité des enfants).",
    "",
    `Lien d'accès :  ${ctx.redeemUrl}`,
    "",
    "C'est gratuit, sans inscription, sans publicité.",
    "",
    "Vous recevez ce mail uniquement parce qu'un proche vous a invité personnellement. Pour ignorer, ne faites rien.",
    "",
    "Humanix-Cybersecurity — rgpd@humanix-cybersecurity.fr",
  ].join("\n");
}

export function buildFamilyInviteSubject(
  ctx: FamilyInviteEmailContext,
): string {
  return `${ctx.sponsorUserName || "Un proche"} vous offre l'accès à Cyber Famille — Humanix`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Envoi via la facade lib/email (Scaleway TEM par defaut, FR).
 */
export async function sendFamilyInviteEmail(args: {
  to: string;
  ctx: FamilyInviteEmailContext;
}): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  const { sendEmail, isEmailConfigured } = await import("@/lib/email");
  const isDemo = process.env.DEMO_MODE === "true" || !isEmailConfigured();
  const fromEmail = process.env.EMAIL_FROM ?? "hex@humanix-cybersecurity.fr";

  const subject = buildFamilyInviteSubject(args.ctx);
  const html = renderFamilyInviteHTML(args.ctx);
  const text = renderFamilyInviteText(args.ctx);

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
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 200) };
  }
}
