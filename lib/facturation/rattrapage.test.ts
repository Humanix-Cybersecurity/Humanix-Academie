// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du rattrapage de facturation.
//
// Le cas qui motive ce module : le double prelevement du 2026-08-17, deux fois
// 48,00 EUR dont une moitie remboursee. Facturer aveuglement produirait une
// facture pour de l'argent rendu.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockMollie } = vi.hoisted(() => ({
  mockDb: {
    billingEvent: { findMany: vi.fn() },
    facture: { findMany: vi.fn() },
  },
  mockMollie: { getPayment: vi.fn(), isMollieConfigured: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/mollie", () => mockMollie);

import { paiementsAFacturer } from "./rattrapage";

function evenement(
  id: string,
  valeur: string,
  paidAt = "2026-08-17T22:54:02.000Z",
) {
  return {
    payload: { id, amount: { value: valeur, currency: "EUR" }, paidAt },
    providerCreatedAt: new Date(paidAt),
  };
}

beforeEach(() => {
  mockDb.billingEvent.findMany.mockReset();
  mockDb.facture.findMany.mockReset();
  mockMollie.getPayment.mockReset();
  mockMollie.isMollieConfigured.mockReturnValue(true);
  mockDb.facture.findMany.mockResolvedValue([]);
});

describe("paiementsAFacturer", () => {
  it("retrouve le cas reel : deux prelevements de 48,00 EUR le 17 aout", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      evenement("tr_1", "48.00", "2026-08-17T22:54:02.000Z"),
      evenement("tr_2", "48.00", "2026-08-17T23:32:51.000Z"),
    ]);
    const r = await paiementsAFacturer("t1");
    expect(r).toHaveLength(2);
    expect(r[0].montantTtcCentimes).toBe(4800);
    expect(r[0].ref).toBe("tr_1");
  });

  it("EXCLUT les paiements deja factures", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      evenement("tr_1", "48.00"),
      evenement("tr_2", "48.00"),
    ]);
    mockDb.facture.findMany.mockResolvedValue([{ paiementRef: "tr_1" }]);
    const r = await paiementsAFacturer("t1");
    expect(r.map((p) => p.ref)).toEqual(["tr_2"]);
  });

  // Mollie rejoue ses webhooks : sans deduplication, un paiement rejoue trois
  // fois apparaitrait trois fois dans la liste a facturer.
  it("deduplique un paiement dont le webhook a ete rejoue", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      evenement("tr_1", "48.00"),
      evenement("tr_1", "48.00"),
      evenement("tr_1", "48.00"),
    ]);
    const r = await paiementsAFacturer("t1");
    expect(r).toHaveLength(1);
  });

  it("ignore un evenement dont le payload n'a ni id ni montant exploitable", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      { payload: {}, providerCreatedAt: new Date() },
      { payload: { id: "tr_9" }, providerCreatedAt: new Date() },
      evenement("tr_1", "48.00"),
    ]);
    const r = await paiementsAFacturer("t1");
    expect(r.map((p) => p.ref)).toEqual(["tr_1"]);
  });

  it("ne releve PAS les remboursements par defaut (pas d'appel reseau)", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      evenement("tr_1", "48.00"),
    ]);
    const r = await paiementsAFacturer("t1");
    expect(mockMollie.getPayment).not.toHaveBeenCalled();
    expect(r[0].rembourseCentimes).toBeNull();
  });

  it("releve le remboursement quand on le demande", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      evenement("tr_1", "48.00"),
    ]);
    mockMollie.getPayment.mockResolvedValue({
      amountRefunded: { value: "48.00", currency: "EUR" },
    });
    const r = await paiementsAFacturer("t1", { verifierRemboursements: true });
    expect(r[0].rembourseCentimes).toBe(4800);
  });

  it("un paiement non rembourse rend 0, pas null", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      evenement("tr_1", "48.00"),
    ]);
    mockMollie.getPayment.mockResolvedValue({ amountRefunded: null });
    const r = await paiementsAFacturer("t1", { verifierRemboursements: true });
    expect(r[0].rembourseCentimes).toBe(0);
  });

  // « Inconnu » est une reponse honnete ; « 0 » pousserait a facturer a tort
  // un paiement peut-etre rembourse.
  it("Mollie injoignable : rembourse reste INCONNU (null), jamais 0", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      evenement("tr_1", "48.00"),
    ]);
    mockMollie.getPayment.mockRejectedValue(new Error("reseau"));
    const r = await paiementsAFacturer("t1", { verifierRemboursements: true });
    expect(r[0].rembourseCentimes).toBeNull();
  });

  it("aucun paiement : liste vide, sans requete de factures", async () => {
    mockDb.billingEvent.findMany.mockResolvedValue([]);
    const r = await paiementsAFacturer("t1");
    expect(r).toEqual([]);
    expect(mockDb.facture.findMany).not.toHaveBeenCalled();
  });
});
