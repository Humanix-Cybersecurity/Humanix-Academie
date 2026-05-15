// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Live Mode v2.0 — mini-sync incrementale event-driven.
//
// PRINCIPE
// ========
// Quand `CisoAssistantConnection.enableLiveMode = true`, chaque evenement
// metier Humanix (episode.completed, phishing.reported, phishing.user_clicked)
// declenche une mini-sync vers CISO Assistant en quelques secondes au lieu
// d'attendre le cron quotidien. Le RSSI voit le score remonter en direct
// pendant une presentation COMEX.
//
// ARCHITECTURE
// ============
// 1. `triggerCisoLiveSync(tenantId, event)` est appele fire-and-forget
//    juste apres `fireWebhook(...)` dans les routes :
//      - app/api/progress/route.ts (episode.completed)
//      - app/api/phishing/report/route.ts (phishing.reported)
//      - app/phishing/[token]/page.tsx (phishing.user_clicked)
//    L'evenement metier n'est JAMAIS bloque par une erreur live-sync.
//
// 2. Debouncer en memoire par tenantId : 5s de fenetre. Si 50 episodes sont
//    completes en 30s par 50 users, on ne fait qu'UNE sync vers CISO
//    Assistant (la derniere). Evite de hammerer l'API CISO Assistant.
//
// 3. Quand le timer expire, on appelle `runLiveSync(tenantId, lastEvent)` :
//    - Verifie connexion + toggle (re-read DB au cas ou l'admin l'a coupe)
//    - Trouve les frameworks deja synces au moins une fois (sinon no-op)
//    - Pour chaque framework : login -> ensureFolder -> loadExistingEvidences
//      -> upsertEvidence en boucle. PAS de PDF, PAS de Findings/Risk/
//      Incidents/Metrology/Teams/Campaigns (trop couteux pour du temps reel).
//    - Met a jour CisoAssistantConnection.lastLiveSyncAt + liveSyncCount
//    - AuditLog CISO_LIVE_SYNC avec metadonnees (event, framework, ok/fail).
//
// 4. AUCUN nouveau CisoAssistantSyncRun n'est cree pour les live syncs :
//    - L'historique reste lisible (manual/cron only).
//    - La telemetrie va dans la connexion (lastLiveSyncAt, liveSyncCount)
//      et dans AuditLog (trace exhaustive).
//
// IDEMPOTENCE
// ===========
// `upsertEvidence` est idempotent par nom (GET-by-name + PATCH ou POST).
// Re-pusher 100x la meme evidence ne cree pas 100 entrees, juste 100
// PATCH. Cf. CisoAssistantClient.upsertEvidence().
//
// SAFETY
// ======
// - Si une sync manuelle est deja running pour le tenant, on skip
//   (evite collision de session Knox et race sur loadExistingEvidences).
// - Si la sync live elle-meme est deja en cours (drapeau in-memory), on skip.
// - Tous les catch sont silencieux : un echec live ne degrade jamais le
//   user-facing event.

import { AuditAction, AuditOutcome, AuditSeverity } from "@prisma/client";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import {
  SUPPORTED_FRAMEWORKS,
  type FrameworkRef,
} from "@/lib/mapping-grc";
import { buildCisoBundle } from "./build-bundle";
import { CisoAssistantClient } from "./client";
import { decryptCisoPassword } from "./encryption";

export type LiveEvent =
  | "episode.completed"
  | "phishing.reported"
  | "phishing.user_clicked";

const DEBOUNCE_MS = 5000;
const COVERAGE_DAYS = 365;

// Debouncer en memoire (par tenantId -> timer). En multi-instance Node
// chaque pod aura son propre debouncer ; OK car upsertEvidence est
// idempotent et CISO Assistant tolere les writes concurrents.
const debouncers = new Map<
  string,
  { timer: NodeJS.Timeout; lastEvent: LiveEvent }
>();
// Drapeau "en cours" par tenant pour eviter une re-entree pendant qu'une
// live sync est deja en train de tourner pour ce tenant.
const inFlight = new Set<string>();

/**
 * Point d'entree public. Non-bloquant, ne throw jamais.
 * Appele depuis les routes API juste apres fireWebhook().
 */
export function triggerCisoLiveSync(
  tenantId: string,
  event: LiveEvent,
): void {
  try {
    scheduleLiveSync(tenantId, event);
  } catch (err) {
    // Un echec ici ne doit JAMAIS impacter l'evenement metier.
    console.error("[ciso-live] scheduleLiveSync threw", err);
  }
}

function scheduleLiveSync(tenantId: string, event: LiveEvent): void {
  const existing = debouncers.get(tenantId);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    debouncers.delete(tenantId);
    void runLiveSync(tenantId, event).catch((err) => {
      console.error("[ciso-live] runLiveSync uncaught", err);
    });
  }, DEBOUNCE_MS);
  // Ne pas garder le process node en vie juste pour ce timer.
  if (typeof timer.unref === "function") timer.unref();

  debouncers.set(tenantId, { timer, lastEvent: event });
}

