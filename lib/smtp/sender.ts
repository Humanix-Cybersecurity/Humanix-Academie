// SPDX-License-Identifier: AGPL-3.0-or-later
//
// SMTP sender pour les envois TENANT (phishing simules + futurs envois
// transactionnels custom). N'utilise JAMAIS le SMTP global Humanix
// (Scaleway TEM) : c'est volontairement isole pour que :
//   - les envois soient identifies au domaine du client
//   - la deliverabilite + reputation soient a la charge du client
//   - les phishing simules ne polluent pas notre IP de reputation
//
// Si le tenant n'a PAS configure de SMTP, sendMailViaTenantSmtp() retourne
// { ok: false, reason: "smtp_not_configured" } et le caller doit afficher
// un CTA vers /admin/parametres/smtp ou /demande-abonnement (forfait).

import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { decryptSmtpPassword } from "./encryption";

export type SmtpSendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: SmtpSendError; details?: string };

export type SmtpSendError =
  | "smtp_not_configured"
  | "smtp_decrypt_failed"
  | "smtp_connect_failed"
  | "smtp_auth_failed"
  | "smtp_send_failed";

export type SmtpTestResult =
  | { ok: true; latencyMs: number }
  | { ok: false; reason: SmtpSendError; details?: string };

type TenantSmtpRow = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordEnc: string;
  fromEmail: string;
  fromName: string | null;
};

async function loadTenantSmtp(tenantId: string): Promise<TenantSmtpRow | null> {
  const cfg = await db.tenantSmtpConfig.findUnique({
    where: { tenantId },
    select: {
      host: true,
      port: true,
      secure: true,
      username: true,
      passwordEnc: true,
      fromEmail: true,
      fromName: true,
    },
  });
  return cfg;
}

function buildTransport(cfg: TenantSmtpRow): nodemailer.Transporter {
  const password = decryptSmtpPassword(cfg.passwordEnc);
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure, // true = 465 SSL, false = 587 STARTTLS
    auth: {
      user: cfg.username,
      pass: password,
    },
    // Securite : refuse les certs invalides en prod (anti-MITM).
    // Pour les tests sur SMTP self-host avec cert auto-signe, l'admin
    // doit configurer son SMTP avec un cert valide (Let's Encrypt).
    tls: {
      rejectUnauthorized: true,
    },
    // Timeouts raisonnables pour ne pas bloquer le UI
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
}

/**
 * Envoie un email via le SMTP configure pour le tenant donne.
 * Retourne un objet de resultat (ne throw pas).
 */
export async function sendMailViaTenantSmtp(
  tenantId: string,
  params: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    headers?: Record<string, string>;
  },
): Promise<SmtpSendResult> {
  const cfg = await loadTenantSmtp(tenantId);
  if (!cfg) {
    return { ok: false, reason: "smtp_not_configured" };
  }

  let transporter: nodemailer.Transporter;
  try {
    transporter = buildTransport(cfg);
  } catch (e) {
    return {
      ok: false,
      reason: "smtp_decrypt_failed",
      details: e instanceof Error ? e.message : String(e),
    };
  }

  const fromValue = cfg.fromName
    ? `"${cfg.fromName.replace(/"/g, "")}" <${cfg.fromEmail}>`
    : cfg.fromEmail;

  try {
    const info = await transporter.sendMail({
      from: fromValue,
      to: Array.isArray(params.to) ? params.to.join(", ") : params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: params.headers,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Heuristique pour categoriser l'erreur
    const reason: SmtpSendError = /auth|535|530|incorrect|invalid login/i.test(
      msg,
    )
      ? "smtp_auth_failed"
      : /connect|timeout|enotfound|getaddrinfo|econnrefused/i.test(msg)
        ? "smtp_connect_failed"
        : "smtp_send_failed";
    return { ok: false, reason, details: msg.slice(0, 500) };
  } finally {
    transporter.close();
  }
}

/**
 * Test la connexion SMTP du tenant (handshake + auth, pas d'envoi).
 * Sauvegarde le resultat dans TenantSmtpConfig.{isVerified, lastVerifiedAt,
 * lastError} pour que la UI admin l'affiche.
 */
export async function testTenantSmtp(
  tenantId: string,
): Promise<SmtpTestResult> {
  const cfg = await loadTenantSmtp(tenantId);
  if (!cfg) {
    return { ok: false, reason: "smtp_not_configured" };
  }

  let transporter: nodemailer.Transporter;
  try {
    transporter = buildTransport(cfg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.tenantSmtpConfig.update({
      where: { tenantId },
      data: {
        isVerified: false,
        lastVerifiedAt: new Date(),
        lastError: `Dechiffrement password : ${msg}`,
      },
    });
    return { ok: false, reason: "smtp_decrypt_failed", details: msg };
  }

  const start = Date.now();
  try {
    await transporter.verify();
    const latencyMs = Date.now() - start;
    await db.tenantSmtpConfig.update({
      where: { tenantId },
      data: {
        isVerified: true,
        lastVerifiedAt: new Date(),
        lastError: null,
      },
    });
    return { ok: true, latencyMs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const reason: SmtpSendError = /auth|535|530|incorrect|invalid login/i.test(
      msg,
    )
      ? "smtp_auth_failed"
      : /connect|timeout|enotfound|getaddrinfo|econnrefused/i.test(msg)
        ? "smtp_connect_failed"
        : "smtp_send_failed";
    await db.tenantSmtpConfig.update({
      where: { tenantId },
      data: {
        isVerified: false,
        lastVerifiedAt: new Date(),
        lastError: msg.slice(0, 500),
      },
    });
    return { ok: false, reason, details: msg.slice(0, 500) };
  } finally {
    transporter.close();
  }
}
