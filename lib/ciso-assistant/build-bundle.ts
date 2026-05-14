// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Build du bundle d'evidence Humanix au format ciso-assistant-v1.
//
// Cette lib factorise la logique de construction du bundle utilisee :
//   1. Par l'endpoint REST GET /api/v1/evidence-export (consomme par le
//      connecteur Python externe ou autre outil GRC tiers).
//   2. Par la sync console admin (lib/ciso-assistant/sync.ts) qui pousse
//      les evidences vers une instance CISO Assistant configuree depuis
//      l'UI -- pas besoin de hit l'endpoint HTTP local.
//
// Le shape du bundle est identique pour les 2 chemins, donc une seule
// source de verite. Le routing API garde la responsabilite de l'auth,
// du rate limit, des formats alternatifs (OSCAL, Splunk, CEF) et du
// webhook outbound.

import {
  FRAMEWORKS,
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

export type CisoEvidence = {
  control_ref: string;
  control_name: string;
  category?: string;
  status: EvidenceStatus;
  score?: number;
  scope_note?: string;
  artifacts: {
    type: string;
    name: string;
    value?: number;
    unit?: string;
    url?: string;
    filter?: Record<string, string | number | boolean>;
  }[];
};

export type CisoBundle = {
  version: "1.0";
  format: "ciso-assistant-v1";
  tenant: { id: string; name: string };
  framework: {
    ref: string;
    title: string;
    publisher: string;
    url: string;
  };
  generated_at: string;
  summary: {
    total_controls: number;
    assessed_controls: number;
    compliant: number;
    partial: number;
    non_compliant: number;
  };
  evidences: CisoEvidence[];
  out_of_scope: { ref: string; reason: string }[];
  meta: {
    tenant_id: string;
    api_key_id?: string;
    humanix_version: string;
    docs: string;
  };
};

export async function buildCisoBundle(opts: {
  tenant: { id: string; name: string };
  frameworkRef: FrameworkRef;
  baseUrl: string;
  apiKeyId?: string;
  controlsFilter?: Set<string>;
}): Promise<CisoBundle> {
  const { tenant, frameworkRef, baseUrl, apiKeyId, controlsFilter } = opts;
  const framework = FRAMEWORKS[frameworkRef];
  const metrics = await computeGrcMetrics(tenant.id);

  const evidences: CisoEvidence[] = framework.controls
    .filter((c) => !controlsFilter || controlsFilter.has(c.ref))
    .map((control) => {
      const metricArtifact = control.artifacts.find((a) => a.type === "metric");
      const metricValue = metricArtifact
        ? resolveMetricValue(metricArtifact, metrics)
        : null;

      let status: EvidenceStatus;
      if (metricArtifact && metricValue !== null) {
        status = statusFromMetric(metricValue, control);
      } else if (isDocumentaryOnly(control)) {
        status = "compliant";
      } else {
        status = "not_assessed";
      }

      const artifacts = control.artifacts.map((a) => {
        const value =
          a.type === "metric" ? resolveMetricValue(a, metrics) : null;
        const link = resolveArtifactUrl(a, baseUrl, tenant.id);
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

  return {
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
      ...(apiKeyId && { api_key_id: apiKeyId }),
      humanix_version: "v1.0",
      docs: `${baseUrl}/integrations/ciso-assistant`,
    },
  };
}
