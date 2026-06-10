// SPDX-License-Identifier: AGPL-3.0-or-later
// Dispatcher webhooks : envoie 1 evenement vers tous les webhooks abonnes
// d'un tenant donne. Async / fire-and-forget : on n'attend pas la reponse
// pour ne pas bloquer la requete utilisateur.
//
// SECURITE :
//  - SSRF : on refuse toute URL non https + range privee (IPs internes)
//  - Timeout 5s par requete
//  - Signature HMAC SHA-256 pour les webhooks GENERIC (header x-humanix-signature)
//  - On enregistre succes/echec en DB pour la console admin
//
// Conventions :
//  - Slack : payload { text, blocks } compatible "Incoming Webhook"
//  - Teams : MessageCard "Office 365 Connector"
//  - Generic : { event, tenantId, occurredAt, data }
//
// Utilisation :
//   import { fireWebhook } from "@/lib/webhooks/dispatcher";
//   await fireWebhook(tenantId, "phishing.campaign_completed", { ... });

import crypto from "crypto";
import { lookup } from "node:dns/promises";
import { db } from "@/lib/db";
import {
  WEBHOOK_EVENTS,
  WebhookEventKey,
  parseSubscribedEvents,
} from "./events";
import { formatSlackBlocks, formatTeamsCard } from "./formatters";
import {
  formatJiraIssue,
  formatServiceNowIncident,
  formatPagerDutyEvent,
} from "./enterprise-formatters";
import { getErrorMessage } from "@/lib/errors";

const TIMEOUT_MS = 5000;
const MAX_PAYLOAD_BYTES = 50 * 1024;

/**
 * Une IP (v4 ou v6) tombe-t-elle dans une plage privee / reservee / loopback /
 * link-local / CGNAT / multicast ? Utilise pour bloquer le SSRF, AUSSI BIEN sur
 * un litteral d'URL que sur l'IP reellement resolue par le DNS.
 */
export function isPrivateIp(ip: string): boolean {
  const addr = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  // IPv6
  if (addr.includes(":")) {
    if (addr === "::1" || addr === "::") return true; // loopback / unspecified
    if (addr.startsWith("fe80")) return true; // link-local
    if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // ULA fc00::/7
    // IPv4-mapped (::ffff:a.b.c.d) : valider la partie IPv4.
    const mapped = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  // IPv4
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(addr);
  if (!m) return true; // forme IPv4 non canonique -> refus prudent
  const o = m.slice(1).map((n) => parseInt(n, 10));
  if (o.some((n) => n > 255)) return true;
  const [a, b] = o;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local (metadata cloud)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast + reserve
  return false;
}

/**
 * Verifie qu'une URL est sure pour un appel sortant (filtre synchrone) :
 * - https:// obligatoire
 * - pas localhost / *.local / *.internal / *.lan
 * - pas un litteral d'IP privee/reservee (IPv4 ET IPv6)
 *
 * NB : ce filtre ne suffit pas seul (un domaine public peut resoudre vers une
 * IP interne = DNS rebinding). La validation de l'IP REELLEMENT resolue est
 * faite juste avant le fetch dans postWithTimeout (assertPublicHost).
 */
export function isSafeWebhookUrl(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;

  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan")
  )
    return false;

  // Litteral d'IP (IPv4 dotted, ou IPv6 entre crochets) -> valider la plage.
  const isV4Literal = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
  const isV6Literal = host.startsWith("[") || host.includes(":");
  if ((isV4Literal || isV6Literal) && isPrivateIp(host)) return false;

  return true;
}

/**
 * Resout le hostname et refuse si UNE des IP est privee/reservee. Bloque le
 * DNS rebinding et les encodages d'IP alternatifs (le resolveur getaddrinfo
 * normalise "2130706433" / "0x7f.1" en 127.0.0.1, qui est alors rejete).
 * Fenetre TOCTOU residuelle (resolution != connexion) acceptee a ce stade.
 */
async function assertPublicHost(hostname: string): Promise<boolean> {
  try {
    const results = await lookup(hostname, { all: true });
    if (!results.length) return false;
    return results.every((r) => !isPrivateIp(r.address));
  } catch {
    return false; // resolution impossible -> on n'appelle pas
  }
}

