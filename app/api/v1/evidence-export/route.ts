// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/v1/evidence-export
//
// Export de preuves de conformite (evidence) pour un framework GRC donne.
// Concu pour etre consomme par CISO Assistant (intuitem) ou tout outil GRC
// equivalent (Eramba, MetricStream, ServiceNow GRC).
//
// Authentification : API key tenant (modele ApiKey, hashe SHA-256).
// Plan-gating : reservee aux plans `pro` et `enterprise` (anciennement
// "essentielle+", remappee depuis le pivot 4 paliers mai 2026).
// Rate limit : 10 req/h par tenant.
// Audit trail : event `evidence.exported` enregistre a chaque appel reussi.
//
// Spec complete : /INTEGRATION_CISO_ASSISTANT.md (sections 5 et suivantes).

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  FRAMEWORKS,
  SUPPORTED_FRAMEWORKS,
  isDocumentaryOnly,
  statusFromMetric,
  type FrameworkRef,
  type EvidenceStatus,
} from "@/lib/mapping-grc";
import {
  computeGrcMetrics,
  resolveArtifactUrl,
  resolveMetricValue,
} from "@/lib/grc-metrics";
import { buildOscalAssessmentResults } from "@/lib/oscal";
import { buildSplunkCimNdjson, buildSentinelCef } from "@/lib/siem-formatters";
import { fireWebhook } from "@/lib/webhooks/dispatcher";

export const dynamic = "force-dynamic";

const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 heure
const SUPPORTED_FORMATS = [
  "ciso-assistant-v1",
  "oscal-v1",
  "splunk-cim-v1",
  "sentinel-cef-v1",
  "raw",
] as const;
type ExportFormat = (typeof SUPPORTED_FORMATS)[number];

function isFrameworkRef(value: string): value is FrameworkRef {
  return (SUPPORTED_FRAMEWORKS as string[]).includes(value);
}

function isExportFormat(value: string): value is ExportFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(value);
}

