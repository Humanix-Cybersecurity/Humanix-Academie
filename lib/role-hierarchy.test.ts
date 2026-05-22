// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";
import {
  canModifyRoleOf,
  canAssignRole,
  getAssignableRoles,
  assertCanChangeRole,
  assertCanActOn,
  ROLE_RANK,
} from "./role-hierarchy";

describe("ROLE_RANK", () => {
  it("ordre croissant attendu : LEARNER < MANAGER < RSSI < ADMIN < SUPERADMIN", () => {
    expect(ROLE_RANK.LEARNER).toBeLessThan(ROLE_RANK.MANAGER);
    expect(ROLE_RANK.MANAGER).toBeLessThan(ROLE_RANK.RSSI);
    expect(ROLE_RANK.RSSI).toBeLessThan(ROLE_RANK.ADMIN);
    expect(ROLE_RANK.ADMIN).toBeLessThan(ROLE_RANK.SUPERADMIN);
  });
});

describe("canModifyRoleOf", () => {
  it("SUPERADMIN peut modifier tout le monde sauf un autre SUPERADMIN", () => {
    expect(canModifyRoleOf("SUPERADMIN", "LEARNER")).toBe(true);
    expect(canModifyRoleOf("SUPERADMIN", "MANAGER")).toBe(true);
    expect(canModifyRoleOf("SUPERADMIN", "RSSI")).toBe(true);
    expect(canModifyRoleOf("SUPERADMIN", "ADMIN")).toBe(true);
    expect(canModifyRoleOf("SUPERADMIN", "SUPERADMIN")).toBe(false);
  });

  it("ADMIN peut modifier MANAGER/RSSI/LEARNER mais pas ADMIN/SUPERADMIN", () => {
    expect(canModifyRoleOf("ADMIN", "LEARNER")).toBe(true);
    expect(canModifyRoleOf("ADMIN", "MANAGER")).toBe(true);
    expect(canModifyRoleOf("ADMIN", "RSSI")).toBe(true);
    expect(canModifyRoleOf("ADMIN", "ADMIN")).toBe(false);
    expect(canModifyRoleOf("ADMIN", "SUPERADMIN")).toBe(false);
  });

  it("MANAGER ne peut modifier QUE LEARNER", () => {
    expect(canModifyRoleOf("MANAGER", "LEARNER")).toBe(true);
    expect(canModifyRoleOf("MANAGER", "MANAGER")).toBe(false);
    expect(canModifyRoleOf("MANAGER", "RSSI")).toBe(false);
    expect(canModifyRoleOf("MANAGER", "ADMIN")).toBe(false);
    expect(canModifyRoleOf("MANAGER", "SUPERADMIN")).toBe(false);
  });

  it("LEARNER ne peut rien modifier", () => {
    expect(canModifyRoleOf("LEARNER", "LEARNER")).toBe(false);
    expect(canModifyRoleOf("LEARNER", "MANAGER")).toBe(false);
    expect(canModifyRoleOf("LEARNER", "SUPERADMIN")).toBe(false);
  });
});

describe("canAssignRole", () => {
  it("permet l'egalite : un ADMIN peut promouvoir vers ADMIN", () => {
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(true);
    expect(canAssignRole("MANAGER", "MANAGER")).toBe(true);
  });

  it("interdit promotion au-dessus de soi : ADMIN ne peut pas creer un SUPERADMIN", () => {
    expect(canAssignRole("ADMIN", "SUPERADMIN")).toBe(false);
    expect(canAssignRole("RSSI", "ADMIN")).toBe(false);
    expect(canAssignRole("MANAGER", "RSSI")).toBe(false);
  });

  it("SUPERADMIN peut tout assigner", () => {
    expect(canAssignRole("SUPERADMIN", "LEARNER")).toBe(true);
    expect(canAssignRole("SUPERADMIN", "SUPERADMIN")).toBe(true);
  });
});

describe("getAssignableRoles", () => {
  it("SUPERADMIN voit tous les roles", () => {
    expect(getAssignableRoles("SUPERADMIN")).toEqual([
      "LEARNER",
      "MANAGER",
      "RSSI",
      "ADMIN",
      "SUPERADMIN",
    ]);
  });

  it("ADMIN ne voit pas SUPERADMIN dans les options", () => {
    const opts = getAssignableRoles("ADMIN");
    expect(opts).toContain("ADMIN");
    expect(opts).not.toContain("SUPERADMIN");
    expect(opts).toEqual(["LEARNER", "MANAGER", "RSSI", "ADMIN"]);
  });

  it("MANAGER ne peut promouvoir que vers LEARNER ou MANAGER", () => {
    expect(getAssignableRoles("MANAGER")).toEqual(["LEARNER", "MANAGER"]);
  });

  it("LEARNER ne peut rien assigner sauf LEARNER (sans aucun pouvoir reel)", () => {
    expect(getAssignableRoles("LEARNER")).toEqual(["LEARNER"]);
  });
});

describe("assertCanChangeRole", () => {
  it("OK : ADMIN promeut un LEARNER en MANAGER", () => {
    expect(() => assertCanChangeRole("ADMIN", "LEARNER", "MANAGER")).not.toThrow();
  });

  it("OK : ADMIN retrograde un RSSI en LEARNER", () => {
    expect(() => assertCanChangeRole("ADMIN", "RSSI", "LEARNER")).not.toThrow();
  });

  it("KO : ADMIN essaie de promouvoir un LEARNER en SUPERADMIN (privilege escalation)", () => {
    expect(() =>
      assertCanChangeRole("ADMIN", "LEARNER", "SUPERADMIN"),
    ).toThrow("forbidden_role_hierarchy");
  });

  it("KO : ADMIN essaie de modifier un SUPERADMIN", () => {
    expect(() =>
      assertCanChangeRole("ADMIN", "SUPERADMIN", "ADMIN"),
    ).toThrow("forbidden_role_hierarchy");
  });

  it("KO : MANAGER essaie de modifier un ADMIN (cas signale par Florian 2026-05-22)", () => {
    expect(() =>
      assertCanChangeRole("MANAGER", "ADMIN", "LEARNER"),
    ).toThrow("forbidden_role_hierarchy");
  });

  it("KO : MANAGER essaie de modifier un SUPERADMIN", () => {
    expect(() =>
      assertCanChangeRole("MANAGER", "SUPERADMIN", "LEARNER"),
    ).toThrow("forbidden_role_hierarchy");
  });
});

describe("assertCanActOn", () => {
  it("OK : ADMIN suspend un MANAGER", () => {
    expect(() => assertCanActOn("ADMIN", "MANAGER")).not.toThrow();
  });

  it("KO : ADMIN essaie de suspendre un SUPERADMIN", () => {
    expect(() => assertCanActOn("ADMIN", "SUPERADMIN")).toThrow(
      "forbidden_role_hierarchy",
    );
  });

  it("KO : ADMIN essaie de suspendre un autre ADMIN", () => {
    expect(() => assertCanActOn("ADMIN", "ADMIN")).toThrow(
      "forbidden_role_hierarchy",
    );
  });
});
