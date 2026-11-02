// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la resolution de l'espace ACTIF (lib/current-tenant.ts).
//
// Ce qui est fige ici :
//   - sans sous-domaine, l'espace actif est l'espace d'origine ;
//   - avec un sous-domaine auquel l'utilisateur a acces, l'espace actif est
//     celui du sous-domaine, avec le role EFFECTIF de l'acces externe ;
//   - un acces externe de rang inferieur au role d'origine n'est pas un
//     espace actif (downgraded) ;
//   - un sous-domaine sans acces ne se replie JAMAIS en silence sur l'espace
//     d'origine : c'est le defaut qui faisait agir l'administration sur
//     l'espace d'origine sous le nom d'un autre, jusqu'au 2026-11-02.
//
// resolveTenantContext (en-tetes, base) et getEffectiveRole (base) sont
// doubles : on teste la decision, pas les lectures.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockResolve, mockEffective } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockEffective: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/tenant-context", () => ({
  resolveTenantContext: (...a: unknown[]) => mockResolve(...a),
}));
vi.mock("@/lib/tenant-membership", () => ({
  getEffectiveRole: (...a: unknown[]) => mockEffective(...a),
}));

import {
  getCurrentTenantAccess,
  getCurrentTenantId,
  getCurrentTenantIdOrNull,
  getTenantContextSummary,
} from "./current-tenant";

const session = (role = "ADMIN", tenantId = "t1") => ({
  user: { id: "u1", email: "a@t1.test", role, tenantId },
});
const T1 = { id: "t1", slug: "origine", name: "Origine", plan: "pro" };
const T2 = { id: "t2", slug: "client", name: "Client", plan: "pro" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sans session", () => {
  it("aucun acces, getCurrentTenantId refuse, la variante tolerante rend null", async () => {
    mockResolve.mockResolvedValue({
      kind: "no_subdomain",
      slug: null,
      tenant: null,
      session: null,
    });
    expect(await getCurrentTenantAccess()).toBeNull();
    await expect(getCurrentTenantId()).rejects.toThrow("no_tenant");
    expect(await getCurrentTenantIdOrNull()).toBeNull();
    expect(await getTenantContextSummary()).toBeNull();
  });

  it("anonyme sur un sous-domaine : pareil", async () => {
    mockResolve.mockResolvedValue({
      kind: "tenant_anonymous",
      slug: "client",
      tenant: T2,
      session: null,
    });
    expect(await getCurrentTenantAccess()).toBeNull();
  });
});

describe("espace d'origine", () => {
  it.each([
    ["sans sous-domaine", { kind: "no_subdomain", slug: null, tenant: null }],
    [
      "sous-domaine inconnu",
      { kind: "tenant_unknown", slug: "nimporte", tenant: null },
    ],
    [
      "sous-domaine de son propre espace",
      { kind: "tenant_match", slug: "origine", tenant: T1 },
    ],
  ])(
    "%s : l'espace actif est l'origine, avec le role de la session",
    async (_l, ctx) => {
      mockResolve.mockResolvedValue({ ...ctx, session: session("MANAGER") });
      const acces = await getCurrentTenantAccess();
      expect(acces).toMatchObject({
        status: "home",
        tenantId: "t1",
        role: "MANAGER",
        homeRole: "MANAGER",
      });
      expect(await getCurrentTenantId()).toBe("t1");
      expect(await getTenantContextSummary()).toEqual({
        isHome: true,
        activeTenantId: "t1",
        homeTenantId: "t1",
      });
      expect(mockEffective).not.toHaveBeenCalled();
    },
  );
});

describe("acces croise (sous-domaine d'un autre espace, acces reconnu)", () => {
  beforeEach(() => {
    mockResolve.mockResolvedValue({
      kind: "tenant_match",
      slug: "client",
      tenant: T2,
      session: session("ADMIN"),
    });
  });

  it("role effectif egal au role d'origine : l'espace actif est celui du sous-domaine", async () => {
    mockEffective.mockResolvedValue("ADMIN");
    const acces = await getCurrentTenantAccess();
    expect(acces).toMatchObject({
      status: "cross",
      tenantId: "t2",
      homeTenantId: "t1",
      role: "ADMIN",
    });
    expect(mockEffective).toHaveBeenCalledWith("u1", "t2");
    expect(await getCurrentTenantId()).toBe("t2");
    expect(await getTenantContextSummary()).toEqual({
      isHome: false,
      activeTenantId: "t2",
      homeTenantId: "t1",
    });
  });

  it("SUPERADMIN : acces croise partout", async () => {
    mockResolve.mockResolvedValue({
      kind: "tenant_match",
      slug: "client",
      tenant: T2,
      session: session("SUPERADMIN"),
    });
    mockEffective.mockResolvedValue("SUPERADMIN");
    expect(await getCurrentTenantAccess()).toMatchObject({
      status: "cross",
      role: "SUPERADMIN",
    });
  });

  it("acces externe de rang inferieur (MANAGER pour un ADMIN) : downgraded, pas d'espace actif", async () => {
    mockEffective.mockResolvedValue("MANAGER");
    expect(await getCurrentTenantAccess()).toMatchObject({
      status: "downgraded",
      tenantId: "t2",
      role: "MANAGER",
    });
    await expect(getCurrentTenantId()).rejects.toThrow(
      "tenant_access_downgraded",
    );
    expect(await getCurrentTenantIdOrNull()).toBeNull();
    expect(await getTenantContextSummary()).toBeNull();
  });

  it("acces reconnu mais role introuvable (compte desactive entre-temps) : mismatch", async () => {
    mockEffective.mockResolvedValue(null);
    expect(await getCurrentTenantAccess()).toMatchObject({
      status: "mismatch",
      role: null,
      redirectTo: null,
    });
    await expect(getCurrentTenantId()).rejects.toThrow("tenant_mismatch");
  });
});

describe("sous-domaine sans acces (mismatch)", () => {
  it("ne se replie pas sur l'espace d'origine : erreur, et l'hote de l'origine pour rediriger", async () => {
    mockResolve.mockResolvedValue({
      kind: "tenant_mismatch",
      slug: "client",
      tenant: T2,
      session: session("ADMIN"),
      redirectTo: "https://origine.humanix-academie.fr/admin",
    });
    const acces = await getCurrentTenantAccess();
    expect(acces).toMatchObject({
      status: "mismatch",
      tenantId: "t2",
      homeTenantId: "t1",
      role: null,
      redirectTo: "https://origine.humanix-academie.fr/admin",
    });
    await expect(getCurrentTenantId()).rejects.toThrow("tenant_mismatch");
    expect(await getCurrentTenantIdOrNull()).toBeNull();
    expect(await getTenantContextSummary()).toBeNull();
  });
});
