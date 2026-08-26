// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de POST /api/payments/cancel -- la resiliation d'un abonnement payant.
//
// POURQUOI CETTE ROUTE MERITE DES TESTS
//
//   C'est l'action la plus destructrice offerte a un client : elle coupe un
//   abonnement en cours. Elle a deja porte un defaut reel -- /admin/billing y
//   pointait par un <Link>, donc en GET, et la route n'expose que POST : 405
//   sur le bouton de resiliation. Le premier test ci-dessous fige cette
//   asymetrie pour qu'un futur `export async function GET` soit un choix
//   explicite et non un accident.
//
//   Les appels reseau sont doubles ; la logique d'autorisation reste reelle.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockMollie, mockAudit, mockAuth } = vi.hoisted(() => ({
  mockDb: { tenant: { findUnique: vi.fn() } },
  mockMollie: { isMollieConfigured: vi.fn(), cancelSubscription: vi.fn() },
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

const TENANT = {
  id: "cmsxtrvl8005nqr01rn8b0t1j",
  paymentCustomerId: "cst_test",
  paymentSubscriptionId: "sub_yx4U5SqVSy",
};

function sessionAdmin(surcharge: Record<string, unknown> = {}) {
  return {
    user: {
      id: "u1",
      email: "admin@client.test",
      role: "ADMIN",
      tenantId: TENANT.id,
      ...surcharge,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMollie.isMollieConfigured.mockReturnValue(true);
  mockMollie.cancelSubscription.mockResolvedValue(undefined);
  mockAuth.mockResolvedValue(sessionAdmin());
  mockDb.tenant.findUnique.mockResolvedValue(TENANT);
});

describe("surface HTTP", () => {
  // Le defaut du 2026-08-19 : un <Link> fait une navigation GET, la route
  // n'expose que POST, et le bouton de resiliation repondait 405.
  it("n'expose que POST : une navigation GET ne peut pas resilier", () => {
    expect(typeof route.POST).toBe("function");
    expect((route as Record<string, unknown>).GET).toBeUndefined();
  });
});

describe("qui a le droit de resilier", () => {
  it("refuse un visiteur non authentifie", async () => {
    mockAuth.mockResolvedValue(null);
    const r = await route.POST();
    expect(r.status).toBe(401);
    expect(mockMollie.cancelSubscription).not.toHaveBeenCalled();
  });

  it.each(["LEARNER", "MANAGER", "DPO"])("refuse le role %s", async (role) => {
    mockAuth.mockResolvedValue(sessionAdmin({ role }));
    const r = await route.POST();
    expect(r.status).toBe(403);
    expect(mockMollie.cancelSubscription).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "RSSI", "SUPERADMIN"])(
    "accepte le role %s",
    async (role) => {
      mockAuth.mockResolvedValue(sessionAdmin({ role }));
      const r = await route.POST();
      expect(r.status).toBe(200);
    },
  );

  it("refuse une session sans tenant", async () => {
    mockAuth.mockResolvedValue(sessionAdmin({ tenantId: null }));
    const r = await route.POST();
    expect(r.status).toBe(400);
    expect(mockMollie.cancelSubscription).not.toHaveBeenCalled();
  });
});

describe("ce qui est reellement annule", () => {
  // La route ne lit AUCUN corps de requete : la cible vient de la session.
  // C'est ce qui interdit de resilier l'abonnement d'un autre tenant en
  // trafiquant un formulaire.
  it("annule l'abonnement du tenant de la SESSION, jamais un identifiant recu", async () => {
    await route.POST();
    expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: TENANT.id },
    });
    expect(mockMollie.cancelSubscription).toHaveBeenCalledWith(
      "cst_test",
      "sub_yx4U5SqVSy",
    );
    expect(route.POST.length).toBe(0);
  });

  it("repond 404 quand il n'y a pas d'abonnement", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: TENANT.id });
    const r = await route.POST();
    expect(r.status).toBe(404);
    expect(mockMollie.cancelSubscription).not.toHaveBeenCalled();
  });

  it("repond 404 si le customer manque, meme avec un abonnement", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      id: TENANT.id,
      paymentSubscriptionId: "sub_1",
      paymentCustomerId: null,
    });
    const r = await route.POST();
    expect(r.status).toBe(404);
  });
});

describe("journal d'audit", () => {
  it("consigne la resiliation reussie", async () => {
    await route.POST();
    expect(mockAudit).toHaveBeenCalledTimes(1);
    const entree = mockAudit.mock.calls[0][0];
    expect(entree.action).toBe("BILLING_SUBSCRIPTION_CANCELED");
    expect(entree.tenantId).toBe(TENANT.id);
    expect(entree.target.id).toBe("sub_yx4U5SqVSy");
  });

  // La propriete qui compte : un journal qui affirmerait une resiliation non
  // faite est pire que pas de journal du tout. On le releverait comme preuve.
  it("NE consigne RIEN quand Mollie refuse", async () => {
    mockMollie.cancelSubscription.mockRejectedValue(new Error("Mollie HS"));
    const r = await route.POST();
    expect(r.status).toBe(500);
    expect(mockAudit).not.toHaveBeenCalled();
  });
});

describe("module de paiement absent", () => {
  it("repond 503 sans meme ouvrir la session", async () => {
    mockMollie.isMollieConfigured.mockReturnValue(false);
    const r = await route.POST();
    expect(r.status).toBe(503);
    expect(mockAuth).not.toHaveBeenCalled();
    expect(mockDb.tenant.findUnique).not.toHaveBeenCalled();
  });
});
