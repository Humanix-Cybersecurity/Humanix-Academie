// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Formatters webhooks "enterprise" : Jira, ServiceNow, PagerDuty.
//
// Ces presets transforment un evenement Humanix en payload natif accepte
// directement par l'API du provider, sans middleware Zapier ou n8n.
//
// IMPORTANT : chaque format requiert une auth specifique :
//   - JIRA       : header Authorization: Basic base64(email:apitoken)
//                  (le secret de TenantWebhook contient base64(email:apitoken))
//   - SERVICENOW : header Authorization: Basic base64(user:pass)
//                  (le secret contient base64(user:pass))
//   - PAGERDUTY  : pas d'header (auth via routing_key dans le body)
//                  (le secret = routing_key)
//
// Le dispatcher gere ces auth en injectant les headers appropries selon
// type. Cf. lib/webhooks/dispatcher.ts.

import type { WebhookEventKey } from "./events";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

/**
 * Severite mappee depuis l'event pour les outils de ticketing /
 * paging (qui veulent un signal de priorite).
 */
function severityForEvent(event: WebhookEventKey): {
  label: "info" | "warning" | "high" | "critical";
  jiraPriority: "Low" | "Medium" | "High" | "Highest";
  pagerDutySeverity: "info" | "warning" | "error" | "critical";
} {
  switch (event) {
    case "phishing.user_clicked":
    case "risk.degraded":
      return {
        label: "high",
        jiraPriority: "High",
        pagerDutySeverity: "warning",
      };
    case "phishing.reported":
      return {
        label: "warning",
        jiraPriority: "Medium",
        pagerDutySeverity: "info",
      };
    default:
      return {
        label: "info",
        jiraPriority: "Low",
        pagerDutySeverity: "info",
      };
  }
}

/**
 * JIRA - POST sur https://acme.atlassian.net/rest/api/3/issue
 * Doc : https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
 *
 * L'admin Jira doit nous donner :
 *   - URL de l'instance + project key (ex: SEC) dans l'URL :
 *     https://acme.atlassian.net/rest/api/3/issue?projectKey=SEC
 *     (on attend que projectKey soit dans la query string de l'URL)
 *
 * NB : on n'envoie pas de description ADF complexe pour rester compatible
 * sans depenser un parser ADF cote Humanix. Texte plain dans description.
 */
export function formatJiraIssue(
  event: WebhookEventKey,
  eventLabel: string,
  tenantName: string,
  data: Record<string, unknown>,
  webhookUrl: string,
) {
  const sev = severityForEvent(event);
  const url = new URL(webhookUrl);
  const projectKey =
    url.searchParams.get("projectKey") ?? url.searchParams.get("project") ?? "SEC";

  // Description plain text + lien vers le dashboard
  const factsBlock = Object.entries(data)
    .filter(
      ([, v]) => v !== null && v !== undefined && typeof v !== "object",
    )
    .slice(0, 10)
    .map(([k, v]) => `- ${k} : ${String(v)}`)
    .join("\n");

  return {
    fields: {
      project: { key: projectKey },
      summary: `[${tenantName}] ${eventLabel}`,
      description: `Événement Humanix Académie déclenché chez ${tenantName}.\n\n${factsBlock}\n\nDashboard : ${APP_URL}/admin/business`,
      issuetype: { name: "Task" },
      priority: { name: sev.jiraPriority },
      labels: ["humanix", `event-${event.replace(/\./g, "-")}`],
    },
  };
}

/**
 * SERVICENOW - POST sur https://acme.service-now.com/api/now/table/incident
 * Doc : https://developer.servicenow.com/dev.do#!/reference/api/utah/rest/c_TableAPI
 *
 * L'admin ServiceNow nous donne l'URL pleine + auth basic.
 */
export function formatServiceNowIncident(
  event: WebhookEventKey,
  eventLabel: string,
  tenantName: string,
  data: Record<string, unknown>,
) {
  const sev = severityForEvent(event);
  // Mapping severite Humanix -> impact / urgency ServiceNow (1-5, 1 = max)
  const impact = sev.label === "high" ? 2 : sev.label === "warning" ? 3 : 4;
  const urgency = impact;

  const factsBlock = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 10)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");

  return {
    short_description: `[${tenantName}] ${eventLabel}`,
    description: `Événement Humanix Académie\n\n${factsBlock}\n\nDashboard : ${APP_URL}/admin/business`,
    impact,
    urgency,
    category: "security",
    subcategory: "awareness",
    caller_id: "humanix-academie", // l'admin ServiceNow doit avoir cree ce caller
    contact_type: "integration",
  };
}

/**
 * PAGERDUTY - POST sur https://events.pagerduty.com/v2/enqueue
 * Doc : https://developer.pagerduty.com/docs/events-api-v2/trigger-events/
 *
 * L'auth se fait via routing_key dans le body (pas d'header). Le secret
 * de TenantWebhook = routing_key (Integration Key dans l'UI PagerDuty).
 */
export function formatPagerDutyEvent(
  event: WebhookEventKey,
  eventLabel: string,
  tenantName: string,
  data: Record<string, unknown>,
  routingKey: string,
) {
  const sev = severityForEvent(event);

  // Custom_details : on copie les champs scalaires (PagerDuty accepte
  // un objet libre, indexe pour le search)
  const customDetails: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && v !== undefined && typeof v !== "object") {
      customDetails[k] = v;
    }
  }
  customDetails.dashboardUrl = `${APP_URL}/admin/business`;

  // Dedup_key : evite que le meme event ne genere 50 incidents si dispatch
  // est rejoue (ex. user.invited deja envoye -> resolve auto plus tard).
  const dedupKey = `humanix-${event}-${tenantName}-${data.userEmail ?? data.userName ?? Date.now()}`;

  return {
    routing_key: routingKey,
    event_action: "trigger",
    dedup_key: dedupKey,
    payload: {
      summary: `[${tenantName}] ${eventLabel}`,
      source: "humanix-academie",
      severity: sev.pagerDutySeverity,
      component: event.split(".")[0], // "phishing", "risk", "episode", ...
      group: tenantName,
      class: event,
      custom_details: customDetails,
    },
    links: [
      {
        href: `${APP_URL}/admin/business`,
        text: "Voir le dashboard Humanix",
      },
    ],
  };
}
