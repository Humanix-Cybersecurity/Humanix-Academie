// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de POST /api/payments/checkout -- l'ouverture d'une session de paiement.
//
// CE QUI EST DOUBLE, ET CE QUI NE L'EST PAS
//
//   `createCheckoutSession` est doublee : c'est un appel reseau. Tout le reste
//   -- validation du plan, calcul des sieges, garde de debit -- reste reel,
//   parce que c'est precisement la que se decide COMBIEN on va prelever.
//
//   Le siege est le multiplicateur du prix : `pro` a 3 EUR/siege. Une erreur
//   d'une unite ici est une erreur de facturation, pas un defaut d'affichage.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockMollie, mockGuard, mockRateLimit } = vi.hoisted(() => ({
  mockDb: { tenant: { findUnique: vi.fn(), update: vi.fn() } },
  mockMollie: {
    isMollieConfigured: vi.fn(),
    createCheckoutSession: vi.fn(),
  },
  mockGuard: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/api/require-role", () => ({ requireAdmin: mockGuard }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));
// Mock PARTIEL : seul l'appel reseau est double. isPlanBuyable et la
// tarification restent les vraies.
vi.mock("@/lib/mollie", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mollie")>()),
  ...mockMollie,
}));

import { POST } from "./route";

// `requireAdmin` renvoie un GuardResult dont la branche session declare
// `response?: never` : « "response" in guard » ne restreint donc pas
// completement, et POST est infere `NextResponse | undefined`. Une route qui
// ne renverrait rien serait un vrai defaut -- on le transforme en echec net
// plutot que de le taire par un `!`.
async function appeler(req: Request): Promise<Response> {
  const r = await POST(req);
  if (!r) throw new Error("la route n'a renvoye aucune reponse");
  return r;
}

const TENANT_ID = "cmsxtrvl8005nqr01rn8b0t1j";

