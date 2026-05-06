// SPDX-License-Identifier: AGPL-3.0-or-later
// Email de bienvenue envoye apres signup ou apres souscription. Contient
// les 3 prochaines etapes pour que le tenant ne reste pas inactif
// (premier signe de churn dans le SaaS).
//
// Provider d'envoi : facade lib/email (Scaleway TEM par defaut, souverain FR).
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export type WelcomeEmailContext = {
  toEmail: string;
  toName?: string | null;
  tenantName: string;
  plan: string;
  appUrl: string;
};

export async function sendWelcomeEmail(
  ctx: WelcomeEmailContext,
): Promise<{ ok: boolean; reason?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, reason: "email_provider_not_configured" };
  }
  const res = await sendEmail({
    to: ctx.toEmail,
    subject: `🦊 Bienvenue dans ${ctx.tenantName} sur Humanix Académie`,
    html: buildHtml(ctx),
  });
  if (!res.ok) {
    console.error("welcome email failed", res);
    return { ok: false, reason: res.reason };
  }
  return { ok: true };
}

function buildHtml(ctx: WelcomeEmailContext): string {
  const adminUrl = `${ctx.appUrl}/admin`;
  const greeting = ctx.toName ? `Bonjour ${escapeHtml(ctx.toName)},` : "Bonjour,";
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #EAF3F8; padding: 40px 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
    <div style="font-size: 56px; text-align: center; line-height: 1;">🦊</div>
    <h1 style="color: #0B3D91; margin: 16px 0 8px; text-align: center;">Bienvenue !</h1>
    <p style="color: #555; line-height: 1.6;">${greeting}</p>
    <p style="color: #555; line-height: 1.6;">Votre espace <strong>${escapeHtml(ctx.tenantName)}</strong> est prêt sur Humanix Académie (plan <strong>${escapeHtml(ctx.plan)}</strong>). Hex et toute l'équipe sont contents de vous voir arriver.</p>

    <h2 style="color: #0B3D91; font-size: 18px; margin: 32px 0 12px;">Vos 3 prochaines étapes</h2>
    <ol style="color: #555; line-height: 1.7; padding-left: 20px;">
      <li><strong>Inviter votre équipe</strong> - depuis <code>/admin/utilisateurs</code> (1 par 1 ou import CSV en masse).</li>
      <li><strong>Choisir vos saisons obligatoires</strong> - depuis <code>/admin/modules</code> (Phishing est cochée par défaut).</li>
      <li><strong>Activer la 2FA admin</strong> - depuis <code>/profil/securite</code> (recommandé pour la sécurité de votre tenant).</li>
    </ol>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${adminUrl}" style="display: inline-block; background: #00A3A1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold;">Aller à mon admin →</a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
    <p style="color: #999; font-size: 13px; line-height: 1.5;">Une question ? Répondez à cet email, on vous répond rapidement.</p>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">Humanix Académie · cybersécurité humaine, souveraine, française.</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Verifie qu'on n'a pas deja envoye un welcome email a ce user (idempotence).
 * Si le NotificationLog n'existe pas, retourne false (= envoyable).
 */
export async function hasReceivedWelcome(userId: string): Promise<boolean> {
  const existing = await db.notificationLog.findFirst({
    where: { userId, type: "WELCOME" },
    select: { id: true },
  });
  return !!existing;
}

export async function logWelcomeSent(
  tenantId: string,
  userId: string,
  status: string,
): Promise<void> {
  await db.notificationLog.create({
    data: {
      tenantId,
      userId,
      type: "WELCOME",
      channel: "email",
      status,
    },
  });
}
