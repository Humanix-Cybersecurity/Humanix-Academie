// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectPII,
  generateSmishingScript,
  isMistralEnabled,
  type SmishingTemplate,
} from "./script-generator";

describe("smishing detectPII", () => {
  it("rejette un email", () => {
    expect(detectPII("contact j.dupont@acme.fr aujourd'hui")).toMatch(/Donn/);
  });
  it("rejette un SIRET", () => {
    expect(detectPII("SIRET 12345678901234")).toMatch(/Donn/);
  });
  it("rejette un SIREN", () => {
    expect(detectPII("Notre SIREN est 123456789 visible")).toMatch(/Donn/);
  });
  it("rejette un numero FR national", () => {
    expect(detectPII("appelle au 01 23 45 67 89")).toMatch(/Donn/);
    expect(detectPII("06.12.34.56.78 c'est urgent")).toMatch(/Donn/);
  });
  it("rejette un numero FR international", () => {
    expect(detectPII("0033123456789")).toMatch(/Donn/);
    expect(detectPII("+33 6 12 34 56 78")).toMatch(/Donn/);
  });
  it("accepte un texte propre", () => {
    expect(detectPII("Faux livreur sur compta, niveau medium")).toBeNull();
  });
});

describe("smishing isMistralEnabled", () => {
  let envSnapshot: NodeJS.ProcessEnv;
  beforeEach(() => {
    envSnapshot = { ...process.env };
  });
  afterEach(() => {
    process.env = envSnapshot;
  });
  it("false sans cle", () => {
    delete process.env.MISTRAL_API_KEY;
    expect(isMistralEnabled()).toBe(false);
  });
  it("true avec cle", () => {
    process.env.MISTRAL_API_KEY = "test_key";
    expect(isMistralEnabled()).toBe(true);
  });
});

describe("smishing generateSmishingScript (DEMO_MODE)", () => {
  let envSnapshot: NodeJS.ProcessEnv;
  beforeEach(() => {
    envSnapshot = { ...process.env };
    process.env.DEMO_MODE = "true";
    delete process.env.MISTRAL_API_KEY;
  });
  afterEach(() => {
    process.env = envSnapshot;
  });

  const templates: SmishingTemplate[] = [
    "fake-livreur",
    "fake-banque",
    "fake-impots",
    "fake-2fa",
    "fake-president",
  ];
  templates.forEach((template) => {
    it(`fixture ${template} a un marqueur FORMATION et 3+ red flags`, async () => {
      const script = await generateSmishingScript({
        template,
        service: "Compta",
        difficulty: "medium",
      });
      expect(script.smsBody).toContain("[FORMATION HUMANIX]");
      expect(script.redFlags.length).toBeGreaterThanOrEqual(3);
      expect(script.goodReflex).toBeTruthy();
      expect(script.spoofedSender).toBeTruthy();
    });
  });

  it("rejette un contexte avec PII", async () => {
    await expect(
      generateSmishingScript({
        template: "fake-livreur",
        service: "Compta",
        difficulty: "medium",
        context: "Mon numero perso 06 12 34 56 78",
      }),
    ).rejects.toThrow(/Donn/);
  });
});
