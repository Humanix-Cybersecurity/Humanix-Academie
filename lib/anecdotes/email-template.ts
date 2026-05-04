// Templates HTML + text de l'email "Cyber-Anecdote du Lundi".
// HTML responsive et compatible avec les principaux clients mail (Gmail, Outlook, Apple Mail).
// La version text est essentielle (RGPD + delivrability + screen readers).

import type { WeeklyAnecdote } from "@prisma/client";

const CATEGORY_BADGES: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  RANSOMWARE: { label: "Rançongiciel", emoji: "🔒", color: "#C0392B" },
  PHISHING: { label: "Phishing", emoji: "🎣", color: "#E67E22" },
  FRAUDE: { label: "Fraude", emoji: "💸", color: "#8E44AD" },
  DATA_LEAK: { label: "Fuite de données", emoji: "📤", color: "#2980B9" },
  SUPPLY_CHAIN: { label: "Chaîne d'appro", emoji: "🔗", color: "#16A085" },
  HACKTIVISME: { label: "Hacktivisme", emoji: "🚩", color: "#D35400" },
  IA_ABUS: { label: "Abus IA", emoji: "🤖", color: "#7D3C98" },
  AUTRE: { label: "Cyber", emoji: "🛡", color: "#0B3D91" },
};

export type AnecdoteEmailContext = {
  recipientName?: string | null;
  unsubscribeUrl: string; // URL one-click avec token
  webViewUrl: string; // URL de la page web /anecdotes/[slug]
};

export function renderAnecdoteEmailHTML(
  anecdote: WeeklyAnecdote,
  ctx: AnecdoteEmailContext,
): string {
  const cat = CATEGORY_BADGES[anecdote.category] ?? CATEGORY_BADGES.AUTRE;
  const dateFr = anecdote.incidentDate.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const greeting = ctx.recipientName ? `${ctx.recipientName},` : "Bonjour,";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(anecdote.title)}</title>
<style>
  body { margin: 0; padding: 0; background: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1A1A1A; }
  .wrap { max-width: 600px; margin: 0 auto; background: white; }
  .header { background: linear-gradient(135deg, #0B3D91 0%, #00A3A1 100%); color: white; padding: 32px 28px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 12px; margin-bottom: 12px; }
  .h1 { font-size: 22px; line-height: 1.3; margin: 8px 0 4px; }
  .meta { font-size: 12px; opacity: 0.85; }
  .body { padding: 28px; }
  .greeting { font-size: 14px; color: #444; margin-bottom: 16px; }
  .summary { font-size: 15px; line-height: 1.55; padding: 16px; background: #FFF8E5; border-left: 4px solid #F59E0B; border-radius: 4px; }
  .lesson-title { color: #00A3A1; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; margin: 24px 0 8px; }
  .lesson { font-size: 15px; line-height: 1.6; }
  .action-box { margin-top: 28px; padding: 20px; background: #EAF3F8; border-radius: 12px; border: 2px solid #00A3A1; }
  .action-title { color: #0B3D91; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 8px; }
  .action { font-size: 15px; line-height: 1.55; margin: 0; }
  .source { font-size: 12px; color: #888; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E7EB; }
  .source a { color: #0B3D91; text-decoration: none; }
  .cta { display: block; text-align: center; margin: 28px 0 8px; }
  .cta-link { display: inline-block; background: #00A3A1; color: white; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; }
  .footer { background: #F8FAFC; padding: 20px 28px; font-size: 11px; color: #888; line-height: 1.55; text-align: center; }
  .footer a { color: #555; }
</style>
</head>
<body>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td align="center">
    <table role="presentation" class="wrap" cellspacing="0" cellpadding="0" border="0">
      <tr><td class="header">
        <span class="badge">${cat.emoji} ${escapeHtml(cat.label)}</span>
        <p style="margin:4px 0;font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:1px;">📅 La Cyber-Anecdote du Lundi</p>
        <h1 class="h1">${escapeHtml(anecdote.title)}</h1>
        <p class="meta">Incident du ${escapeHtml(dateFr)}</p>
      </td></tr>

      <tr><td class="body">
        <p class="greeting">${escapeHtml(greeting)}</p>

        <div class="summary">
          ${escapeHtmlMultiline(anecdote.summary)}
        </div>

        <p class="lesson-title">💡 La leçon</p>
        <p class="lesson">${escapeHtmlMultiline(anecdote.lesson)}</p>

        <div class="action-box">
          <p class="action-title">🎯 Votre mini-action de la semaine</p>
          <p class="action">${escapeHtmlMultiline(anecdote.miniAction)}</p>
        </div>

        <p class="cta">
          <a href="${escapeAttr(ctx.webViewUrl)}" class="cta-link">Voir l'article complet sur le web →</a>
        </p>

        <p class="source">
          <strong>Source :</strong> <a href="${escapeAttr(anecdote.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(anecdote.sourceLabel)}</a>
        </p>
      </td></tr>

      <tr><td class="footer">
        <p style="margin:0 0 6px;">Vous recevez cet email parce que vous êtes abonné·e à la Cyber-Anecdote du Lundi de Humanix Académie.</p>
        <p style="margin:0;">
          <a href="${escapeAttr(ctx.unsubscribeUrl)}">Se désinscrire en un clic</a>
          &nbsp;·&nbsp;
          <a href="https://humanix-cybersecurity.fr">humanix-cybersecurity.fr</a>
          &nbsp;·&nbsp;
          🇫🇷 Hébergement France
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function renderAnecdoteEmailText(
  anecdote: WeeklyAnecdote,
  ctx: AnecdoteEmailContext,
): string {
  const cat = CATEGORY_BADGES[anecdote.category] ?? CATEGORY_BADGES.AUTRE;
  const dateFr = anecdote.incidentDate.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const greeting = ctx.recipientName ? `${ctx.recipientName},` : "Bonjour,";

  return `📅 La Cyber-Anecdote du Lundi - Humanix Académie
${cat.emoji} Catégorie : ${cat.label}

${anecdote.title}
Incident du ${dateFr}

----------------------------------------
${greeting}

${anecdote.summary}

💡 LA LEÇON
${anecdote.lesson}

🎯 VOTRE MINI-ACTION DE LA SEMAINE
${anecdote.miniAction}

----------------------------------------
Source : ${anecdote.sourceLabel}
${anecdote.sourceUrl}

Lire sur le web : ${ctx.webViewUrl}

----------------------------------------
Vous recevez cet email parce que vous êtes abonné·e à la Cyber-Anecdote du Lundi.
Se désinscrire en un clic : ${ctx.unsubscribeUrl}

Humanix Académie · humanix-cybersecurity.fr · 🇫🇷 Hébergement France
`;
}

export function buildSubject(anecdote: WeeklyAnecdote): string {
  // Le sujet doit etre punchy et inciter a ouvrir, sans ceder au clickbait.
  const cat = CATEGORY_BADGES[anecdote.category] ?? CATEGORY_BADGES.AUTRE;
  return `${cat.emoji} Lundi cyber : ${truncate(anecdote.title, 60)}`;
}

// ---------------------------------------------------------------------------
// Helpers d'echappement HTML (server-only, pas de DOM dispo)
// ---------------------------------------------------------------------------
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
function escapeHtmlMultiline(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}
function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
