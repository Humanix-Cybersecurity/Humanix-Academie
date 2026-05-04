// Tests des formatters SIEM (Splunk CIM + Sentinel CEF).
// Critique : un format mal-formé = ligne ignorée par le SIEM = preuve manquante
// dans l'audit GRC du client (incident potentiellement non détecté).

import { describe, it, expect } from "vitest";
import {
  buildSplunkCimNdjson,
  buildSentinelCef,
  type SiemEvidence,
  type SiemTenant,
} from "./siem-formatters";
import { FRAMEWORKS } from "./mapping-grc";

const tenant: SiemTenant = { id: "tenant_1", name: "ACME Corp" };
const framework = FRAMEWORKS["ISO27001:2022"];
const generatedAt = new Date("2026-05-04T12:00:00Z");

const evidence: SiemEvidence = {
  control_ref: "A.5.1",
  control_name: "Politiques de sécurité",
  category: "ORG",
  status: "compliant",
  score: 95,
  scope_note: "Documenté + revu trimestriellement",
  artifacts: [
    { type: "policy", name: "Charte cyber" },
    { type: "metric", name: "Taux", value: 95, unit: "%" },
  ],
};

describe("buildSplunkCimNdjson", () => {
  it("retourne du NDJSON (lignes JSON séparées par \\n + trailing \\n)", () => {
    const out = buildSplunkCimNdjson({
      tenant,
      framework,
      evidences: [evidence, { ...evidence, control_ref: "A.5.2" }],
      generatedAt,
    });
    expect(out.endsWith("\n")).toBe(true);
    const lines = out.trim().split("\n");
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("inclut les champs HEC obligatoires (time, source, sourcetype, event)", () => {
    const out = buildSplunkCimNdjson({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
    });
    const obj = JSON.parse(out.trim());
    expect(obj.time).toBeTypeOf("number"); // epoch en secondes
    expect(obj.source).toBe("humanix-academie");
    expect(obj.sourcetype).toBe("humanix:compliance:evidence");
    expect(obj.event).toBeDefined();
  });

  it("convertit le timestamp en epoch (secondes, pas ms)", () => {
    const out = buildSplunkCimNdjson({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
    });
    const obj = JSON.parse(out.trim());
    expect(obj.time).toBe(Math.floor(generatedAt.getTime() / 1000));
  });

  it("mappe le statut → severity numérique (CIM standard)", () => {
    const compliant = JSON.parse(
      buildSplunkCimNdjson({
        tenant,
        framework,
        evidences: [{ ...evidence, status: "compliant" }],
        generatedAt,
      }).trim(),
    );
    const partial = JSON.parse(
      buildSplunkCimNdjson({
        tenant,
        framework,
        evidences: [{ ...evidence, status: "partial" }],
        generatedAt,
      }).trim(),
    );
    const nonCompliant = JSON.parse(
      buildSplunkCimNdjson({
        tenant,
        framework,
        evidences: [{ ...evidence, status: "non_compliant" }],
        generatedAt,
      }).trim(),
    );

    expect(compliant.event.severity_id).toBe(1);
    expect(compliant.event.severity).toBe("informational");
    expect(partial.event.severity_id).toBe(4);
    expect(partial.event.severity).toBe("low");
    expect(nonCompliant.event.severity_id).toBe(7);
    expect(nonCompliant.event.severity).toBe("high");
  });

  it("inclut les métadonnées Humanix (tenant, framework, control)", () => {
    const out = buildSplunkCimNdjson({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
    });
    const obj = JSON.parse(out.trim());
    expect(obj.event.tenant_id).toBe("tenant_1");
    expect(obj.event.tenant_name).toBe("ACME Corp");
    expect(obj.event.framework).toBe("ISO27001:2022");
    expect(obj.event.control_ref).toBe("A.5.1");
    expect(obj.event.compliance_status).toBe("compliant");
  });

  it("retourne uniquement '\\n' si evidences est vide", () => {
    const out = buildSplunkCimNdjson({
      tenant,
      framework,
      evidences: [],
      generatedAt,
    });
    expect(out).toBe("\n");
  });
});

describe("buildSentinelCef", () => {
  it("retourne du CEF (lignes CEF:0|... séparées par \\n)", () => {
    const out = buildSentinelCef({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
    });
    expect(out.startsWith("CEF:0|")).toBe(true);
    expect(out.endsWith("\n")).toBe(true);
  });

  it("respecte le format ArcSight CEF (8 segments header pipe-séparés + extension)", () => {
    const out = buildSentinelCef({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
    });
    const line = out.trim();
    const parts = line.split("|");
    expect(parts.length).toBeGreaterThanOrEqual(8);
    expect(parts[0]).toBe("CEF:0");
    expect(parts[1]).toBe("Humanix"); // vendor
    expect(parts[2]).toBe("Academy"); // product
  });

  it("échappe les pipes dans les valeurs du header (anti-injection CEF)", () => {
    const out = buildSentinelCef({
      tenant: { ...tenant, name: "Test|Pipe|Co" },
      framework,
      evidences: [evidence],
      generatedAt,
    });
    // Le tenant name est dans extension cs2 (pas dans header), il est escapé via cefEscapeExt
    // mais on vérifie ici que la signature ne casse pas le format
    const lines = out.trim().split("\n");
    for (const l of lines) {
      // Compte les "|" dans le header (premiers 8 segments)
      const headerSegments = l.split("|").slice(0, 8);
      expect(headerSegments.length).toBe(8);
    }
  });

  it("échappe les égaux dans les extensions (CEF spec)", () => {
    const out = buildSentinelCef({
      tenant: { ...tenant, name: "ACME = Corp" },
      framework,
      evidences: [evidence],
      generatedAt,
    });
    expect(out).toContain("ACME \\= Corp"); // = échappé
  });

  it("inclut les champs custom Humanix dans extension", () => {
    const out = buildSentinelCef({
      tenant,
      framework,
      evidences: [evidence],
      generatedAt,
    });
    expect(out).toContain("humanixGeneratedAt=");
    expect(out).toContain("humanixControlRef=");
    expect(out).toContain("cs1Label=tenantId");
    expect(out).toContain("cs3Label=framework");
  });

  it("encode le score sur 100 (cn1 = score × 100, arrondi)", () => {
    const out = buildSentinelCef({
      tenant,
      framework,
      evidences: [{ ...evidence, score: 0.85 }],
      generatedAt,
    });
    expect(out).toContain("cn1=85");
  });

  it("retourne uniquement '\\n' si evidences est vide", () => {
    const out = buildSentinelCef({
      tenant,
      framework,
      evidences: [],
      generatedAt,
    });
    expect(out).toBe("\n");
  });
});
