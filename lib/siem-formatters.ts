// SPDX-License-Identifier: AGPL-3.0-or-later
// Formatters SIEM : Splunk CIM v1 + Sentinel/ArcSight CEF v1.
// Cible : injection dans Splunk HEC, Microsoft Sentinel CEF Forwarder, Sekoia,
// Elastic Security, Wazuh, Graylog ou tout SIEM consommateur de NDJSON / CEF.
//
// Choix de format :
//  - splunk-cim-v1 : NDJSON (newline-delimited JSON), une preuve par ligne,
//    structure HEC native ("time", "host", "source", "sourcetype", "event").
//    Champs CIM standardises ou possible (signature, severity, src_user...).
//
//  - sentinel-cef-v1 : CEF (ArcSight Common Event Format), une preuve par
//    ligne. Format reconnu par tous les SIEM majeurs.
//
// Reference CIM Splunk : https://docs.splunk.com/Documentation/CIM
// Reference CEF : https://www.microfocus.com/documentation/arcsight/arcsight-platform-22.1/Implementing-CEF/

import type { FrameworkMapping, EvidenceStatus } from "@/lib/mapping-grc";

export type SiemEvidence = {
  control_ref: string;
  control_name: string;
  category?: string;
  status: EvidenceStatus;
  score?: number;
  scope_note?: string;
  artifacts: Array<{
    type: string;
    name: string;
    value?: number;
    unit?: string;
    url?: string;
  }>;
};

export type SiemTenant = { id: string; name: string };

const HUMANIX_VENDOR = "Humanix";
const HUMANIX_PRODUCT = "Academy";
const HUMANIX_VERSION = "1.0";

/**
 * Mapping statut -> severity numerique (0-10).
 * Conventions cyber :
 *   - compliant      = informational (1)
 *   - partial        = low / warning (4)
 *   - non_compliant  = high (7)
 *   - not_assessed   = none (0)
 */
function statusToSeverity(status: EvidenceStatus): number {
  switch (status) {
    case "compliant":
      return 1;
    case "partial":
      return 4;
    case "non_compliant":
      return 7;
    default:
      return 0;
  }
}

function statusToSeverityLabel(status: EvidenceStatus): string {
  if (status === "compliant") return "informational";
  if (status === "partial") return "low";
  if (status === "non_compliant") return "high";
  return "unknown";
}

// ===========================================================================
// Format Splunk CIM v1 (NDJSON)
// ===========================================================================

/**
 * Genere une chaine NDJSON Splunk-HEC-compatible pour un export evidence.
 * Chaque ligne = un objet JSON valide, separes par '\n'.
 *
 * Le client (script connecteur) peut envoyer ce body directement a
 * /services/collector/event de Splunk HEC apres avoir ajoute l'auth.
 */
export function buildSplunkCimNdjson(args: {
  tenant: SiemTenant;
  framework: FrameworkMapping;
  evidences: SiemEvidence[];
  generatedAt: Date;
}): string {
  const { tenant, framework, evidences, generatedAt } = args;
  const epoch = Math.floor(generatedAt.getTime() / 1000);

  const lines = evidences.map((e) => {
    const event = {
      // Champs CIM Compliance / Change data model
      action: "evidence_exported",
      app: HUMANIX_PRODUCT,
      vendor_product: `${HUMANIX_VENDOR} ${HUMANIX_PRODUCT}`,
      severity: statusToSeverityLabel(e.status),
      severity_id: statusToSeverity(e.status),
      signature: `humanix.${e.control_ref.toLowerCase()}.${e.status}`,
      signature_id: e.control_ref,
      // Donnees Humanix
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      framework: framework.ref,
      framework_title: framework.title,
      control_ref: e.control_ref,
      control_name: e.control_name,
      control_category: e.category ?? null,
      compliance_status: e.status,
      compliance_score: e.score ?? null,
      scope_note: e.scope_note ?? null,
      artifacts_count: e.artifacts.length,
      artifacts_with_url: e.artifacts.filter((a) => a.url).length,
    };

    return JSON.stringify({
      time: epoch,
      host: HUMANIX_VENDOR.toLowerCase(),
      source: "humanix-academie",
      sourcetype: "humanix:compliance:evidence",
      event,
    });
  });

  return lines.join("\n") + "\n";
}

// ===========================================================================
// Format ArcSight/Sentinel CEF v1
// ===========================================================================

/**
 * Echappe les caracteres speciaux dans une valeur d'extension CEF.
 * Specs CEF : '|' et '\' dans le header, '=' et '\' dans les extensions,
 * '\n' devient '\\n'.
 */
function cefEscapeExt(value: string): string {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/=/g, "\\=")
    .replace(/\r?\n/g, "\\n");
}

function cefEscapeHeader(value: string): string {
  return String(value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

/**
 * Genere une ligne CEF par evidence.
 * Format : CEF:Version|Vendor|Product|Version|SignatureID|Name|Severity|Extension
 */
export function buildSentinelCef(args: {
  tenant: SiemTenant;
  framework: FrameworkMapping;
  evidences: SiemEvidence[];
  generatedAt: Date;
}): string {
  const { tenant, framework, evidences, generatedAt } = args;
  const isoTime = generatedAt.toISOString();

  const lines = evidences.map((e) => {
    const sigId = `humanix.${framework.ref.toLowerCase()}.${e.control_ref.toLowerCase()}`;
    const name = `Compliance Evidence: ${e.control_ref} (${e.status})`;
    const severity = statusToSeverity(e.status);

    const ext: Record<string, string> = {
      // Champs standards CEF
      rt: String(generatedAt.getTime()), // receipt time epoch ms
      cs1Label: "tenantId",
      cs1: tenant.id,
      cs2Label: "tenantName",
      cs2: tenant.name,
      cs3Label: "framework",
      cs3: framework.ref,
      cs4Label: "controlName",
      cs4: e.control_name,
      cs5Label: "complianceStatus",
      cs5: e.status,
      cs6Label: "complianceCategory",
      cs6: e.category ?? "uncategorized",
      cn1Label: "score",
      cn1: String(Math.round((e.score ?? 0) * 100)),
      cn2Label: "artifactsCount",
      cn2: String(e.artifacts.length),
      // Champs Humanix (custom CEF deviceCustomKeys) — visibles dans Sentinel
      // sous "AdditionalExtensions"
      humanixGeneratedAt: isoTime,
      humanixControlRef: e.control_ref,
    };

    const extString = Object.entries(ext)
      .map(([k, v]) => `${k}=${cefEscapeExt(v)}`)
      .join(" ");

    return [
      "CEF:0",
      cefEscapeHeader(HUMANIX_VENDOR),
      cefEscapeHeader(HUMANIX_PRODUCT),
      cefEscapeHeader(HUMANIX_VERSION),
      cefEscapeHeader(sigId),
      cefEscapeHeader(name),
      String(severity),
      extString,
    ].join("|");
  });

  return lines.join("\n") + "\n";
}
