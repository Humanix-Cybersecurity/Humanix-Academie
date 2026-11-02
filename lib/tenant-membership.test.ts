// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests purs des helpers tenant-membership. Le module Prisma est mocke
// pour rester deterministe et rapide (pas de BDD reelle).

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Prisma BEFORE importing the module under test
const mockUser = vi.fn();
const mockMembershipFindUnique = vi.fn();
const mockMembershipFindMany = vi.fn();
const mockUserFindMany = vi.fn();
const mockTenantFindMany = vi.fn();
const mockTenantFindUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockUser(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    tenantMembership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
      findMany: (...args: unknown[]) => mockMembershipFindMany(...args),
    },
    tenant: {
      findMany: (...args: unknown[]) => mockTenantFindMany(...args),
      findUnique: (...args: unknown[]) => mockTenantFindUnique(...args),
    },
  },
}));

import {
  getEffectiveRole,
  canActAsAdminInTenant,
  hasTenantAccess,
  listTenantAdmins,
} from "./tenant-membership";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEffectiveRole", () => {
  it("renvoie null si user introuvable", async () => {
    mockUser.mockResolvedValueOnce(null);
    expect(await getEffectiveRole("u1", "t1")).toBeNull();
  });

  it("renvoie null si user inactif", async () => {
    mockUser.mockResolvedValueOnce({
      role: "ADMIN",
      tenantId: "t1",
      isActive: false,
    });
    expect(await getEffectiveRole("u1", "t1")).toBeNull();
  });

  it("renvoie SUPERADMIN pour un SUPERADMIN, quel que soit le tenant", async () => {
    mockUser.mockResolvedValueOnce({
      role: "SUPERADMIN",
      tenantId: "humanix-tenant",
      isActive: true,
    });
    expect(await getEffectiveRole("u1", "any-tenant")).toBe("SUPERADMIN");
  });

  it("renvoie user.role si user est natif du tenant", async () => {
    mockUser.mockResolvedValueOnce({
      role: "ADMIN",
      tenantId: "t1",
      isActive: true,
    });
    expect(await getEffectiveRole("u1", "t1")).toBe("ADMIN");
  });

  it("cherche TenantMembership si user n'est PAS natif", async () => {
    mockUser.mockResolvedValueOnce({
      role: "MANAGER",
      tenantId: "humanix-tenant",
      isActive: true,
    });
    mockMembershipFindUnique.mockResolvedValueOnce({ role: "ADMIN" });
    expect(await getEffectiveRole("u1", "client-tenant")).toBe("ADMIN");
    expect(mockMembershipFindUnique).toHaveBeenCalledWith({
      where: { userId_tenantId: { userId: "u1", tenantId: "client-tenant" } },
      select: { role: true },
    });
  });

  it("renvoie null si user pas natif et pas de membership", async () => {
    mockUser.mockResolvedValueOnce({
      role: "MANAGER",
      tenantId: "humanix-tenant",
      isActive: true,
    });
    mockMembershipFindUnique.mockResolvedValueOnce(null);
    expect(await getEffectiveRole("u1", "client-tenant")).toBeNull();
  });
});

describe("canActAsAdminInTenant", () => {
  it("true pour SUPERADMIN", async () => {
    mockUser.mockResolvedValueOnce({
      role: "SUPERADMIN",
      tenantId: "any",
      isActive: true,
    });
    expect(await canActAsAdminInTenant("u1", "any")).toBe(true);
  });

  it("true pour ADMIN natif", async () => {
    mockUser.mockResolvedValueOnce({
      role: "ADMIN",
      tenantId: "t1",
      isActive: true,
    });
    expect(await canActAsAdminInTenant("u1", "t1")).toBe(true);
  });

  it("true pour MANAGER natif", async () => {
    mockUser.mockResolvedValueOnce({
      role: "MANAGER",
      tenantId: "t1",
      isActive: true,
    });
    expect(await canActAsAdminInTenant("u1", "t1")).toBe(true);
  });

  it("false pour LEARNER natif", async () => {
    mockUser.mockResolvedValueOnce({
      role: "LEARNER",
      tenantId: "t1",
      isActive: true,
    });
    expect(await canActAsAdminInTenant("u1", "t1")).toBe(false);
  });

  it("true pour user externe avec membership ADMIN", async () => {
    mockUser.mockResolvedValueOnce({
      role: "MANAGER",
      tenantId: "home",
      isActive: true,
    });
    mockMembershipFindUnique.mockResolvedValueOnce({ role: "ADMIN" });
    expect(await canActAsAdminInTenant("u1", "other")).toBe(true);
  });

  it("false pour user externe sans membership", async () => {
    mockUser.mockResolvedValueOnce({
      role: "MANAGER",
      tenantId: "home",
      isActive: true,
    });
    mockMembershipFindUnique.mockResolvedValueOnce(null);
    expect(await canActAsAdminInTenant("u1", "other")).toBe(false);
  });
});