async function runLiveSync(
  tenantId: string,
  triggerEvent: LiveEvent,
): Promise<void> {
  if (inFlight.has(tenantId)) {
    // Une autre live sync est deja en cours pour ce tenant -> skip.
    return;
  }

  // 1. Re-read connexion (toggle peut avoir ete coupe entre temps).
  const conn = await db.cisoAssistantConnection.findUnique({
    where: { tenantId },
  });
  if (!conn || !conn.enableLiveMode) return;

  // 2. Garde-fou : si une sync manuelle est running, ne pas y toucher.
  const manualRunning = await db.cisoAssistantSyncRun.count({
    where: { tenantId, status: "running" },
  });
  if (manualRunning > 0) return;

  // 3. Determine les frameworks deja synces au moins une fois pour ce
  //    tenant (live mode ne fait que rafraichir les contextes connus).
  const distinctRuns = await db.cisoAssistantSyncRun.findMany({
    where: { tenantId, status: { in: ["success", "partial"] } },
    distinct: ["framework"],
    select: { framework: true },
  });
  const frameworks = distinctRuns
    .map((r) => r.framework)
    .filter((f): f is FrameworkRef =>
      (SUPPORTED_FRAMEWORKS as readonly string[]).includes(f),
    );
  if (frameworks.length === 0) {
    // Live mode n'est pas un moyen d'initialiser : l'admin doit avoir fait
    // au moins une sync manuelle reussie d'un framework au prealable.
    return;
  }

  inFlight.add(tenantId);
  const startedAt = Date.now();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://humanix-academie.fr";

  try {
    const tenant = await db.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { id: true, name: true, createdAt: true },
    });

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - COVERAGE_DAYS * 86400 * 1000);
    const coverageStart =
      tenant.createdAt > oneYearAgo ? tenant.createdAt : oneYearAgo;
    const audit = {
      ownerEmail: conn.ownerEmail,
      coverageStart: coverageStart.toISOString(),
      coverageEnd: now.toISOString(),
      contentVersion: process.env.HUMANIX_CONTENT_VERSION ?? "2026.05",
      expiryDate: new Date(now.getTime() + COVERAGE_DAYS * 86400 * 1000)
        .toISOString()
        .slice(0, 10),
    };

    const password = decryptCisoPassword(conn.passwordEnc);
    const client = new CisoAssistantClient({
      baseUrl: conn.baseUrl,
      username: conn.username,
      password,
      folderName: conn.folderName,
      verifySSL: conn.verifySSL,
    });

    // Login + folder une seule fois pour tous les frameworks du tenant.
    await client.login();
    await client.ensureFolder();
    await client.loadExistingEvidences();

    // Stats par framework
    const perFramework: Array<{
      framework: FrameworkRef;
      ok: number;
      fail: number;
      total: number;
    }> = [];

    for (const framework of frameworks) {
      const bundle = await buildCisoBundle({
        tenant: { id: tenant.id, name: tenant.name },
        frameworkRef: framework,
        baseUrl,
      });
      let ok = 0;
      let fail = 0;
      for (const ev of bundle.evidences) {
        const r = await client.upsertEvidence(ev, baseUrl, audit);
        if (r.ok) ok += 1;
        else fail += 1;
      }
      perFramework.push({
        framework,
        ok,
        fail,
        total: bundle.evidences.length,
      });
    }

    // 4. Telemetrie : update connexion + audit log
    await db.cisoAssistantConnection.update({
      where: { tenantId },
      data: {
        lastLiveSyncAt: new Date(),
        lastLiveSyncEvent: triggerEvent,
        liveSyncCount: { increment: 1 },
      },
    });

    const totalOk = perFramework.reduce((s, f) => s + f.ok, 0);
    const totalFail = perFramework.reduce((s, f) => s + f.fail, 0);
    const totalAll = perFramework.reduce((s, f) => s + f.total, 0);
    const durationMs = Date.now() - startedAt;

    await auditLog({
      action: AuditAction.CISO_LIVE_SYNC,
      outcome: totalFail === 0 ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      severity:
        totalFail === 0 ? AuditSeverity.INFO : AuditSeverity.WARNING,
      tenantId,
      target: { type: "ciso_connection", label: conn.baseUrl },
      message: `Live sync ${triggerEvent} : ${totalOk}/${totalAll} evidences sur ${perFramework.length} framework(s) en ${durationMs}ms`,
      metadata: {
        triggerEvent,
        durationMs,
        totalOk,
        totalFail,
        totalAll,
        perFramework: perFramework.map((f) => ({
          framework: f.framework,
          ok: f.ok,
          fail: f.fail,
          total: f.total,
        })),
      },
    });
  } catch (err) {
    // Echec global : on log mais on ne re-throw pas. Live mode est best-effort.
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ciso-live] sync failed for tenant", tenantId, msg);
    await auditLog({
      action: AuditAction.CISO_LIVE_SYNC,
      outcome: AuditOutcome.FAILURE,
      severity: AuditSeverity.WARNING,
      tenantId,
      target: { type: "ciso_connection", label: conn.baseUrl },
      message: `Live sync echec : ${msg}`,
      metadata: { triggerEvent, error: msg.slice(0, 500) },
    }).catch(() => {});
  } finally {
    inFlight.delete(tenantId);
  }
}
