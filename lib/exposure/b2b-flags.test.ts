// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests de la TRIPLE GARDE de la veille B2B. C'est la barriere de securite la
// plus critique du module (cf. b2b-flags.ts) : on verifie qu'elle reste FERMEE
// au moindre maillon manquant, et qu'elle ne s'ouvre QUE lorsque les trois
// conditions sont reunies + un domaine declare.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isB2bGloballyEnabled,
  isB2bMonitoringActive,
  monitoringBlockedReason,
} from "./b2b-flags";

const ENV_KEY = "EXPOSURE_B2B_ENABLED";
const originalEnv = process.env[ENV_KEY];

function setGlobal(on: boolean) {
  if (on) process.env[ENV_KEY] = "true";
  else delete process.env[ENV_KEY];
}

// Tenant pleinement conforme (les 3 conditions + 1 domaine).
const fullyConfigured = {
  exposureMonitoringEnabled: true,
  exposureMonitoringDpaSignedAt: new Date("2026-01-01T00:00:00Z"),
  exposureDomains: ["acme.fr"],
};

afterEach(() => {
  if (originalEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalEnv;
});

describe("isB2bGloballyEnabled (kill switch plateforme)", () => {
  it("false si l'env est absente", () => {
    setGlobal(false);
    expect(isB2bGloballyEnabled()).toBe(false);
  });

  it('false si l\'env n\'est pas exactement "true"', () => {
    process.env[ENV_KEY] = "1";
    expect(isB2bGloballyEnabled()).toBe(false);
    process.env[ENV_KEY] = "yes";
    expect(isB2bGloballyEnabled()).toBe(false);
    process.env[ENV_KEY] = "TRUE";
    expect(isB2bGloballyEnabled()).toBe(false);
  });

  it('true uniquement si l\'env vaut "true"', () => {
    setGlobal(true);
    expect(isB2bGloballyEnabled()).toBe(true);
  });
});

describe("isB2bMonitoringActive (triple garde)", () => {
  beforeEach(() => setGlobal(true)); // on part global ON pour tester le reste

  it("active quand TOUTES les conditions sont reunies", () => {
    expect(isB2bMonitoringActive(fullyConfigured)).toBe(true);
  });

  it("FERMEE si le kill switch plateforme est OFF, meme tenant conforme", () => {
    setGlobal(false);
    expect(isB2bMonitoringActive(fullyConfigured)).toBe(false);
  });

  it("FERMEE si le tenant n'a pas opte-in", () => {
    expect(
      isB2bMonitoringActive({
        ...fullyConfigured,
        exposureMonitoringEnabled: false,
      }),
    ).toBe(false);
  });

  it("FERMEE si le DPA n'est pas signe (gate legal)", () => {
    expect(
      isB2bMonitoringActive({
        ...fullyConfigured,
        exposureMonitoringDpaSignedAt: null,
      }),
    ).toBe(false);
  });

  it("FERMEE si aucun domaine declare", () => {
    expect(
      isB2bMonitoringActive({ ...fullyConfigured, exposureDomains: [] }),
    ).toBe(false);
  });
});

describe("monitoringBlockedReason (message UI)", () => {
  it("renvoie la raison plateforme si kill switch OFF", () => {
    setGlobal(false);
    expect(monitoringBlockedReason(fullyConfigured)).toMatch(/plateforme/i);
  });

  it("renvoie null quand la veille est pleinement active", () => {
    setGlobal(true);
    expect(monitoringBlockedReason(fullyConfigured)).toBeNull();
  });

  it("pointe le maillon manquant (DPA) quand global ON mais DPA absent", () => {
    setGlobal(true);
    expect(
      monitoringBlockedReason({
        ...fullyConfigured,
        exposureMonitoringDpaSignedAt: null,
      }),
    ).toMatch(/DPA/);
  });
});