export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Tente l'envoi d'un webhook avec un timeout strict.
 * Renvoie { ok, status, error? }.
 */
async function postWithTimeout(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // Anti-SSRF / DNS-rebinding : on revalide l'IP REELLEMENT resolue juste
    // avant la connexion (le filtre string isSafeWebhookUrl ne voit pas une
    // resolution malveillante).
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return { ok: false, status: 0, error: "invalid_url" };
    }
    if (!(await assertPublicHost(hostname))) {
      return { ok: false, status: 0, error: "blocked_private_host" };
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (e: unknown) {
    return {
      ok: false,
      status: 0,
      error: getErrorMessage(e, 200),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Construit le payload selon le type de webhook.
 *
 * Pour les types enterprise (JIRA, SERVICENOW, PAGERDUTY), on a besoin
 * du webhookUrl (pour parser projectKey de Jira) et du secret (routing
 * key pour PagerDuty). On les passe en options.
 */
function buildPayload(
  type:
    | "SLACK"
    | "TEAMS"
    | "GENERIC"
    | "JIRA"
    | "SERVICENOW"
    | "PAGERDUTY",
  event: WebhookEventKey,
  tenantId: string,
  tenantName: string,
  data: Record<string, unknown>,
  opts?: { webhookUrl?: string; secret?: string | null },
): string {
  const meta = WEBHOOK_EVENTS[event];
  const occurredAt = new Date().toISOString();

  if (type === "SLACK") {
    return JSON.stringify(
      formatSlackBlocks(event, meta.label, tenantName, data),
    );
  }
  if (type === "TEAMS") {
    return JSON.stringify(formatTeamsCard(event, meta.label, tenantName, data));
  }
  if (type === "JIRA") {
    return JSON.stringify(
      formatJiraIssue(
        event,
        meta.label,
        tenantName,
        data,
        opts?.webhookUrl ?? "",
      ),
    );
  }
  if (type === "SERVICENOW") {
    return JSON.stringify(
      formatServiceNowIncident(event, meta.label, tenantName, data),
    );
  }
  if (type === "PAGERDUTY") {
    return JSON.stringify(
      formatPagerDutyEvent(
        event,
        meta.label,
        tenantName,
        data,
        opts?.secret ?? "",
      ),
    );
  }
  return JSON.stringify({
    event,
    eventLabel: meta.label,
    tenantId,
    tenantName,
    occurredAt,
    data,
  });
}

/**
 * Envoie un evenement webhook a tous les webhooks abonnes du tenant.
 * Cette fonction est non-bloquante par design : les erreurs ne remontent pas,
 * elles sont enregistrees dans TenantWebhook.lastError.
 *
 * @param tenantId tenant cible
 * @param event clef d'evenement (cf. WEBHOOK_EVENTS)
 * @param data donnees libres a injecter dans le payload
 */
export async function fireWebhook(
  tenantId: string,
  event: WebhookEventKey,
  data: Record<string, unknown>,
): Promise<void> {
  // 1. Recupere tenant + webhooks actifs
  const [tenant, webhooks] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    db.tenantWebhook.findMany({
      where: { tenantId, isActive: true },
    }),
  ]);

  if (!tenant || webhooks.length === 0) return;

  // 2. Filtre par abonnement evenement
  const matching = webhooks.filter((w) =>
    parseSubscribedEvents(w.events).has(event),
  );
  if (matching.length === 0) return;

  // 3. Envoi parallele (toutes les requetes en meme temps, fail-safe)
  await Promise.allSettled(
    matching.map(async (w) => {
      // Securite SSRF
      if (!isSafeWebhookUrl(w.url)) {
        await db.tenantWebhook.update({
          where: { id: w.id },
          data: {
            failureCount: { increment: 1 },
            lastError: "URL refusee (SSRF guard)",
            lastFiredAt: new Date(),
          },
        });
        return;
      }

      const payload = buildPayload(
        w.type,
        event,
        tenantId,
        tenant.name,
        data,
        { webhookUrl: w.url, secret: w.secret },
      );

      if (Buffer.byteLength(payload) > MAX_PAYLOAD_BYTES) {
        await db.tenantWebhook.update({
          where: { id: w.id },
          data: {
            failureCount: { increment: 1 },
            lastError: `Payload trop gros (>${MAX_PAYLOAD_BYTES} octets)`,
            lastFiredAt: new Date(),
          },
        });
        return;
      }

      const headers: Record<string, string> = {
        "user-agent": "HumanixWebhook/1.0",
        "Content-Type": "application/json",
      };

      // Auth specifique au type :
      //   - GENERIC : signature HMAC dans header (cf. doc)
      //   - JIRA / SERVICENOW : header Authorization Basic (le secret
      //     contient deja le base64(user:pass) ou base64(email:apitoken))
      //   - PAGERDUTY : pas d'header (routing_key est dans le body)
      //   - SLACK / TEAMS : auth via secret embed dans l'URL du webhook
      if (w.type === "GENERIC" && w.secret) {
        headers["x-humanix-signature"] = signPayload(payload, w.secret);
        headers["x-humanix-event"] = event;
      } else if (w.type === "JIRA" && w.secret) {
        headers["Authorization"] = `Basic ${w.secret}`;
        headers["Accept"] = "application/json";
      } else if (w.type === "SERVICENOW" && w.secret) {
        headers["Authorization"] = `Basic ${w.secret}`;
        headers["Accept"] = "application/json";
      }
      // PAGERDUTY : pas d'header. routing_key est dans le payload.

      const result = await postWithTimeout(w.url, payload, headers);

      await db.tenantWebhook.update({
        where: { id: w.id },
        data: result.ok
          ? {
              successCount: { increment: 1 },
              lastFiredAt: new Date(),
              lastError: null,
            }
          : {
              failureCount: { increment: 1 },
              lastFiredAt: new Date(),
              lastError: `HTTP ${result.status}${result.error ? ` - ${result.error}` : ""}`,
            },
      });
    }),
  );
}

/**
 * Test d'un webhook (admin) : envoie un evenement sample correspondant a la
 * cle ou un payload dummy.
 */
export async function testWebhook(webhookId: string): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
}> {
  const w = await db.tenantWebhook.findUnique({ where: { id: webhookId } });
  if (!w) return { ok: false, error: "Webhook introuvable" };

  if (!isSafeWebhookUrl(w.url))
    return { ok: false, error: "URL refusee (SSRF)" };

  const tenant = await db.tenant.findUnique({
    where: { id: w.tenantId },
    select: { name: true },
  });

  // On envoie un sample du premier evenement abonne, sinon un test generique
  const subscribed = parseSubscribedEvents(w.events);
  const event: WebhookEventKey =
    subscribed.values().next().value ?? "user.invited";
  const payload = buildPayload(
    w.type,
    event,
    w.tenantId,
    tenant?.name ?? "Test",
    { ...WEBHOOK_EVENTS[event].sample, _test: true },
    { webhookUrl: w.url, secret: w.secret },
  );

  const headers: Record<string, string> = {
    "user-agent": "HumanixWebhook/1.0 (test)",
    "Content-Type": "application/json",
  };
  if (w.type === "GENERIC" && w.secret) {
    headers["x-humanix-signature"] = signPayload(payload, w.secret);
    headers["x-humanix-event"] = event;
  } else if ((w.type === "JIRA" || w.type === "SERVICENOW") && w.secret) {
    headers["Authorization"] = `Basic ${w.secret}`;
    headers["Accept"] = "application/json";
  }

  const result = await postWithTimeout(w.url, payload, headers);

  await db.tenantWebhook.update({
    where: { id: webhookId },
    data: {
      lastFiredAt: new Date(),
      ...(result.ok
        ? { successCount: { increment: 1 }, lastError: null }
        : {
            failureCount: { increment: 1 },
            lastError: `HTTP ${result.status}${result.error ? ` - ${result.error}` : ""}`,
          }),
    },
  });

  return result.ok
    ? { ok: true, status: result.status }
    : { ok: false, status: result.status, error: result.error };
}
