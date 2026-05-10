// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  parseBootstrapRole,
  shouldPromote,
  ROLE_RANK,
  BOOTSTRAP_ROLES,
} from "./bootstrap-role";

describe("ROLE_RANK", () => {
  it("LEARNER < MANAGER < RSSI < ADMIN < SUPERADMIN (ordre strict)", () => {
    expect(ROLE_RANK.LEARNER).toBeLessThan(ROLE_RANK.MANAGER);
    expect(ROLE_RANK.MANAGER).toBeLessThan(ROLE_RANK.RSSI);
    expect(ROLE_RANK.RSSI).toBeLessThan(ROLE_RANK.ADMIN);
    expect(ROLE_RANK.ADMIN).toBeLessThan(ROLE_RANK.SUPERADMIN);
  });

  it("SUPERADMIN est le rang le plus eleve", () => {
    const all = Object.values(ROLE_RANK);
    expect(Math.max(...all)).toBe(ROLE_RANK.SUPERADMIN);
  });
});

describe("BOOTSTRAP_ROLES", () => {
  it("contient MANAGER, RSSI, ADMIN, SUPERADMIN", () => {
    expect(BOOTSTRAP_ROLES.has("MANAGER")).toBe(true);
    expect(BOOTSTRAP_ROLES.has("RSSI")).toBe(true);
    expect(BOOTSTRAP_ROLES.has("ADMIN")).toBe(true);
    expect(BOOTSTRAP_ROLES.has("SUPERADMIN")).toBe(true);
  });

  it("EXCLUT LEARNER (jamais bootstrappable)", () => {
    expect(BOOTSTRAP_ROLES.has("LEARNER")).toBe(false);
  });
});

describe("parseBootstrapRole", () => {
  it("retourne SUPERADMIN par defaut (undefined)", () => {
    expect(parseBootstrapRole(undefined)).toBe("SUPERADMIN");
  });

  it("retourne SUPERADMIN pour chaine vide", () => {
    expect(parseBootstrapRole("")).toBe("SUPERADMIN");
    expect(parseBootstrapRole("   ")).toBe("SUPERADMIN");
  });

  it("retourne SUPERADMIN pour valeur inconnue", () => {
    expect(parseBootstrapRole("HACKER")).toBe("SUPERADMIN");
    expect(parseBootstrapRole("root")).toBe("SUPERADMIN");
  });

  it("retourne SUPERADMIN si LEARNER demande (pas autorise en bootstrap)", () => {
    expect(parseBootstrapRole("LEARNER")).toBe("SUPERADMIN");
    expect(parseBootstrapRole("learner")).toBe("SUPERADMIN");
  });

  it("parse les valeurs valides en respectant la casse", () => {
    expect(parseBootstrapRole("MANAGER")).toBe("MANAGER");
    expect(parseBootstrapRole("RSSI")).toBe("RSSI");
    expect(parseBootstrapRole("ADMIN")).toBe("ADMIN");
    expect(parseBootstrapRole("SUPERADMIN")).toBe("SUPERADMIN");
  });

  it("normalise la casse mixte (admin -> ADMIN)", () => {
    expect(parseBootstrapRole("admin")).toBe("ADMIN");
    expect(parseBootstrapRole("Admin")).toBe("ADMIN");
    expect(parseBootstrapRole("AdMiN")).toBe("ADMIN");
  });

  it("trim les espaces", () => {
    expect(parseBootstrapRole("  ADMIN  ")).toBe("ADMIN");
    expect(parseBootstrapRole("\tRSSI\n")).toBe("RSSI");
  });
});

describe("shouldPromote", () => {
  it("promote si current < target", () => {
    expect(shouldPromote("LEARNER", "ADMIN")).toBe(true);
    expect(shouldPromote("ADMIN", "SUPERADMIN")).toBe(true);
    expect(shouldPromote("MANAGER", "RSSI")).toBe(true);
  });

  it("ne promote PAS si current == target (idempotence)", () => {
    expect(shouldPromote("ADMIN", "ADMIN")).toBe(false);
    expect(shouldPromote("SUPERADMIN", "SUPERADMIN")).toBe(false);
  });

  it("ne promote PAS si current > target (jamais de regression)", () => {
    expect(shouldPromote("SUPERADMIN", "ADMIN")).toBe(false);
    expect(shouldPromote("ADMIN", "MANAGER")).toBe(false);
    expect(shouldPromote("RSSI", "LEARNER")).toBe(false);
  });

  it("le bootstrap est SAFE : un SUPERADMIN ne sera jamais retrograde", () => {
    // Cas concret : admin lance bootstrap avec BOOTSTRAP_ADMIN_ROLE=ADMIN
    // alors que l'user est deja SUPERADMIN. Le bootstrap ne doit pas le casser.
    expect(shouldPromote("SUPERADMIN", "ADMIN")).toBe(false);
  });
});
