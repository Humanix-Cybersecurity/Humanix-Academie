// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de resolveTenantContext : du nom d'hote a l'espace vise.
//
// Fige depuis le 2026-11-02 : le sous-domaine est le `slug` du tenant OU son
// `brandSubdomain`. Un client cree par un revendeur a un slug technique derive
// de son nom et un sous-domaine choisi pour sa marque ; ses liens portent le
// second. Avant, seul le slug etait reconnu : sur l'hote de la marque,
// l'administration retombait sur l'espace d'origine de la personne connectee.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockHeaders, mockAuth, mockFindUnique, mockFindFirst, mockHasAccess } =
  vi.hoisted(() => ({
    mockHeaders: vi.fn(),
    mockAuth: vi.fn(),
    mockFindUnique: vi.fn(),
    mockFindFirst: vi.fn(),
    mockHasAccess: vi.fn(),
  }));

vi.mock("next/headers", () => ({ headers: () => mockHeaders() }));
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/db", () => ({
  db: {
    tenant: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
    },
  },
}));
vi.mock("@/lib/tenant-membership", () => ({
  hasTenantAccess: (...a: unknown[]) => mockHasAccess(...a),
}));

import { resolveTenantContext } from "./tenant-context";

const T1 = { id: "t1", slug: "origine", name: "Origine", plan: "pro" };
const T2 = {
  id: "t2",
  slug: "client-sarl-3f9a",
  name: "Client SARL",
  plan: "pro",
};

function hote(slug: string | null) {
  mockHeaders.mockResolvedValue(
    new Headers(slug ? { "x-tenant-slug": slug } : {}),
  );
}
const connecte = (tenantId = "t1") =>
  mockAuth.mockResolvedValue({
    user: { id: "u1", email: "a@t1.test", role: "ADMIN", tenantId },
  });

/** La base ne connait que T1 (slug "origine") et T2 (slug technique, marque "client"). */
function baseAvecDeuxEspaces() {
  mockFindUnique.mockImplementation(
    async (args: { where: { slug?: string; id?: string } }) => {
      if (args.where.slug)
        return [T1, T2].find((t) => t.slug === args.where.slug) ?? null;
      if (args.where.id)
        return [T1, T2].find((t) => t.id === args.where.id) ?? null;
      return null;
    },
  );
  mockFindFirst.mockImplementation(
    async (args: { where: { brandSubdomain?: string } }) =>
      args.where.brandSubdomain === "client" ? T2 : null,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  baseAvecDeuxEspaces();
  mockHasAccess.mockResolvedValue(false);
  process.env.NEXT_PUBLIC_APP_URL = "https://humanix-academie.fr";
});

describe("sans sous-domaine", () => {
  it("no_subdomain, sans toucher la base", async () => {
    hote(null);
    connecte();
    expect(await resolveTenantContext()).toMatchObject({
      kind: "no_subdomain",
      tenant: null,
    });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

describe("le sous-domaine designe un espace", () => {
  it("par son slug : match pour un membre natif, sans chercher la marque", async () => {
    hote("origine");
    connecte("t1");
    const ctx = await resolveTenantContext();
    expect(ctx).toMatchObject({ kind: "tenant_match", tenant: T1 });
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("par son brandSubdomain quand aucun slug ne correspond", async () => {
    hote("client");
    connecte("t2");
    const ctx = await resolveTenantContext();
    expect(ctx).toMatchObject({
      kind: "tenant_match",
      slug: "client",
      tenant: T2,
    });
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { brandSubdomain: "client" } }),
    );
  });

  it("inconnu des deux cotes : tenant_unknown", async () => {
    hote("personne");
    connecte();
    expect(await resolveTenantContext()).toMatchObject({
      kind: "tenant_unknown",
      slug: "personne",
    });
  });

  it("anonyme : tenant_anonymous", async () => {
    hote("client");
    mockAuth.mockResolvedValue(null);
    expect(await resolveTenantContext()).toMatchObject({
      kind: "tenant_anonymous",
      tenant: T2,
    });
  });
});

describe("connecte sur un autre espace", () => {
  it("avec un acces externe (ou gestion deleguee) : match", async () => {
    hote("client");
    connecte("t1");
    mockHasAccess.mockResolvedValue(true);
    expect(await resolveTenantContext()).toMatchObject({
      kind: "tenant_match",
      tenant: T2,
    });
    expect(mockHasAccess).toHaveBeenCalledWith("u1", "t2");
  });

  it("sans acces : mismatch, avec l'hote de son propre espace pour le renvoyer", async () => {
    hote("client");
    connecte("t1");
    const ctx = await resolveTenantContext();
    expect(ctx).toMatchObject({
      kind: "tenant_mismatch",
      tenant: T2,
      redirectTo: "https://origine.humanix-academie.fr/admin",
    });
  });
});
