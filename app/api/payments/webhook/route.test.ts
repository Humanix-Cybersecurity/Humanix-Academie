// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests d'integration du webhook Mollie.
//
// POURQUOI CE FICHIER EXISTE
//
//   `lib/mollie.test.ts` annonçait lui-meme : « les flows checkout/webhook sont
//   testes via les tests d'integration (TODO post-launch) ». Ce TODO a change
//   de nature le 2026-08-17, quand le premier client a paye 96 EUR pour un
//   abonnement a 48 EUR/mois.
//
//   Deux defauts sur les deux premieres transactions reelles, aucun attrape par
//   les tests : ils ne couvraient que les helpers purs. C'est le chemin qui
//   manipule de l'argent qui n'etait pas couvert.
//
// CE QU'ON COUVRE ICI
//
//   Les decisions du webhook, pas le SDK Mollie. On remplace `getPayment` et
//   `createSubscriptionForCustomer` par des doubles, et on verifie CE QUE LE
//   HANDLER DECIDE : quelle date de premiere echeance, quelle idempotence,
//   quelle confiance accordee au corps de la requete.
//
//   `prochaineEcheance` reste REELLE : c'est la fonction dont dependait le
//   double prelevement, on veut tester son resultat, pas un double qui dirait
//   oui.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockMollie, mockAudit, mockProvision } = vi.hoisted(() => ({
  mockDb: {
    billingEvent: { findUnique: vi.fn(), create: vi.fn() },
    tenant: { findUnique: vi.fn(), update: vi.fn() },
  },
  mockMollie: {
    getPayment: vi.fn(),
    getSubscription: vi.fn(),
    getMollieCustomer: vi.fn(),
    createSubscriptionForCustomer: vi.fn(),
  },
  mockAudit: vi.fn(),
  mockProvision: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  auditLog: mockAudit,
  AuditActions: new Proxy({}, { get: (_t, p) => String(p) }),
}));
vi.mock("@/lib/tenant-provisioning", () => ({
  provisionTenantWithAdmin: mockProvision,
}));
vi.mock("@/lib/auth", () => ({ signIn: vi.fn() }));
vi.mock("@/lib/subdomain-tenant", () => ({
  getAppBaseUrl: () => "https://humanix-academie.fr",
}));

// Mock PARTIEL : les appels reseau sont doubles, la logique metier reste reelle.
vi.mock("@/lib/mollie", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mollie")>()),
  ...mockMollie,
}));

import { POST } from "./route";

/** Le paiement `first` du 2026-08-17, tel que Mollie l'a renvoye. */
function paiementInitial(surcharge: Record<string, unknown> = {}) {
  return {
    id: "tr_ttSTHVovUv7noCYDBNXVJ",
    status: "paid",
    sequenceType: "first",
    customerId: "cst_test",
    mandateId: "mdt_8uZVcEA4nJ",
    subscriptionId: null,
    amount: { value: "48.00", currency: "EUR" },
    metadata: {
      plan: "pro",
      seats: "16",
      billing: "monthly",
      tenantId: "cmsxtrvl8005nqr01rn8b0t1j",
    },
    ...surcharge,
  };
}