describe("hasTenantAccess", () => {
  it("true pour SUPERADMIN partout", async () => {
    mockUser.mockResolvedValueOnce({
      role: "SUPERADMIN",
      tenantId: "x",
      isActive: true,
    });
    expect(await hasTenantAccess("u1", "any-tenant")).toBe(true);
  });

  it("true pour LEARNER natif (acces de base)", async () => {
    mockUser.mockResolvedValueOnce({
      role: "LEARNER",
      tenantId: "t1",
      isActive: true,
    });
    expect(await hasTenantAccess("u1", "t1")).toBe(true);
  });

  it("false pour user externe sans membership", async () => {
    mockUser.mockResolvedValueOnce({
      role: "LEARNER",
      tenantId: "home",
      isActive: true,
    });
    mockMembershipFindUnique.mockResolvedValueOnce(null);
    expect(await hasTenantAccess("u1", "other")).toBe(false);
  });
});

describe("listTenantAdmins", () => {
  it("retourne un tableau vide si aucun admin", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockMembershipFindMany.mockResolvedValueOnce([]);
    expect(await listTenantAdmins("t1")).toEqual([]);
  });

  it("merge natifs + externes avec source et homeTenantName", async () => {
    mockUserFindMany.mockResolvedValueOnce([
      {
        id: "u1",
        email: "admin@acme.fr",
        name: "Admin Acme",
        role: "ADMIN",
        isActive: true,
      },
    ]);
    mockMembershipFindMany.mockResolvedValueOnce([
      {
        role: "ADMIN",
        grantedBy: "super-u",
        grantedAt: new Date("2026-05-23"),
        user: {
          id: "u2",
          email: "florian@humanix.fr",
          name: "Florian",
          tenantId: "humanix",
          isActive: true,
        },
      },
    ]);
    mockTenantFindMany.mockResolvedValueOnce([
      { id: "humanix", name: "Humanix" },
    ]);

    const result = await listTenantAdmins("t1");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      userId: "u1",
      email: "admin@acme.fr",
      effectiveRole: "ADMIN",
      source: "native",
      homeTenantName: null,
    });
    expect(result[1]).toMatchObject({
      userId: "u2",
      email: "florian@humanix.fr",
      effectiveRole: "ADMIN",
      source: "external",
      homeTenantId: "humanix",
      homeTenantName: "Humanix",
    });
  });

  it("trie natifs avant externes", async () => {
    mockUserFindMany.mockResolvedValueOnce([
      {
        id: "u-native",
        email: "z@acme.fr",
        name: null,
        role: "MANAGER",
        isActive: true,
      },
    ]);
    mockMembershipFindMany.mockResolvedValueOnce([
      {
        role: "ADMIN",
        grantedBy: null,
        grantedAt: new Date(),
        user: {
          id: "u-ext",
          email: "a@humanix.fr",
          name: null,
          tenantId: "humanix",
          isActive: true,
        },
      },
    ]);
    mockTenantFindMany.mockResolvedValueOnce([
      { id: "humanix", name: "Humanix" },
    ]);

    const result = await listTenantAdmins("t1");
    expect(result[0].source).toBe("native");
    expect(result[1].source).toBe("external");
  });

  it("dans les natifs, trie par rang descendant (ADMIN avant MANAGER)", async () => {
    mockUserFindMany.mockResolvedValueOnce([
      {
        id: "m1",
        email: "m@acme.fr",
        name: null,
        role: "MANAGER",
        isActive: true,
      },
      {
        id: "a1",
        email: "a@acme.fr",
        name: null,
        role: "ADMIN",
        isActive: true,
      },
    ]);
    mockMembershipFindMany.mockResolvedValueOnce([]);
    mockTenantFindMany.mockResolvedValueOnce([]);

    const result = await listTenantAdmins("t1");
    expect(result[0].effectiveRole).toBe("ADMIN");
    expect(result[1].effectiveRole).toBe("MANAGER");
  });
});

