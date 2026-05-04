// Tests du mapping GRC.
// Critique : un mapping incorrect = surcote artificielle de la conformité
// = audit raté quand le RSSI vérifie. Notre intégrité commerciale en dépend.

import { describe, it, expect } from "vitest";
import {
  FRAMEWORKS,
  SUPPORTED_FRAMEWORKS,
  statusFromMetric,
  isDocumentaryOnly,
  type ControlMapping,
} from "./mapping-grc";

describe("FRAMEWORKS catalog", () => {
  it("expose les 5 référentiels supportés", () => {
    expect(SUPPORTED_FRAMEWORKS).toEqual([
      "ISO27001:2022",
      "NIS2",
      "RGPD",
      "ANSSI-HG",
      "NIST-CSF",
    ]);
  });

  it("FRAMEWORKS et SUPPORTED_FRAMEWORKS sont synchronisés", () => {
    for (const ref of SUPPORTED_FRAMEWORKS) {
      expect(FRAMEWORKS[ref]).toBeDefined();
      expect(FRAMEWORKS[ref].ref).toBe(ref);
    }
  });

  it("chaque framework a au moins 1 contrôle mappé", () => {
    for (const fw of Object.values(FRAMEWORKS)) {
      expect(fw.controls.length).toBeGreaterThan(0);
    }
  });

  it("chaque framework a un titre, éditeur et URL officielle", () => {
    for (const fw of Object.values(FRAMEWORKS)) {
      expect(fw.title).toBeTruthy();
      expect(fw.publisher).toBeTruthy();
      expect(fw.url).toMatch(/^https?:\/\//);
    }
  });

  it("chaque contrôle a au moins un artifact source", () => {
    for (const fw of Object.values(FRAMEWORKS)) {
      for (const c of fw.controls) {
        expect(c.artifacts.length).toBeGreaterThan(0);
      }
    }
  });

  it("les seuils thresholdPartial < thresholdCompliant si présents", () => {
    for (const fw of Object.values(FRAMEWORKS)) {
      for (const c of fw.controls) {
        if (
          c.thresholdCompliant !== undefined &&
          c.thresholdPartial !== undefined
        ) {
          expect(c.thresholdPartial).toBeLessThan(c.thresholdCompliant);
        }
      }
    }
  });

  it("expose ISO 27001 avec la bonne structure (Annexe A)", () => {
    const iso = FRAMEWORKS["ISO27001:2022"];
    expect(iso.publisher).toMatch(/ISO/);
    // ISO 27001 contient 93 contrôles dans la version 2022
    // On ne teste pas le nombre exact (couverture partielle = OK)
    // mais on s'assure que des refs typiques sont présentes
    const refs = iso.controls.map((c) => c.ref);
    const hasAnnexA = refs.some((r) => /^A\.\d/.test(r));
    expect(hasAnnexA).toBe(true);
  });

  it("expose NIS2 avec des refs cohérentes (article 21 §2)", () => {
    const nis2 = FRAMEWORKS["NIS2"];
    const refs = nis2.controls.map((c) => c.ref);
    // NIS2 article 21 §2 (a-j)
    const hasArt21 = refs.some((r) => /art-21|21-2/.test(r.toLowerCase()));
    expect(hasArt21).toBe(true);
  });
});

describe("statusFromMetric", () => {
  const sampleControl: ControlMapping = {
    ref: "TEST.1",
    name: "Test control",
    artifacts: [
      { type: "metric", source: "completion_rate", label: "Taux completion" },
    ],
    thresholdCompliant: 0.7,
    thresholdPartial: 0.4,
  };

  it("retourne 'not_assessed' si la valeur est null/undefined", () => {
    expect(statusFromMetric(null, sampleControl)).toBe("not_assessed");
    expect(statusFromMetric(undefined, sampleControl)).toBe("not_assessed");
  });

  it("retourne 'compliant' si valeur >= seuil compliant", () => {
    expect(statusFromMetric(0.7, sampleControl)).toBe("compliant");
    expect(statusFromMetric(0.95, sampleControl)).toBe("compliant");
    expect(statusFromMetric(1.0, sampleControl)).toBe("compliant");
  });

  it("retourne 'partial' si valeur entre [partial, compliant[", () => {
    expect(statusFromMetric(0.4, sampleControl)).toBe("partial");
    expect(statusFromMetric(0.55, sampleControl)).toBe("partial");
    expect(statusFromMetric(0.69, sampleControl)).toBe("partial");
  });

  it("retourne 'non_compliant' si valeur < seuil partial", () => {
    expect(statusFromMetric(0.39, sampleControl)).toBe("non_compliant");
    expect(statusFromMetric(0.0, sampleControl)).toBe("non_compliant");
  });

  it("retourne 'compliant' si pas de threshold défini (contrôle documentaire)", () => {
    const docOnly: ControlMapping = {
      ref: "DOC.1",
      name: "Documentary",
      artifacts: [{ type: "policy", source: "pack_nis2_pdf", label: "Pack" }],
    };
    // Si une valeur est fournie mais pas de seuil, on considère compliant par défaut
    expect(statusFromMetric(1, docOnly)).toBe("compliant");
  });

  it("ne surcote JAMAIS sans donnée (intégrité Humanix)", () => {
    expect(statusFromMetric(null, sampleControl)).toBe("not_assessed");
    expect(statusFromMetric(undefined, sampleControl)).toBe("not_assessed");
    // ne jamais retourner compliant sans valeur
  });
});

describe("isDocumentaryOnly", () => {
  it("retourne true si TOUS les artifacts sont policy ou document", () => {
    const c: ControlMapping = {
      ref: "X",
      name: "X",
      artifacts: [
        { type: "policy", source: "pack_nis2_pdf", label: "P" },
        { type: "document", source: "dpa_pdf", label: "D" },
      ],
    };
    expect(isDocumentaryOnly(c)).toBe(true);
  });

  it("retourne false si au moins un artifact est metric/report/event_log", () => {
    const withMetric: ControlMapping = {
      ref: "X",
      name: "X",
      artifacts: [
        { type: "policy", source: "pack_nis2_pdf", label: "P" },
        { type: "metric", source: "tenant_score", label: "Score" },
      ],
    };
    expect(isDocumentaryOnly(withMetric)).toBe(false);
  });

  it("retourne true si artifacts vide (vide = vacuously true mais corner case)", () => {
    const empty: ControlMapping = { ref: "X", name: "X", artifacts: [] };
    expect(isDocumentaryOnly(empty)).toBe(true);
  });
});
