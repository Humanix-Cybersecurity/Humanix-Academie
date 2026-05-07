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
import { db } from "@/lib/db";
import {
  WEBHOOK_EVENTS,
  WebhookEventKey,
  parseSubscribedEvents,
} from "./events";
import { formatSlackBlocks, formatTeamsCard } from "./formatters";
import { getErrorMessage } from "@/lib/errors";

const TIMEOUT_MS = 5000;
const MAX_PAYLOAD_BYTES = 50 * 1024;

/**
 * Verifie qu'une URL est sure pour un appel sortant.
 * - Doit etre https://
 * - Hostname pas une IP privee (10.x, 172.16.x, 192.168.x, 127.x, 169.254.x, 0.x)
 * - Hostname pas localhost / *.local / *.internal
 *
 * Note : on autorise des domaines whitelistes pour Slack/Teams meme s'ils
 * resolvent a des CDN tiers (le DNS resoudra cote runtime).
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

  // IP literal ?
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)];
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 169 && b === 254) return false; // link-local
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }

  return true;
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
 */
function buildPayload(
  type: "SLACK" | "TEAMS" | "GENERIC",
  event: WebhookEventKey,
  tenantId: string,
  tenantName: string,
  data: Record<string, unknown>,
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

      const payload = buildPayload(w.type, event, tenantId, tenant.name, data);

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
      };

      // Signature pour les GENERIC uniquement (Slack/Teams ont leur propre auth via URL)
      if (w.type === "GENERIC" && w.secret) {
        headers["x-humanix-signature"] = signPayload(payload, w.secret);
        headers["x-humanix-event"] = event;
      }

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
  );

  const headers: Record<string, string> = {
    "user-agent": "HumanixWebhook/1.0 (test)",
  };
  if (w.type === "GENERIC" && w.secret) {
    headers["x-humanix-signature"] = signPayload(payload, w.secret);
    headers["x-humanix-event"] = event;
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
