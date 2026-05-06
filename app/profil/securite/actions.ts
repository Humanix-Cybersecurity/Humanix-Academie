// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions self-service securite : mdp + 2FA
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  generateBackupCodes,
} from "@/lib/password";
import {
  generateTotpSecret,
  verifyTotpCode,
  buildOtpAuthUri,
} from "@/lib/totp";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createPasswordResetToken,
  consumePasswordResetToken,
  hashIp,
} from "@/lib/password-reset";
import { auditLog, AuditActions } from "@/lib/audit";
import { sendEmail, isEmailConfigured } from "@/lib/email";

const ISSUER = "Humanix Academie";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  return {
    userId: session.user!.id as string,
    email: session.user!.email as string,
    tenantId: (session.user!.tenantId as string) ?? null,
    role: (session.user!.role as string) ?? null,
  };
}

// ----------------------------------------------------
// 1. SET / CHANGE PASSWORD (par l'user lui-meme)
// ----------------------------------------------------
export async function setPassword(formData: FormData) {
  const { userId } = await requireAuth();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") ?? "");

  if (newPassword !== newPasswordConfirm) {
    return { ok: false, error: "Les deux mots de passe ne correspondent pas." };
  }
  const policy = validatePasswordPolicy(newPassword);
  if (!policy.ok) {
    return { ok: false, error: policy.reason ?? "Mot de passe trop faible." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Compte introuvable." };

  // Si l'user a deja un mdp, on exige l'ancien
  if (user.passwordHash) {
    if (!currentPassword) {
      return { ok: false, error: "Mot de passe actuel requis." };
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return { ok: false, error: "Mot de passe actuel incorrect." };
    }
  }

  const hash = hashPassword(newPassword);
  const ctx = await requireAuth();
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: hash,
      passwordUpdatedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
  await auditLog({
    action: AuditActions.USER_PASSWORD_CHANGED,
    actor: { userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "user", id: userId, label: ctx.email },
  });
  revalidatePath("/profil/securite");
  return { ok: true };
}

// ----------------------------------------------------
// 2. SETUP 2FA — etape 1 : generer un secret + URI QR
// ----------------------------------------------------
export async function startMfaEnrollment(): Promise<{
  ok: boolean;
  secret?: string;
  otpauthUri?: string;
  error?: string;
}> {
  const { userId, email } = await requireAuth();
  const secret = generateTotpSecret();
  // On stocke le secret en pending (mfaSecret set, mfaEnabled toujours false)
  await db.user.update({
    where: { id: userId },
    data: { mfaSecret: secret, mfaEnabled: false },
  });
  const uri = buildOtpAuthUri({
    secret,
    accountName: email,
    issuer: ISSUER,
  });
  return { ok: true, secret, otpauthUri: uri };
}

// ----------------------------------------------------
// 3. SETUP 2FA — etape 2 : verifier 1 code => activer + generer backup
// ----------------------------------------------------
export async function confirmMfaEnrollment(formData: FormData): Promise<{
  ok: boolean;
  backupCodes?: string[];
  error?: string;
}> {
  const { userId } = await requireAuth();
  const code = String(formData.get("code") ?? "").trim();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });
  if (!user?.mfaSecret) {
    return { ok: false, error: "Aucun enrôlement en cours." };
  }
  if (!verifyTotpCode(user.mfaSecret, code)) {
    return { ok: false, error: "Code invalide." };
  }
  const { plain, hashedJson } = generateBackupCodes(10);
  const ctx = await requireAuth();
  await db.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaEnabledAt: new Date(),
      mfaBackupCodesHash: hashedJson,
    },
  });
  await auditLog({
    action: AuditActions.USER_MFA_ENABLED,
    actor: { userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "user", id: userId, label: ctx.email },
    message: "Activation TOTP + 10 codes de secours generes",
  });
  revalidatePath("/profil/securite");
  return { ok: true, backupCodes: plain };
}

// ----------------------------------------------------
// 4. DESACTIVER 2FA — exige le mdp actuel pour eviter cession de session
// ----------------------------------------------------
export async function disableMfa(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { userId } = await requireAuth();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, mfaForced: true },
  });
  if (!user) return { ok: false, error: "Compte introuvable." };
  if (user.mfaForced) {
    return {
      ok: false,
      error:
        "La 2FA est imposée par votre administrateur et ne peut pas être désactivée.",
    };
  }
  if (user.passwordHash) {
    if (!verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: "Mot de passe incorrect." };
    }
  }
  await db.user.update({
    where: { id: userId },
    data: {
      mfaSecret: null,
      mfaEnabled: false,
      mfaEnabledAt: null,
      mfaBackupCodesHash: null,
    },
  });
  const ctxDis = await requireAuth();
  await auditLog({
    action: AuditActions.USER_MFA_DISABLED,
    actor: { userId, email: ctxDis.email, role: ctxDis.role },
    tenantId: ctxDis.tenantId,
    target: { type: "user", id: userId, label: ctxDis.email },
  });
  revalidatePath("/profil/securite");
  return { ok: true };
}