export async function GET(req: Request) {
  // ----- 1. Auth -----
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status ?? 401 },
    );
  }
  const tenantId = auth.tenantId!;

  // ----- 2. Rate limit -----
  const rl = checkRateLimit(
    `evidence-export:${tenantId}`,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Limite de ${RATE_LIMIT_REQUESTS} req/h atteinte.`,
        retryAfter: rl.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // ----- 3. Validation parametres -----
  const url = new URL(req.url);
  const frameworkParam = url.searchParams.get("framework");
  const formatParam = url.searchParams.get("format") ?? "ciso-assistant-v1";
  const controlsParam = url.searchParams.get("controls");
  const sinceParam = url.searchParams.get("since");

  if (!frameworkParam) {
    return NextResponse.json(
      {
        error: "missing_parameter",
        message: "Le parametre `framework` est obligatoire.",
        supported: SUPPORTED_FRAMEWORKS,
      },
      { status: 400 },
    );
  }
  if (!isFrameworkRef(frameworkParam)) {
    return NextResponse.json(
      {
        error: "unsupported_framework",
        message: `Framework "${frameworkParam}" non supporte.`,
        supported: SUPPORTED_FRAMEWORKS,
      },
      { status: 400 },
    );
  }
  if (!isExportFormat(formatParam)) {
    return NextResponse.json(
      {
        error: "unsupported_format",
        supported: SUPPORTED_FORMATS,
      },
      { status: 400 },
    );
  }

  const framework = FRAMEWORKS[frameworkParam];
  const controlsFilter = controlsParam
    ? new Set(controlsParam.split(",").map((s) => s.trim()))
    : null;
  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  if (sinceDate && Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json(
      { error: "invalid_since", message: "Format ISO 8601 attendu." },
      { status: 400 },
    );
  }

  // ----- 4. Donnees tenant + metriques -----
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }

  const metrics = await computeGrcMetrics(tenantId);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `https://${req.headers.get("host") ?? "humanix-academie.fr"}`;

  // ----- 5. Construction des evidences -----
  const evidences = framework.controls
    .filter((c) => !controlsFilter || controlsFilter.has(c.ref))
    .map((control) => {
      // Premier artifact metric -> calcule le score/statut
      const metricArtifact = control.artifacts.find((a) => a.type === "metric");
      const metricValue = metricArtifact
        ? resolveMetricValue(metricArtifact, metrics)
        : null;

      let status: EvidenceStatus;
      if (metricArtifact && metricValue !== null) {
        status = statusFromMetric(metricValue, control);
      } else if (isDocumentaryOnly(control)) {
        status = "compliant"; // un document existe par construction
      } else {
        status = "not_assessed";
      }

      const artifacts = control.artifacts.map((a) => {
        const value =
          a.type === "metric" ? resolveMetricValue(a, metrics) : null;
        const link = resolveArtifactUrl(a, baseUrl, tenantId);
        return {
          type: a.type,
          name: a.label,
          ...(value !== null && {
            value: Math.round(value * 1000) / 10,
            unit: "%",
          }),
          ...(link && { url: link }),
          ...(a.filter && { filter: a.filter }),
        };
      });

      return {
        control_ref: control.ref,
        control_name: control.name,
        category: control.category,
        status,
        ...(metricValue !== null && {
          score: Math.round(metricValue * 100) / 100,
        }),
        ...(control.scopeNote && { scope_note: control.scopeNote }),
        artifacts,
      };
    });

  const generatedAt = new Date();

  // ----- 6. Audit trail + webhook outbound (fire-and-forget) -----
  db.event
    .create({
      data: {
        tenantId,
        type: "evidence.exported",
        payload: {
          framework: framework.ref,
          format: formatParam,
          controls_count: evidences.length,
          api_key_id: auth.apiKeyId,
          ...(sinceDate && { since: sinceDate.toISOString() }),
        },
      },
    })
    .catch((err: unknown) => {
      console.error("[evidence-export] audit log failed:", err);
    });

  fireWebhook(tenantId, "evidence.exported", {
    framework: framework.ref,
    format: formatParam,
    controls_count: evidences.length,
    summary: {
      compliant: evidences.filter((e) => e.status === "compliant").length,
      partial: evidences.filter((e) => e.status === "partial").length,
      non_compliant: evidences.filter((e) => e.status === "non_compliant")
        .length,
    },
    bundle_url: `${baseUrl}/api/v1/evidence-export?framework=${framework.ref}&format=${formatParam}`,
    generated_at: generatedAt.toISOString(),
  }).catch((err: unknown) => {
    console.error("[evidence-export] webhook dispatch failed:", err);
  });

  // ----- 7. Reponse -----
  if (formatParam === "oscal-v1") {
    const oscalDoc = buildOscalAssessmentResults({
      tenant,
      framework,
      evidences: evidences as unknown as Parameters<
        typeof buildOscalAssessmentResults
      >[0]["evidences"],
      generatedAt,
      baseUrl,
    });
    return NextResponse.json(oscalDoc, {
      headers: {
        "Content-Type": "application/oscal+json; charset=utf-8",
      },
    });
  }

  if (formatParam === "splunk-cim-v1") {
    const ndjson = buildSplunkCimNdjson({
      tenant,
      framework,
      evidences: evidences as unknown as Parameters<
        typeof buildSplunkCimNdjson
      >[0]["evidences"],
      generatedAt,
    });
    return new NextResponse(ndjson, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "X-Humanix-Format": "splunk-cim-v1",
      },
    });
  }

  if (formatParam === "sentinel-cef-v1") {
    const cef = buildSentinelCef({
      tenant,
      framework,
      evidences: evidences as unknown as Parameters<
        typeof buildSentinelCef
      >[0]["evidences"],
      generatedAt,
    });
    return new NextResponse(cef, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Humanix-Format": "sentinel-cef-v1",
      },
    });
  }

  if (formatParam === "raw") {
    return NextResponse.json({
      tenant,
      framework: framework.ref,
      metrics,
      evidences,
    });
  }

  // Format ciso-assistant-v1 (defaut)
  return NextResponse.json({
    version: "1.0",
    format: "ciso-assistant-v1",
    tenant: { id: tenant.id, name: tenant.name },
    framework: {
      ref: framework.ref,
      title: framework.title,
      publisher: framework.publisher,
      url: framework.url,
    },
    generated_at: new Date().toISOString(),
    summary: {
      total_controls: framework.controls.length,
      assessed_controls: evidences.filter((e) => e.status !== "not_assessed")
        .length,
      compliant: evidences.filter((e) => e.status === "compliant").length,
      partial: evidences.filter((e) => e.status === "partial").length,
      non_compliant: evidences.filter((e) => e.status === "non_compliant")
        .length,
    },
    evidences,
    out_of_scope: framework.outOfScope,
    meta: {
      tenant_id: tenant.id,
      api_key_id: auth.apiKeyId,
      humanix_version: "v1.0",
      docs: `${baseUrl}/integrations/ciso-assistant`,
    },
  });
}
