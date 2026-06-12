// SPDX-License-Identifier: AGPL-3.0-or-later
// Formatage des payloads pour Slack et Microsoft Teams.
// L'objectif : que le message soit immediatement lisible dans le canal,
// sans avoir besoin de lien externe.

import { WebhookEventKey } from "./events";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

/**
 * Construit un payload Slack "Incoming Webhook" avec blocks.
 * Doc : https://api.slack.com/messaging/webhooks
 */
export function formatSlackBlocks(
  event: WebhookEventKey,
  eventLabel: string,
  tenantName: string,
  data: Record<string, unknown>,
) {
  const summary = renderSummary(event, data);
  const fields = renderKeyValuePairs(data).slice(0, 8); // max raisonnable

  return {
    text: `Humanix Académie - ${eventLabel} chez ${tenantName}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🛡️ ${eventLabel}`, emoji: true },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*${tenantName}* · _Notification Humanix Académie_`,
          },
        ],
      },
      ...(summary
        ? [
            {
              type: "section",
              text: { type: "mrkdwn", text: summary },
            },
          ]
        : []),
      ...(fields.length
        ? [
            {
              type: "section",
              fields: fields.map(([k, v]) => ({
                type: "mrkdwn",
                text: `*${escapeSlack(k)}*\n${escapeSlack(String(v))}`,
              })),
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Ouvrir le dashboard" },
            url: `${APP_URL}/admin/business`,
          },
        ],
      },
    ],
  };
}

/**
 * Construit un payload MessageCard pour Microsoft Teams.
 * Doc : https://learn.microsoft.com/en-us/outlook/actionable-messages/message-card-reference
 */
export function formatTeamsCard(
  event: WebhookEventKey,
  eventLabel: string,
  tenantName: string,
  data: Record<string, unknown>,
) {
  const summary = renderSummary(event, data);
  const facts = renderKeyValuePairs(data).map(([k, v]) => ({
    name: k,
    value: String(v),
  }));

  return {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: `Humanix Académie - ${eventLabel}`,
    themeColor: "0B3D91",
    title: `🛡️ ${eventLabel}`,
    sections: [
      {
        activityTitle: tenantName,
        activitySubtitle: "Notification Humanix Académie",
        text: summary || undefined,
        facts: facts.length ? facts : undefined,
      },
    ],
    potentialAction: [
      {
        "@type": "OpenUri",
        name: "Ouvrir le dashboard",
        targets: [{ os: "default", uri: `${APP_URL}/admin/business` }],
      },
    ],
  };
}

/**
 * Resume libre, contextuel a l'evenement.
 */
function renderSummary(
  event: WebhookEventKey,
  data: Record<string, unknown>,
): string {
  switch (event) {
    case "phishing.campaign_completed": {
      const sent = num(data.sentTo);
      const clicked = num(data.clicked);
      const reported = num(data.reported);
      const rate = data.reportRate
        ? Math.round(Number(data.reportRate) * 100)
        : 0;
      return `Campagne *${escapeSlack(String(data.campaignTitle ?? ""))}* terminée : ${sent} envoyés, ${clicked} cliqués, ${reported} signalés (taux signalement *${rate} %*).`;
    }
    case "phishing.reported": {
      const userName = escapeSlack(String(data.userName ?? "Anonyme"));
      const fromAddr = escapeSlack(String(data.fromAddress ?? "-"));
      const subject = escapeSlack(String(data.subject ?? ""));
      const source = String(data.source ?? "interne");
      return `🚨 *${userName}* a signalé un mail suspect (${source}) : expéditeur \`${fromAddr}\` - _"${subject}"_.`;
    }
    case "risk.degraded": {
      return `⚠️ Le score de risque est passé de *${num(data.previousScore)}* à *${num(data.currentScore)}* (${data.delta}). Cause probable : ${escapeSlack(String(data.cause ?? "-"))}.`;
    }
    case "saison.completed": {
      return `🎓 *${escapeSlack(String(data.userName ?? ""))}* a terminé la saison *${escapeSlack(String(data.saisonTitle ?? ""))}* (score moyen ${num(data.averageScore)}/100).`;
    }
    case "episode.completed": {
      return `✅ *${escapeSlack(String(data.userName ?? ""))}* a complété *${escapeSlack(String(data.episodeTitle ?? ""))}* avec un score de ${num(data.score)}/100.`;
    }
    case "user.invited": {
      return `📩 Nouvel utilisateur invité : *${escapeSlack(String(data.email ?? ""))}*${data.invitedBy ? ` par ${escapeSlack(String(data.invitedBy))}` : ""}.`;
    }
    case "marketplace.module_installed": {
      return `📦 Module installé : *${escapeSlack(String(data.moduleTitle ?? ""))}* - auteur : ${escapeSlack(String(data.author ?? "-"))}.`;
    }
    default:
      return "";
  }
}

function renderKeyValuePairs(
  data: Record<string, unknown>,
): [string, unknown][] {
  return Object.entries(data)
    .filter(([k]) => !k.startsWith("_"))
    .map(([k, v]) => [humanizeKey(k), v] as [string, unknown]);
}

function humanizeKey(k: string): string {
  // camelCase / snake_case -> "Title Case"
  return k
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function num(v: unknown): number | string {
  return typeof v === "number" ? v : (v ?? 0).toString();
}

/**
 * Slack utilise un mini markdown ; on echappe les caracteres dangereux.
 */
function escapeSlack(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
