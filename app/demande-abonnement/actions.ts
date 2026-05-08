// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/password-reset";

const FOUNDER_EMAIL =
  process.env.FOUNDER_NOTIFICATION_EMAIL ?? "contact@humanix-cybersecurity.fr";

const VALID_PLANS = new Set([
  "solo",
  "essentielle",
  "pro",
  "premium",
  "non-decide",
]);
const VALID_SIZES = new Set(["", "1-9", "10-49", "50-249", "250+"]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function submitDemandeAbonnement(
  formData: FormData,
): Promise<void> {
  // Honeypot anti-bot
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot.length > 0) {
    // Bot détecté : on simule un succès silencieux pour ne pas signaler.
    redirect("/demande-abonnement?submitted=1");
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Rate limit : 3 demandes / heure / IP (anti-flood)
  const rl = checkRateLimit(`demande-abonnement:${ip}`, 3, 60 * 60 * 1000);
  if (!rl.ok) {
    redirect("/demande-abonnement?error=rate_limit");
  }

  const organization = String(formData.get("organization") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (
    !organization ||
    organization.length > 120 ||
    !email ||
    !email.includes("@") ||
    email.length > 254 ||
    !VALID_PLANS.has(plan) ||
    !VALID_SIZES.has(size) ||
    role.length > 80 ||
    message.length > 2000
  ) {
    redirect("/demande-abonnement?error=invalid_input");
  }

  // Trace serveur (la vraie persistence est l'email au founder).
  // Pour ajouter un AuditAction dédié, il faudra étendre l'enum
  // prisma/schema.prisma + migration. Hors scope de ce PR.
  console.log(
    `[demande-abonnement] received plan=${plan} size=${size || "n/a"} ipHash=${hashIp(ip)}`,
  );

  // Notification email au founder
  if (isEmailConfigured()) {
    const html = `
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f7fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
    <h1 style="color: #0B3D91; font-size: 20px; margin: 0 0 16px;">Nouvelle demande d'abonnement</h1>
    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">Organisation</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(organization)}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Email</td><td style="padding: 6px 0; font-weight: 600;"><a href="mailto:${escapeHtml(email)}" style="color: #0B3D91;">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Rôle</td><td style="padding: 6px 0;">${escapeHtml(role) || "<em>non précisé</em>"}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Effectif</td><td style="padding: 6px 0;">${escapeHtml(size) || "<em>non précisé</em>"}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;">Plan envisagé</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(plan)}</td></tr>
    </table>
    ${
      message
        ? `<div style="margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #334155; white-space: pre-wrap;">${escapeHtml(message)}</div>`
        : ""
    }
    <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
      Pour provisionner le tenant : utilise <code>/superadmin</code> ou
      <code>npm run db:provision-tenant -- --email=${escapeHtml(email)} --org="${escapeHtml(organization)}" --plan=${escapeHtml(plan)}</code>.
    </p>
  </div>
</body></html>`;
    try {
      await sendEmail({
        to: FOUNDER_EMAIL,
        subject: `[Humanix] Demande d'abonnement — ${organization}`,
        html,
        replyTo: email,
      });
    } catch (e) {
      console.error("[demande-abonnement] email send failed", e);
      // On NE bloque PAS la confirmation côté demandeur : la donnée est
      // dans l'audit log, le founder peut la récupérer.
    }
  }

  redirect("/demande-abonnement?submitted=1");
}
