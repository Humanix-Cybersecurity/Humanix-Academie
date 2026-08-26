// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de POST /api/payments/portal.
//
// Cette route ment par omission si on n'y prend pas garde : son nom promet un
// portail Mollie, or Mollie N'EN A PAS. Elle renvoie donc toujours
// `{ fallback: true }`, et c'est le front qui affiche la page interne.
//
// Le jour ou quelqu'un branchera un vrai portail, ces tests diront lesquelles
// de ces promesses etaient tenues.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockMollie, mockAudit, mockAuth } = vi.hoisted(() => ({
  mockDb: { tenant: { findUnique: vi.fn() } },
  mockMollie: { isMollieConfigured: vi.fn() },
  mockAudit: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/mollie", () => mockMollie);
vi.mock("@/lib/audit", () => ({
  auditLog: mockAudit,
  AuditActions: new Proxy({}, { get: (_t, p) => String(p) }),
}));

import * as route from "./route";

const TENANT_ID = "cmsxtrvl8005nqr01rn8b0t1j";

function session(surcharge: Record<string, unknown> = {}) {
  return {
    user: {
      id: "u1",
      email: "admin@client.test",
      role: "ADMIN",
      tenantId: TENANT_ID,
      ...surcharge,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMollie.isMollieConfigured.mockReturnValue(true);
  mockAuth.mockResolvedValue(session());
  mockDb.tenant.findUnique.mockResolvedValue({
    id: TENANT_ID,
    paymentSubscriptionId: "sub_yx4U5SqVSy",
  });
});

describe("surface HTTP", () => {
  // Meme piege que /api/payments/cancel : un <Link> vers cette route ferait
  // un GET et recevrait 405.
  it("n'expose que POST", () => {
    expect(typeof route.POST).toBe("function");
    expect((route as Record<string, unknown>).GET).toBeUndefined();
  });
});

describe("gardes", () => {
  it("repond 503 sans module de paiement, avant d'ouvrir la session", async () => {
    mockMollie.isMollieConfigured.mockReturnValue(false);
    expect((await route.POST()).status).toBe(503);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("repond 401 sans session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await route.POST()).status).toBe(401);
  });

  it.each(["LEARNER", "MANAGER", "DPO"])(
    "repond 403 au role %s",
    async (role) => {
      mockAuth.mockResolvedValue(session({ role }));
      expect((await route.POST()).status).toBe(403);
    },
  );

  it("repond 400 sur une session sans tenant", async () => {
    mockAuth.mockResolvedValue(session({ tenantId: null }));
    expect((await route.POST()).status).toBe(400);
  });

  it("repond 404 quand le tenant n'a aucun abonnement", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    expect((await route.POST()).status).toBe(404);
    expect(mockAudit).not.toHaveBeenCalled();
  });
});

describe("ce que la route repond vraiment", () => {
  // La propriete a figer : AUCUNE URL de portail n'est renvoyee, parce
  // qu'aucune n'existe. Un front qui ferait `location = res.url` casserait.
  it("renvoie le repli, et surtout aucune URL", async () => {
    const r = await route.POST();
    expect(r.status).toBe(200);
    const corps = await r.json();
    expect(corps).toEqual({ fallback: true });
    expect(corps.url).toBeUndefined();
  });

  it("consigne l'acces dans le journal d'audit", async () => {
    await route.POST();
    expect(mockAudit).toHaveBeenCalledTimes(1);
    expect(mockAudit.mock.calls[0][0]).toMatchObject({
      action: "BILLING_PORTAL_ACCESSED",
      tenantId: TENANT_ID,
    });
  });
});