function requete(corps: unknown) {
  return new Request("https://humanix-academie.fr/api/payments/checkout", {
    method: "POST",
    body: JSON.stringify(corps),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMollie.isMollieConfigured.mockReturnValue(true);
  mockGuard.mockResolvedValue({
    session: {
      user: {
        id: "u1",
        email: "admin@client.test",
        role: "ADMIN",
        tenantId: TENANT_ID,
      },
    },
  });
  mockRateLimit.mockReturnValue({ ok: true });
  mockDb.tenant.findUnique.mockResolvedValue({
    id: TENANT_ID,
    name: "Braver inc.",
    seatCount: 16,
    paymentCustomerId: "cst_existant",
  });
  mockDb.tenant.update.mockResolvedValue({});
  mockMollie.createCheckoutSession.mockResolvedValue({
    hosted_payment: { payment_url: "https://mollie.test/pay/tr_1" },
    customer: { id: "cst_existant" },
  });
});

describe("gardes d'acces", () => {
  it("repond 503 sans module de paiement, avant toute autre chose", async () => {
    mockMollie.isMollieConfigured.mockReturnValue(false);
    const r = await appeler(requete({ plan: "pro", seats: 16 }));
    expect(r.status).toBe(503);
    expect(mockGuard).not.toHaveBeenCalled();
  });

  it("delegue l'autorisation au garde partage, et lui obeit", async () => {
    const refus = new Response(null, { status: 403 });
    mockGuard.mockResolvedValue({ response: refus });
    const r = await appeler(requete({ plan: "pro", seats: 16 }));
    expect(r.status).toBe(403);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
  });

  // Cinq ouvertures par heure et par tenant : une session de paiement coute
  // un appel Mollie et cree potentiellement un customer.
  it("repond 429 quand la limite de debit est atteinte", async () => {
    mockRateLimit.mockReturnValue({ ok: false });
    const r = await appeler(requete({ plan: "pro", seats: 16 }));
    expect(r.status).toBe(429);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("compte la limite PAR TENANT, pas globalement", async () => {
    await appeler(requete({ plan: "pro", seats: 16 }));
    expect(mockRateLimit).toHaveBeenCalledWith(
      `payments-checkout:${TENANT_ID}`,
      5,
      3_600_000,
    );
  });
});

describe("plans acceptes", () => {
  it("refuse un plan inconnu", async () => {
    const r = await appeler(requete({ plan: "platine", seats: 5 }));
    expect(r.status).toBe(400);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("refuse un corps sans plan", async () => {
    expect((await appeler(requete({}))).status).toBe(400);
  });

  // enterprise est sur devis : le laisser passer ouvrirait un paiement pour un
  // plan dont le prix n'est pas dans le code.
  it("refuse enterprise, qui n'est pas achetable en self-service", async () => {
    const r = await appeler(requete({ plan: "enterprise", seats: 50 }));
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      error: expect.stringContaining("devis"),
    });
  });
});

describe("nombre de sieges, c'est-a-dire le montant", () => {
  it("starter est un forfait : les sieges demandes sont ignores", async () => {
    await appeler(requete({ plan: "starter", seats: 99 }));
    expect(mockMollie.createCheckoutSession.mock.calls[0][0].seats).toBe(1);
  });

  it("pro prend les sieges du corps quand ils sont fournis", async () => {
    await appeler(requete({ plan: "pro", seats: 25 }));
    expect(mockMollie.createCheckoutSession.mock.calls[0][0].seats).toBe(25);
  });

  it("pro retombe sur les sieges du tenant a defaut", async () => {
    await appeler(requete({ plan: "pro" }));
    expect(mockMollie.createCheckoutSession.mock.calls[0][0].seats).toBe(16);
  });

  // Sans siege ni valeur au tenant, `?? 1` facturerait 3 EUR un client qui en
  // attend cinquante. Mieux vaut refuser que deviner un montant.
  it("refuse pro quand aucun siege n'est connu, plutot que d'en supposer un", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      name: "Sans sieges",
      seatCount: null,
      paymentCustomerId: null,
    });
    const r = await appeler(requete({ plan: "pro" }));
    expect(r.status).toBe(400);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("tronque un nombre de sieges fractionnaire", async () => {
    await appeler(requete({ plan: "pro", seats: 7.9 }));
    expect(mockMollie.createCheckoutSession.mock.calls[0][0].seats).toBe(7);
  });

  it.each([0, -5, "12", null])(
    "ignore un nombre de sieges invalide (%p) et retombe sur le tenant",
    async (seats) => {
      await appeler(requete({ plan: "pro", seats }));
      expect(mockMollie.createCheckoutSession.mock.calls[0][0].seats).toBe(16);
    },
  );
});

describe("periodicite", () => {
  it("mensuel par defaut", async () => {
    await appeler(requete({ plan: "pro", seats: 16 }));
    expect(mockMollie.createCheckoutSession.mock.calls[0][0].billing).toBe(
      "monthly",
    );
  });

  it("annuel seulement sur demande explicite", async () => {
    await appeler(requete({ plan: "pro", seats: 16, billing: "annual" }));
    expect(mockMollie.createCheckoutSession.mock.calls[0][0].billing).toBe(
      "annual",
    );
  });

  it("toute autre valeur retombe sur mensuel", async () => {
    await appeler(requete({ plan: "pro", seats: 16, billing: "hebdomadaire" }));
    expect(mockMollie.createCheckoutSession.mock.calls[0][0].billing).toBe(
      "monthly",
    );
  });
});

describe("ce que le webhook retrouvera", () => {
  // Le webhook n'a que les metadata du paiement pour savoir QUI a paye. Sans
  // tenantId il tombe sur la branche « anonymous-inscription ».
  it("transmet le tenantId, seul lien entre le paiement et le client", async () => {
    await appeler(requete({ plan: "pro", seats: 16 }));
    const arg = mockMollie.createCheckoutSession.mock.calls[0][0];
    expect(arg.tenantId).toBe(TENANT_ID);
    expect(arg.metadata).toMatchObject({ tenantId: TENANT_ID });
  });

  it("derive le webhook de la config serveur, jamais d'un en-tete client", async () => {
    await appeler(
      new Request("https://attaquant.test/api/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: "pro", seats: 16 }),
        headers: { "content-type": "application/json", host: "attaquant.test" },
      }),
    );
    const arg = mockMollie.createCheckoutSession.mock.calls[0][0];
    expect(arg.webhookUrl).not.toContain("attaquant.test");
  });
});

describe("customer Mollie", () => {
  it("persiste le customer quand Mollie vient de le creer", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      name: "Nouveau",
      seatCount: 4,
      paymentCustomerId: null,
    });
    mockMollie.createCheckoutSession.mockResolvedValue({
      hosted_payment: { payment_url: "https://mollie.test/pay/tr_2" },
      customer: { id: "cst_neuf" },
    });
    await appeler(requete({ plan: "pro", seats: 4 }));
    expect(mockDb.tenant.update).toHaveBeenCalledWith({
      where: { id: TENANT_ID },
      data: { paymentProvider: "mollie", paymentCustomerId: "cst_neuf" },
    });
  });

  // Ecraser un customer existant detacherait le tenant de ses mandats, donc
  // de ses prelevements en cours.
  it("N'ECRASE PAS un customer deja enregistre", async () => {
    await appeler(requete({ plan: "pro", seats: 16 }));
    expect(mockDb.tenant.update).not.toHaveBeenCalled();
  });
});

describe("issues", () => {
  it("renvoie l'URL de paiement", async () => {
    const r = await appeler(requete({ plan: "pro", seats: 16 }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      url: "https://mollie.test/pay/tr_1",
    });
  });

  it("repond 404 si le tenant a disparu entre la session et ici", async () => {
    mockDb.tenant.findUnique.mockResolvedValue(null);
    expect((await appeler(requete({ plan: "pro", seats: 16 }))).status).toBe(
      404,
    );
  });

  it("repond 500 quand Mollie refuse, sans masquer le motif", async () => {
    mockMollie.createCheckoutSession.mockRejectedValue(
      new Error("carte refusee"),
    );
    const r = await appeler(requete({ plan: "pro", seats: 16 }));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "carte refusee" });
  });
});
