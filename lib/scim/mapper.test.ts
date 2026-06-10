// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du mapper SCIM ↔ Prisma.
// Critique : SCIM est l'interface de provisioning enterprise (Entra, Okta).
// Une regression ici = Active Directory ne sync plus = client enterprise furieux.
// Conformité RFC 7643/7644.

import { describe, it, expect } from "vitest";
import {
  prismaToScim,
  scimToPrismaCreate,
  applyScimPatch,
  coerceScimRole,
} from "./mapper";
import { SCIM_SCHEMAS } from "./types";

const HUMANIX_EXT = SCIM_SCHEMAS.HUMANIX_USER;

const samplePrismaUser = {
  id: "user_123",
  email: "florian@humanix.fr",
  name: "Florian DURANO",
  role: "ADMIN",
  service: "Direction",
  isActive: true,
  createdAt: new Date("2026-01-15T10:00:00Z"),
  updatedAt: new Date("2026-05-04T12:30:00Z"),
};

describe("prismaToScim", () => {
  it("expose les schémas obligatoires (Core User + extension Humanix)", () => {
    const scim = prismaToScim(samplePrismaUser, "https://academie.humanix.fr");
    expect(scim.schemas).toContain(SCIM_SCHEMAS.USER);
    expect(scim.schemas).toContain(HUMANIX_EXT);
  });

  it("mappe id, userName, email, displayName correctement", () => {
    const scim = prismaToScim(samplePrismaUser, "https://academie.humanix.fr");
    expect(scim.id).toBe("user_123");
    expect(scim.userName).toBe("florian@humanix.fr");
    expect(scim.displayName).toBe("Florian DURANO");
    expect(scim.emails?.[0].value).toBe("florian@humanix.fr");
    expect(scim.emails?.[0].primary).toBe(true);
    expect(scim.emails?.[0].type).toBe("work");
  });

  it("découpe le nom en givenName / familyName (RFC 7643 §4.1.2)", () => {
    const scim = prismaToScim(samplePrismaUser, "https://academie.humanix.fr");
    expect(scim.name?.givenName).toBe("Florian");
    expect(scim.name?.familyName).toBe("DURANO");
    expect(scim.name?.formatted).toBe("Florian DURANO");
  });

  it("gère un nom mononym (un seul mot)", () => {
    const scim = prismaToScim(
      { ...samplePrismaUser, name: "Madonna" },
      "https://academie.humanix.fr",
    );
    expect(scim.name?.givenName).toBe("Madonna");
    expect(scim.name?.familyName).toBeUndefined();
  });

  it("gère un nom null (utilise email comme displayName)", () => {
    const scim = prismaToScim(
      { ...samplePrismaUser, name: null },
      "https://academie.humanix.fr",
    );
    expect(scim.displayName).toBe("florian@humanix.fr");
    expect(scim.name).toBeUndefined();
  });

  it("expose role et service dans l'extension Humanix", () => {
    const scim = prismaToScim(samplePrismaUser, "https://academie.humanix.fr");
    const ext = (scim as Record<string, unknown>)[HUMANIX_EXT] as {
      role: string;
      service: string;
    };
    expect(ext.role).toBe("ADMIN");
    expect(ext.service).toBe("Direction");
  });

  it("inclut un meta.location pointant vers l'API SCIM", () => {
    const scim = prismaToScim(samplePrismaUser, "https://api.humanix.fr");
    expect(scim.meta?.location).toBe(
      "https://api.humanix.fr/scim/v2/Users/user_123",
    );
    expect(scim.meta?.resourceType).toBe("User");
  });

  it("inclut un version ETag basé sur updatedAt (concurrence optimiste)", () => {
    const scim = prismaToScim(samplePrismaUser, "https://api.humanix.fr");
    expect(scim.meta?.version).toMatch(/^W\/"\d+"$/);
  });
});

describe("coerceScimRole (anti-escalade SUPERADMIN via IdP)", () => {
  it("accepte les roles tenant standards", () => {
    expect(coerceScimRole("LEARNER")).toBe("LEARNER");
    expect(coerceScimRole("manager")).toBe("MANAGER");
    expect(coerceScimRole("Rssi")).toBe("RSSI");
    expect(coerceScimRole("ADMIN")).toBe("ADMIN");
  });

  it("RETROGRADE SUPERADMIN en LEARNER (jamais provisionnable par un IdP)", () => {
    expect(coerceScimRole("SUPERADMIN")).toBe("LEARNER");
    expect(coerceScimRole("superadmin")).toBe("LEARNER");
  });

  it("retombe sur LEARNER pour toute valeur inconnue ou non-string", () => {
    expect(coerceScimRole("root")).toBe("LEARNER");
    expect(coerceScimRole("")).toBe("LEARNER");
    expect(coerceScimRole(undefined)).toBe("LEARNER");
    expect(coerceScimRole(42)).toBe("LEARNER");
  });

  it("un payload SCIM tentant SUPERADMIN ne cree pas un SUPERADMIN", () => {
    const created = scimToPrismaCreate({
      userName: "evil@acme.fr",
      [HUMANIX_EXT]: { role: "SUPERADMIN" },
    });
    expect(created?.role).toBe("LEARNER");
  });

  it("un PATCH tentant SUPERADMIN est neutralise", () => {
    const update = applyScimPatch(samplePrismaUser, [
      {
        op: "replace",
        path: `${HUMANIX_EXT}:role`,
        value: "SUPERADMIN",
      },
    ]);
    expect(update.role).toBe("LEARNER");
  });
});