function requeteWebhook(id: string) {
  return new Request("https://humanix-academie.fr/api/payments/webhook", {
    method: "POST",
    body: new URLSearchParams({ id }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.billingEvent.findUnique.mockResolvedValue(null);
  mockDb.billingEvent.create.mockResolvedValue({ id: "be_1" });
  mockDb.tenant.findUnique.mockResolvedValue({
    id: "cmsxtrvl8005nqr01rn8b0t1j",
    plan: "starter",
  });
  mockDb.tenant.update.mockResolvedValue({});
  mockMollie.createSubscriptionForCustomer.mockResolvedValue({
    id: "sub_test",
  });
});

describe("webhook Mollie - le premier mois ne doit pas etre preleve deux fois", () => {
  it("cree l'abonnement avec une premiere echeance DANS LE FUTUR", async () => {
    // LA regression du 2026-08-17. Sans `startDate`, Mollie demarre la
    // Subscription immediatement : le mandat vient d'etre valide par le
    // paiement `first`, donc la charge recurrente part dans la foulee et
    // double le mois deja encaisse.
    mockMollie.getPayment.mockResolvedValue(paiementInitial());

    const avant = Date.now();
    await POST(requeteWebhook("tr_ttSTHVovUv7noCYDBNXVJ"));

    expect(mockMollie.createSubscriptionForCustomer).toHaveBeenCalledTimes(1);
    const args = mockMollie.createSubscriptionForCustomer.mock.calls[0][0];
    expect(args.startDate).toBeInstanceOf(Date);
    expect(args.startDate.getTime()).toBeGreaterThan(avant);
  });

  it("place cette echeance une PERIODE plus tard, pas un jour", async () => {
    // Une date future ne suffit pas : elle doit couvrir la periode payee.
    mockMollie.getPayment.mockResolvedValue(paiementInitial());

    await POST(requeteWebhook("tr_ttSTHVovUv7noCYDBNXVJ"));

    const args = mockMollie.createSubscriptionForCustomer.mock.calls[0][0];
    const jours = (args.startDate.getTime() - Date.now()) / 86_400_000;
    expect(jours).toBeGreaterThan(26); // au moins un mois, fevrier compris
    expect(jours).toBeLessThan(32);
  });

  it("annuel : l'echeance couvre l'annee payee", async () => {
    mockMollie.getPayment.mockResolvedValue(
      paiementInitial({
        metadata: {
          plan: "pro",
          seats: "16",
          billing: "annual",
          tenantId: "t1",
        },
      }),
    );

    await POST(requeteWebhook("tr_ttSTHVovUv7noCYDBNXVJ"));

    const args = mockMollie.createSubscriptionForCustomer.mock.calls[0][0];
    const jours = (args.startDate.getTime() - Date.now()) / 86_400_000;
    expect(jours).toBeGreaterThan(360);
  });
});

describe("webhook Mollie - ce a quoi le handler fait confiance", () => {
  it("relit le paiement chez Mollie, sans croire le corps de la requete", async () => {
    // Le corps ne porte qu'un id. Un attaquant qui devancerait Mollie ne peut
    // donc pas dicter un montant ni un plan : tout vient de `getPayment`.
    mockMollie.getPayment.mockResolvedValue(paiementInitial());

    await POST(requeteWebhook("tr_ttSTHVovUv7noCYDBNXVJ"));

    expect(mockMollie.getPayment).toHaveBeenCalledWith(
      "tr_ttSTHVovUv7noCYDBNXVJ",
    );
    const args = mockMollie.createSubscriptionForCustomer.mock.calls[0][0];
    expect(args.amount.value).toBe("48.00"); // 16 sieges x 3 EUR
  });

  it("ne cree rien deux fois pour le meme evenement", async () => {
    // Mollie retente ses webhooks. Sans cette garde, chaque retentative
    // creerait un abonnement de plus.
    mockDb.billingEvent.findUnique.mockResolvedValue({ id: "deja_traite" });
    mockMollie.getPayment.mockResolvedValue(paiementInitial());

    const res = await POST(requeteWebhook("tr_ttSTHVovUv7noCYDBNXVJ"));

    expect(await res.json()).toMatchObject({ duplicate: true });
    expect(mockMollie.createSubscriptionForCustomer).not.toHaveBeenCalled();
  });

  it("ne cree aucun abonnement si le paiement n'est pas encaisse", async () => {
    mockMollie.getPayment.mockResolvedValue(
      paiementInitial({ status: "expired" }),
    );

    await POST(requeteWebhook("tr_ttSTHVovUv7noCYDBNXVJ"));

    expect(mockMollie.createSubscriptionForCustomer).not.toHaveBeenCalled();
  });

  it("refuse un identifiant absent", async () => {
    const res = await POST(
      new Request("https://humanix-academie.fr/api/payments/webhook", {
        method: "POST",
        body: "",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("ignore un type de ressource inconnu sans faire retenter Mollie", async () => {
    const res = await POST(requeteWebhook("mdt_8uZVcEA4nJ"));
    // 200 volontaire : un 4xx declencherait une tempete de retentatives.
    expect(res.status).toBe(200);
    expect(mockMollie.getPayment).not.toHaveBeenCalled();
  });
});