// ---------------------------------------------------------------------------
// Gestion deleguee (Tenant.parentManaged, 2026-11-02) : les ADMIN et RSSI de
// l'espace parent administrent l'enfant qui porte l'indicateur, avec leur
// role d'origine. Aucune ligne TenantMembership : l'indicateur est la seule
// source, ce qui le rend revocable d'un geste.
// ---------------------------------------------------------------------------
describe("getEffectiveRole : gestion deleguee par le parent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMembershipFindUnique.mockResolvedValue(null);
  });

  it("un ADMIN du parent a son role dans l'enfant qui porte l'indicateur", async () => {
    mockUser.mockResolvedValueOnce({
      role: "ADMIN",
      tenantId: "parent",
      isActive: true,
    });
    mockTenantFindUnique.mockResolvedValueOnce({
      parentTenantId: "parent",
      parentManaged: true,
    });
    expect(await getEffectiveRole("u1", "enfant")).toBe("ADMIN");
    expect(mockTenantFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "enfant" } }),
    );
  });

  it("un RSSI du parent aussi, avec son role", async () => {
    mockUser.mockResolvedValueOnce({
      role: "RSSI",
      tenantId: "parent",
      isActive: true,
    });
    mockTenantFindUnique.mockResolvedValueOnce({
      parentTenantId: "parent",
      parentManaged: true,
    });
    expect(await getEffectiveRole("u1", "enfant")).toBe("RSSI");
  });

  it("pas un MANAGER du parent : la delegation est une responsabilite d'administration", async () => {
    mockUser.mockResolvedValueOnce({
      role: "MANAGER",
      tenantId: "parent",
      isActive: true,
    });
    expect(await getEffectiveRole("u1", "enfant")).toBeNull();
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
  });

  it("rien sans l'indicateur sur l'enfant", async () => {
    mockUser.mockResolvedValueOnce({
      role: "ADMIN",
      tenantId: "parent",
      isActive: true,
    });
    mockTenantFindUnique.mockResolvedValueOnce({
      parentTenantId: "parent",
      parentManaged: false,
    });
    expect(await getEffectiveRole("u1", "enfant")).toBeNull();
  });

  it("rien pour l'ADMIN d'un autre espace que le parent", async () => {
    mockUser.mockResolvedValueOnce({
      role: "ADMIN",
      tenantId: "autre",
      isActive: true,
    });
    mockTenantFindUnique.mockResolvedValueOnce({
      parentTenantId: "parent",
      parentManaged: true,
    });
    expect(await getEffectiveRole("u1", "enfant")).toBeNull();
  });

  it("un acces externe explicite garde la main sur la delegation", async () => {
    mockUser.mockResolvedValueOnce({
      role: "ADMIN",
      tenantId: "parent",
      isActive: true,
    });
    mockMembershipFindUnique.mockResolvedValueOnce({ role: "MANAGER" });
    expect(await getEffectiveRole("u1", "enfant")).toBe("MANAGER");
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
  });

  it("canActAsAdminInTenant et hasTenantAccess suivent la regle", async () => {
    mockUser.mockResolvedValue({
      role: "ADMIN",
      tenantId: "parent",
      isActive: true,
    });
    mockTenantFindUnique.mockResolvedValue({
      parentTenantId: "parent",
      parentManaged: true,
    });
    expect(await canActAsAdminInTenant("u1", "enfant")).toBe(true);
    expect(await hasTenantAccess("u1", "enfant")).toBe(true);
  });
});

describe("listTenantAdmins : admins delegues du parent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ajoute les ADMIN et RSSI du parent, source « parent », apres natifs et externes", async () => {
    const quand = new Date("2026-11-02T10:00:00Z");
    mockUserFindMany
      .mockResolvedValueOnce([
        {
          id: "n1",
          email: "natif@enfant.test",
          name: null,
          role: "MANAGER",
          isActive: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "p1",
          email: "admin@parent.test",
          name: "Nicolas",
          role: "ADMIN",
          isActive: true,
        },
      ]);
    mockMembershipFindMany.mockResolvedValueOnce([]);
    mockTenantFindMany.mockResolvedValueOnce([]);
    mockTenantFindUnique.mockResolvedValueOnce({
      parentManaged: true,
      parentManagedAt: quand,
      parent: { id: "parent", name: "Alsace Micro Services" },
    });

    const admins = await listTenantAdmins("enfant");
    expect(admins.map((a) => [a.source, a.email])).toEqual([
      ["native", "natif@enfant.test"],
      ["parent", "admin@parent.test"],
    ]);
    const delegue = admins[1];
    expect(delegue).toMatchObject({
      effectiveRole: "ADMIN",
      homeTenantId: "parent",
      homeTenantName: "Alsace Micro Services",
      grantedAt: quand,
      grantedBy: null,
    });
    expect(mockUserFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { tenantId: "parent", role: { in: ["ADMIN", "RSSI"] } },
      }),
    );
  });

  it("n'ajoute personne sans gestion deleguee", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockMembershipFindMany.mockResolvedValueOnce([]);
    mockTenantFindMany.mockResolvedValueOnce([]);
    mockTenantFindUnique.mockResolvedValueOnce({
      parentManaged: false,
      parentManagedAt: null,
      parent: { id: "parent", name: "X" },
    });
    expect(await listTenantAdmins("enfant")).toEqual([]);
    expect(mockUserFindMany).toHaveBeenCalledTimes(1);
  });
});