describe("scimToPrismaCreate", () => {
  it("retourne null si payload null/undefined/non-objet", () => {
    expect(scimToPrismaCreate(null)).toBe(null);
    expect(scimToPrismaCreate(undefined)).toBe(null);
    expect(scimToPrismaCreate("string")).toBe(null);
    expect(scimToPrismaCreate(42)).toBe(null);
  });

  it("retourne null si userName manquant", () => {
    expect(scimToPrismaCreate({ emails: [] })).toBe(null);
  });

  it("crée un user avec userName comme email si pas d'emails fournis", () => {
    const r = scimToPrismaCreate({ userName: "user@example.com" });
    expect(r).not.toBe(null);
    expect(r?.email).toBe("user@example.com");
  });

  it("préfère l'email primary à l'userName", () => {
    const r = scimToPrismaCreate({
      userName: "login_id",
      emails: [
        { value: "alt@example.com", primary: false },
        { value: "primary@example.com", primary: true },
      ],
    });
    expect(r?.email).toBe("primary@example.com");
  });

  it("extrait le displayName en priorité", () => {
    const r = scimToPrismaCreate({
      userName: "user@x.fr",
      displayName: "Alice Dupont",
      name: { givenName: "Alice", familyName: "Dupont" },
    });
    expect(r?.name).toBe("Alice Dupont");
  });

  it("fallback sur name.formatted puis givenName + familyName", () => {
    const r1 = scimToPrismaCreate({
      userName: "u@x.fr",
      name: { formatted: "John Doe" },
    });
    expect(r1?.name).toBe("John Doe");

    const r2 = scimToPrismaCreate({
      userName: "u@x.fr",
      name: { givenName: "Jane", familyName: "Smith" },
    });
    expect(r2?.name).toBe("Jane Smith");
  });

  it("active=true par défaut si non fourni", () => {
    const r = scimToPrismaCreate({ userName: "u@x.fr" });
    expect(r?.isActive).toBe(true);
  });

  it("active=false si explicitement passé", () => {
    const r = scimToPrismaCreate({ userName: "u@x.fr", active: false });
    expect(r?.isActive).toBe(false);
  });

  it("role par défaut LEARNER si extension absente", () => {
    const r = scimToPrismaCreate({ userName: "u@x.fr" });
    expect(r?.role).toBe("LEARNER");
  });

  it("extrait role + service de l'extension Humanix", () => {
    const r = scimToPrismaCreate({
      userName: "u@x.fr",
      [HUMANIX_EXT]: { role: "MANAGER", service: "RH" },
    });
    expect(r?.role).toBe("MANAGER");
    expect(r?.service).toBe("RH");
  });
});

describe("applyScimPatch", () => {
  it("op:replace active=false → isActive: false", () => {
    const update = applyScimPatch(samplePrismaUser, [
      { op: "replace", path: "active", value: false },
    ]);
    expect(update.isActive).toBe(false);
  });

  it("op:remove active → isActive: false", () => {
    const update = applyScimPatch(samplePrismaUser, [
      { op: "remove", path: "active" },
    ]);
    expect(update.isActive).toBe(false);
  });

  it("op:replace displayName → name", () => {
    const update = applyScimPatch(samplePrismaUser, [
      { op: "replace", path: "displayName", value: "New Name" },
    ]);
    expect(update.name).toBe("New Name");
  });

  it("op:replace userName → email", () => {
    const update = applyScimPatch(samplePrismaUser, [
      { op: "replace", path: "userName", value: "new@x.fr" },
    ]);
    expect(update.email).toBe("new@x.fr");
  });

  it("op:replace sur extension role", () => {
    const path = `${HUMANIX_EXT}:role`;
    const update = applyScimPatch(samplePrismaUser, [
      { op: "replace", path, value: "MANAGER" },
    ]);
    expect(update.role).toBe("MANAGER");
  });

  it("op:replace sur extension service", () => {
    const path = `${HUMANIX_EXT}:service`;
    const update = applyScimPatch(samplePrismaUser, [
      { op: "replace", path, value: "Compta" },
    ]);
    expect(update.service).toBe("Compta");
  });

  it("PATCH bulk sans path : extrait les champs du value", () => {
    const update = applyScimPatch(samplePrismaUser, [
      {
        op: "replace",
        value: {
          active: false,
          displayName: "Bulk Name",
          [HUMANIX_EXT]: { role: "ADMIN" },
        },
      },
    ]);
    expect(update.isActive).toBe(false);
    expect(update.name).toBe("Bulk Name");
    expect(update.role).toBe("ADMIN");
  });

  it("ignore les paths non supportés sans crasher", () => {
    const update = applyScimPatch(samplePrismaUser, [
      { op: "replace", path: "x509Certificates", value: "ignored" },
      { op: "replace", path: "phoneNumbers", value: "+33..." },
    ]);
    expect(update).toEqual({});
  });

  it("traite plusieurs ops dans l'ordre (dernière gagne sur conflit)", () => {
    const update = applyScimPatch(samplePrismaUser, [
      { op: "replace", path: "displayName", value: "First" },
      { op: "replace", path: "displayName", value: "Last" },
    ]);
    expect(update.name).toBe("Last");
  });

  it("op:add traité comme replace (idempotence SCIM)", () => {
    const update = applyScimPatch(samplePrismaUser, [
      { op: "add", path: "active", value: true },
    ]);
    expect(update.isActive).toBe(true);
  });
});
