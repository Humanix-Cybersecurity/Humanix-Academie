// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Calcul de la COUVERTURE de conformité multi-référentiels pour un tenant.
//
// Réutilise exactement la logique de /api/v1/evidence-export (mapping-grc +
// grc-metrics), généralisée aux 7 référentiels supportés, pour alimenter le
// hub /admin/conformite. La VÉRITÉ reste dans lib/mapping-grc.ts (principe :
// on ne surcote jamais un contrôle ; les contrôles hors périmètre Humanix
// sont déclarés `outOfScope` et affichés honnêtement).

import {
  FRAMEWORKS,
  SUPPORTED_FRAMEWORKS,
  isDocumentaryOnly,
  statusFromMetric,
  type FrameworkRef,
  type EvidenceStatus,
} from "@/lib/mapping-grc";
import { computeGrcMetrics, resolveMetricValue } from "@/lib/grc-metrics";

export type ControlCoverage = {
  ref: string;
  name: string;
  category?: string;
  status: EvidenceStatus;
  /** Valeur métrique 0-1 (taux de complétion, score…), ou null si documentaire/non évalué. */
  score: number | null;
  scopeNote?: string;
};

export type FrameworkCoverage = {
  ref: FrameworkRef;
  title: string;
  publisher: string;
  url: string;
  controls: ControlCoverage[];
  outOfScope: { ref: string; reason: string }[];
  summary: {
    total: number;
    assessed: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
    /** % de couverture pondéré : (compliant + 0,5·partial) / total. */
    coveragePct: number;
  };
};

function summarize(controls: ControlCoverage[]): FrameworkCoverage["summary"] {
  const total = controls.length;
  const compliant = controls.filter((c) => c.status === "compliant").length;
  const partial = controls.filter((c) => c.status === "partial").length;
  const nonCompliant = controls.filter((c) => c.status === "non_compliant").length;
  const notAssessed = controls.filter((c) => c.status === "not_assessed").length;
  const coveragePct =
    total === 0 ? 0 : Math.round(((compliant + 0.5 * partial) / total) * 100);
  return {
    total,
    assessed: total - notAssessed,
    compliant,
    partial,
    nonCompliant,
    notAssessed,
    coveragePct,
  };
}

/** Couverture d'UN référentiel pour un tenant, à partir de métriques déjà calculées. */
export function frameworkCoverage(
  ref: FrameworkRef,
  metrics: Awaited<ReturnType<typeof computeGrcMetrics>>,
): FrameworkCoverage {
  const fw = FRAMEWORKS[ref];
  const controls: ControlCoverage[] = fw.controls.map((control) => {
    const metricArtifact = control.artifacts.find((a) => a.type === "metric");
    const score = metricArtifact
      ? resolveMetricValue(metricArtifact, metrics)
      : null;

    let status: EvidenceStatus;
    if (metricArtifact && score !== null) {
      status = statusFromMetric(score, control);
    } else if (isDocumentaryOnly(control)) {
      // Contrôle documentaire : un artefact (politique, certificat) existe par
      // construction -> couvert.
      status = "compliant";
    } else {
      status = "not_assessed";
    }

    return {
      ref: control.ref,
      name: control.name,
      category: control.category,
      status,
      score,
      scopeNote: control.scopeNote,
    };
  });

  return {
    ref,
    title: fw.title,
    publisher: fw.publisher,
    url: fw.url,
    controls,
    outOfScope: fw.outOfScope ?? [],
    summary: summarize(controls),
  };
}

/**
 * Couverture des 7 référentiels pour un tenant. Calcule les métriques GRC une
 * seule fois (coûteux) puis dérive chaque référentiel.
 */
export async function computeAllFrameworksCoverage(
  tenantId: string,
): Promise<FrameworkCoverage[]> {
  const metrics = await computeGrcMetrics(tenantId);
  return SUPPORTED_FRAMEWORKS.map((ref) => frameworkCoverage(ref, metrics));
}