// ----------------------------------------------------
// 5. REGENERER LES CODES DE SECOURS
// ----------------------------------------------------
export async function regenerateBackupCodes(): Promise<{
  ok: boolean;
  backupCodes?: string[];
  error?: string;
}> {
  const { userId } = await requireAuth();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });
  if (!user?.mfaEnabled) {
    return { ok: false, error: "2FA non activée." };
  }
  const { plain, hashedJson } = generateBackupCodes(10);
  await db.user.update({
    where: { id: userId },
    data: { mfaBackupCodesHash: hashedJson },
  });
  return { ok: true, backupCodes: plain };
}

// ----------------------------------------------------
// 6. FORGOT PASSWORD — public, sans auth
// ----------------------------------------------------
export async function requestPasswordReset(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Email invalide." };
  }

  // Rate limit par email + IP
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
  const ua = h.get("user-agent");
  const rl1 = checkRateLimit(`pwreset:email:${email}`, 3, 15 * 60 * 1000);
  const rl2 = checkRateLimit(`pwreset:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!rl1.ok || !rl2.ok) {
    // On ne signale pas explicitement le rate limit pour eviter l'enumeration
    return { ok: true };
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, isActive: true, name: true },
  });

  // Anti-enumeration : on repond toujours "ok"
  if (user && user.isActive) {
    const { plain } = await createPasswordResetToken({
      userId: user.id,
      ipHash: hashIp(ip),
      userAgent: ua?.slice(0, 200) ?? null,
    });
    await auditLog({
      action: AuditActions.USER_PASSWORD_RESET_REQUESTED,
      actor: { userId: user.id, email },
      target: { type: "user", id: user.id, label: email },
      ip,
      userAgent: ua,
    });
    // Envoi de l'email via Scaleway TEM (mute en cas d'echec, toujours ok
    // pour eviter l'enumeration attaquant cote rate limit).
    try {
      if (isEmailConfigured()) {
        const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
        const url = `${baseUrl}/connexion/reset/${plain}`;
        await sendEmail({
          to: email,
          subject: "🔐 Réinitialisation de votre mot de passe Humanix",
          html: resetPasswordEmailHtml(url, user.name ?? null),
        });
      }
    } catch (e) {
      // Silently swallow : on ne veut pas exposer l'erreur a l'attaquant.
      console.error("password reset email failed", e);
    }
  }
  return { ok: true };
}

// ----------------------------------------------------
// 7. RESET PASSWORD — consomme le token recu par email
// ----------------------------------------------------
export async function resetPasswordWithToken(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") ?? "");
  if (!token) return { ok: false, error: "Lien invalide." };
  if (newPassword !== newPasswordConfirm) {
    return { ok: false, error: "Les deux mots de passe ne correspondent pas." };
  }
  const policy = validatePasswordPolicy(newPassword);
  if (!policy.ok) {
    return { ok: false, error: policy.reason ?? "Mot de passe trop faible." };
  }
  const consumed = await consumePasswordResetToken(token);
  if (!consumed) {
    return { ok: false, error: "Lien expiré ou déjà utilisé." };
  }
  const hash = hashPassword(newPassword);
  const updated = await db.user.update({
    where: { id: consumed.userId },
    data: {
      passwordHash: hash,
      passwordUpdatedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    select: { email: true, tenantId: true },
  });
  await auditLog({
    action: AuditActions.USER_PASSWORD_RESET_USED,
    actor: { userId: consumed.userId, email: updated.email },
    tenantId: updated.tenantId,
    target: { type: "user", id: consumed.userId, label: updated.email },
    message: "Reset effectue via email + token",
  });
  return { ok: true };
}

function resetPasswordEmailHtml(url: string, name: string | null): string {
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,";
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #EAF3F8; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
    <div style="font-size: 40px; text-align: center;">🔐</div>
    <h1 style="color: #0B3D91; margin: 16px 0 8px; text-align: center;">Réinitialisation de mot de passe</h1>
    <p style="color: #555; line-height: 1.6;">${greeting}</p>
    <p style="color: #555; line-height: 1.6;">Une demande de réinitialisation de votre mot de passe Humanix Académie a été reçue. Si ce n'est pas vous, ignorez cet email.</p>
    <div style="text-align: center;">
      <a href="${url}" style="display: inline-block; margin: 24px 0; background: #00A3A1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold;">Définir un nouveau mot de passe →</a>
    </div>
    <p style="color: #999; font-size: 13px;">Ce lien expire dans 1 heure. Pour des raisons de sécurité, il ne peut être utilisé qu'une seule fois.</p>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">Humanix Académie · Si vous n'avez pas fait cette demande, vous pouvez ignorer cet email.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
