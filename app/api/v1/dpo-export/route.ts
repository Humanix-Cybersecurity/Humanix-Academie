// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/v1/dpo-export
//
// Export JSON dedie DPO pour push vers les outils Privacy Tools de
// reference (OneTrust, Didomi, Privacy.fr, Dastra, Witik).
//
// === Differences avec /api/v1/evidence-export ===
//
// `evidence-export` produit un bundle multi-framework (ISO 27001, NIS2,
// ANSSI HG...) destine aux outils GRC generalistes (CISO Assistant,
// Eramba). C'est large et orient maturite cyber.
//
// `dpo-export` est focalise UNIQUEMENT sur les preuves RGPD operationnelles
// que le DPO peut importer dans son outil Privacy :
//   - Queue d'effacement art. 17 (avec statut/delai)
//   - Activite RGPD 30j (audit log filtre)
//   - Compteurs RGPD 90j (acces, exports, consents, etc.)
//   - AIPD generes (snapshot)
//   - Retention policy active
//   - Lien certificat de sensibilisation RGPD (module rgpd termine)
//
// Format JSON volontairement neutre (pas de schema specifique OneTrust /
// Didomi) : chaque outil Privacy peut le parser via mapping cote import.
// Specification stable, evolutions par ajout de champs (jamais rename).
//
// === Authentification ===
//
// Comme `evidence-export` : API key tenant (header `x-api-key`).
// Plan-gating : reserve plans `pro` et `enterprise`.
// Rate limit : 10 req/h par tenant (le DPO synchronise typiquement
// 1 fois/jour dans son outil).
//
// === Audit trail ===
//
// Event `DPO_EXPORT_REQUESTED` (severity=INFO) emis a chaque appel reussi.
// Le SOC peut detecter un usage anormal (10 calls/h = max, au-dela
// rate-limited).

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { auditLog, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";

const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 heure
const NINETY_DAYS_MS = 90 * 24 * 3600 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

// Actions RGPD que l'on compte sur 90j (definition stable, alignee
// avec /admin/dpo).
const RGPD_ACTIONS = [
  "DATA_ACCESSED",
  "DATA_EXPORTED",
  "DATA_ERASURE_REQUESTED",
  "DATA_ERASURE_COMPLETED",
  "CONSENT_GIVEN",
  "CONSENT_WITHDRAWN",
] as const;

type DpoExportResponse = {
  schema_version: "1.0";
  generated_at: string;
  tenant: {
    id: string;
    name: string;
    plan: string;
    data_retention_days: number | null;
  };
  rgpd_counters_90d: Record<string, number>;
  erasure_queue: Array<{
    request_id: string;
    user_email: string | null;
    requested_at: string;
    completed_at: string | null;
    days_pending: number | null;
    overdue: boolean; // > 30 jours sans completion = depasse delai legal RGPD
  }>;
  recent_activity_30d: Array<{
    id: string;
    action: string;
    actor_email: string | null;
    target_label: string | null;
    occurred_at: string;
    severity: string;
  }>;
  rgpd_awareness: {
    season_slug: "dpo-quotidien";
    module_completion_rate: number; // 0-1 sur les 6 modules dpo-quotidien
    users_with_certificate: number; // nb users ayant complete tous les modules
  };
  // Lien stable vers le rapport conformite humain (pour insertion dans
  // les meta du registre OneTrust / Didomi).
  links: {
    trust_center: string;
    confidentiality_policy: string;
    dpa_template: string;
    admin_dpo_dashboard: string;
  };
};

export async function GET(req: Request) {
  // Auth API key (header `Authorization: Bearer hxa_...`)
  const authResult = await authenticateApiKey(req);
  if (!authResult.ok || !authResult.tenantId) {
    return NextResponse.json(
      { error: authResult.error ?? "unauthorized" },
      { status: authResult.status ?? 401 },
    );
  }
  const { tenantId, apiKeyId } = authResult;

  // Plan-gating : pro + enterprise uniquement
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      plan: true,
      dataRetentionDays: true,
    },
  });
  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }
  const allowedPlans = ["pro", "enterprise"];
  if (!allowedPlans.includes(tenant.plan)) {
    return NextResponse.json(
      {
        error: "plan_not_authorized",
        message:
          "L'export DPO est reserve aux plans Pro et Enterprise. " +
          "Contacte contact@humanix-cybersecurity.fr pour upgrade.",
        current_plan: tenant.plan,
        required_plans: allowedPlans,
      },
      { status: 403 },
    );
  }

  // Rate limit
  const rateLimitResult = checkRateLimit(
    `dpo-export:${tenantId}`,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      {
        error: "rate_limit_exceeded",
        retry_after_seconds: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfter),
        },
      },
    );
  }

  const now = Date.now();
  const since90 = new Date(now - NINETY_DAYS_MS);
  const since30 = new Date(now - THIRTY_DAYS_MS);

  // === Compteurs 90j ===
  const counters = await db.auditLog.groupBy({
    by: ["action"],
    where: {
      tenantId,
      action: { in: RGPD_ACTIONS as unknown as string[] },
      createdAt: { gte: since90 },
    },
    _count: { _all: true },
  });
  const rgpd_counters_90d: Record<string, number> = Object.fromEntries(
    RGPD_ACTIONS.map((a) => [a, 0]),
  );
  for (const c of counters) {
    rgpd_counters_90d[c.action] = c._count._all;
  }

  // === Queue effacement art. 17 ===
  // On considere "en attente" = DATA_ERASURE_REQUESTED sans DATA_ERASURE_COMPLETED
  // correspondant dans les 30j. Heuristique simple : on liste les requests,
  // on flag overdue si > 30j sans completion.
  const erasureRequests = await db.auditLog.findMany({
    where: {
      tenantId,
      action: "DATA_ERASURE_REQUESTED",
      createdAt: { gte: since90 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      actorEmail: true,
      createdAt: true,
      targetType: true,
      targetId: true,
    },
  });

  // Charger les completions associees pour les mapper
  const completions = await db.auditLog.findMany({
    where: {
      tenantId,
      action: "DATA_ERASURE_COMPLETED",
      createdAt: { gte: since90 },
    },
    select: { actorEmail: true, createdAt: true, targetId: true },
  });
  // Mapper completions par (email, targetId) -> date la plus recente
  const completionMap = new Map<string, Date>();
  for (const c of completions) {
    const key = `${c.actorEmail ?? "none"}:${c.targetId ?? "none"}`;
    const existing = completionMap.get(key);
    if (!existing || c.createdAt > existing) {
      completionMap.set(key, c.createdAt);
    }
  }

  const erasure_queue = erasureRequests.map((r) => {
    const key = `${r.actorEmail ?? "none"}:${r.targetId ?? "none"}`;
    const completedAt = completionMap.get(key) ?? null;
    const daysPending = completedAt
      ? null
      : Math.floor((now - r.createdAt.getTime()) / (24 * 3600 * 1000));
    const overdue = !completedAt && (daysPending ?? 0) > 30;
    return {
      request_id: r.id,
      user_email: r.actorEmail,
      requested_at: r.createdAt.toISOString(),
      completed_at: completedAt?.toISOString() ?? null,
      days_pending: daysPending,
      overdue,
    };
  });

  // === Activite RGPD 30j ===
  const recentRaw = await db.auditLog.findMany({
    where: {
      tenantId,
      action: { in: RGPD_ACTIONS as unknown as string[] },
      createdAt: { gte: since30 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      actorEmail: true,
      targetType: true,
      targetId: true,
      createdAt: true,
      severity: true,
    },
  });
  const recent_activity_30d = recentRaw.map((r) => ({
    id: r.id,
    action: r.action,
    actor_email: r.actorEmail,
    target_label: r.targetType
      ? r.targetId
        ? `${r.targetType}:${r.targetId}`
        : r.targetType
      : null,
    occurred_at: r.createdAt.toISOString(),
    severity: r.severity ?? "INFO",
  }));

  // === Awareness RGPD : completion saison dpo-quotidien ===
  // Heuristique : on cherche les episodes de la saison dpo-quotidien et
  // on calcule le taux de completion moyen sur les users du tenant.
  const dpoSeason = await db.saison.findFirst({
    where: { slug: "dpo-quotidien" },
    include: { episodes: { select: { id: true } } },
  });
  let module_completion_rate = 0;
  let users_with_certificate = 0;
  if (dpoSeason && dpoSeason.episodes.length > 0) {
    const totalEpisodes = dpoSeason.episodes.length;
    const episodeIds = dpoSeason.episodes.map((e) => e.id);
    const tenantUsers = await db.user.count({
      where: { tenantId, isActive: true },
    });
    if (tenantUsers > 0) {
      const progress = await db.progress.findMany({
        where: {
          tenantId,
          episodeId: { in: episodeIds },
          completedAt: { not: null },
        },
        select: { userId: true, episodeId: true },
      });
      // Group by userId, count distinct episodes completed
      const byUser = new Map<string, Set<string>>();
      for (const p of progress) {
        const set = byUser.get(p.userId) ?? new Set();
        set.add(p.episodeId);
        byUser.set(p.userId, set);
      }
      // Users ayant complete TOUS les episodes
      users_with_certificate = Array.from(byUser.values()).filter(
        (set) => set.size >= totalEpisodes,
      ).length;
      // Taux completion moyen = total episodes completes / (users actifs × total episodes)
      const totalCompletions = Array.from(byUser.values()).reduce(
        (sum, set) => sum + set.size,
        0,
      );
      module_completion_rate = Math.round(
        (totalCompletions / (tenantUsers * totalEpisodes)) * 1000,
      ) / 1000;
    }
  }

  // === Construction de la reponse ===
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "https://humanix-academie.fr";

  const response: DpoExportResponse = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    tenant: {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      data_retention_days: tenant.dataRetentionDays,
    },
    rgpd_counters_90d,
    erasure_queue,
    recent_activity_30d,
    rgpd_awareness: {
      season_slug: "dpo-quotidien",
      module_completion_rate,
      users_with_certificate,
    },
    links: {
      trust_center: `${baseUrl}/securite`,
      confidentiality_policy: `${baseUrl}/confidentialite`,
      dpa_template: `${baseUrl}/securite#dpa`,
      admin_dpo_dashboard: `${baseUrl}/admin/dpo`,
    },
  };

  // === Audit log ===
  await auditLog({
    action: AuditActions.DPO_EXPORT_REQUESTED,
    outcome: "SUCCESS",
    severity: "INFO",
    tenantId,
    target: { type: "api_key", id: apiKeyId ?? null },
    message: "Export DPO Privacy Tools",
    metadata: {
      schema_version: response.schema_version,
      erasure_queue_size: erasure_queue.length,
      recent_activity_size: recent_activity_30d.length,
      rgpd_counters_total: Object.values(rgpd_counters_90d).reduce(
        (a, b) => a + b,
        0,
      ),
    },
  });

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Schema-Version": "1.0",
    },
  });
}
