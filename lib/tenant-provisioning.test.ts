// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma AVANT d'importer le module teste. vi.mock est hisse en tete
// de fichier : les fonctions qu'il reference doivent l'etre aussi.
const m = vi.hoisted(() => {
  const txTenantCreate = vi.fn();
  const txUserCreate = vi.fn();
  const txUserUpdate = vi.fn();
  return {
    userFindUnique: vi.fn(),
    tenantFindUnique: vi.fn(),
    tenantFindFirst: vi.fn(),
    txTenantCreate,
    txUserCreate,
    txUserUpdate,
    tx: {
      tenant: { create: txTenantCreate },
      user: { create: txUserCreate, update: txUserUpdate },
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: m.userFindUnique },
    tenant: { findUnique: m.tenantFindUnique, findFirst: m.tenantFindFirst },
    $transaction: vi.fn(async (fn: (t: typeof m.tx) => unknown) => fn(m.tx)),
  },
}));

vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(async () => true),
  AuditActions: new Proxy({}, { get: (_t, prop) => String(prop) }),
}));

import { provisionTenantWithAdmin } from "./tenant-provisioning";
import { COMMUNITY_TENANT_SLUG } from "./tenant-community";

const ENTREE = {
  email: "Nicolas@AlsaceMicro.fr",
  organizationName: "Alsace Micro Services",
  plan: "enterprise" as const,
  adminName: "Nicolas",
  source: "superadmin-manual" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  m.tenantFindUnique.mockResolvedValue(null); // slug libre
  m.txTenantCreate.mockResolvedValue({ id: "tenant-neuf" });
  m.txUserCreate.mockResolvedValue({ id: "user-cree" });
  m.txUserUpdate.mockResolvedValue({ id: "user-communaute" });
});

describe("provisionTenantWithAdmin", () => {
  it("refuse le plan starter sans toucher a la base", async () => {
    const r = await provisionTenantWithAdmin({ ...ENTREE, plan: "starter" });
    expect(r).toEqual({ ok: false, reason: "invalid_plan" });
    expect(m.userFindUnique).not.toHaveBeenCalled();
  });

  it("refuse un email deja pris sur un autre tenant payant", async () => {
    m.userFindUnique.mockResolvedValue({
      id: "u1",
      name: null,
      tenant: { slug: "braver" },
    });
    const r = await provisionTenantWithAdmin(ENTREE);
    expect(r).toEqual({ ok: false, reason: "email_already_on_other_tenant" });
    expect(m.txTenantCreate).not.toHaveBeenCalled();
  });

  it("cree tenant et ADMIN quand l'email est inconnu", async () => {
    m.userFindUnique.mockResolvedValue(null);
    const r = await provisionTenantWithAdmin(ENTREE);
    expect(r).toEqual({
      ok: true,
      tenantId: "tenant-neuf",
      userId: "user-cree",
      created: true,
      communityAccountAttached: false,
    });
    expect(m.txUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "nicolas@alsacemicro.fr",
        name: "Nicolas",
        tenantId: "tenant-neuf",
        role: "ADMIN",
        isActive: true,
      }),
    });
    expect(m.txUserUpdate).not.toHaveBeenCalled();
  });

  it("rattache un compte Communaute existant comme ADMIN au lieu de le recreer", async () => {
    m.userFindUnique.mockResolvedValue({
      id: "user-communaute",
      name: "Nico",
      tenant: { slug: COMMUNITY_TENANT_SLUG },
    });
    const r = await provisionTenantWithAdmin(ENTREE);
    expect(r).toEqual({
      ok: true,
      tenantId: "tenant-neuf",
      userId: "user-communaute",
      created: true,
      communityAccountAttached: true,
    });
    expect(m.txUserCreate).not.toHaveBeenCalled();
    expect(m.txUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-communaute" },
      data: {
        tenantId: "tenant-neuf",
        role: "ADMIN",
        isActive: true,
        // le nom choisi par la personne est conserve
        name: "Nico",
      },
    });
  });

  it("prend le nom du formulaire si le compte Communaute n'en a pas", async () => {
    m.userFindUnique.mockResolvedValue({
      id: "user-communaute",
      name: null,
      tenant: { slug: COMMUNITY_TENANT_SLUG },
    });
    await provisionTenantWithAdmin(ENTREE);
    expect(m.txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Nicolas" }),
      }),
    );
  });
});
