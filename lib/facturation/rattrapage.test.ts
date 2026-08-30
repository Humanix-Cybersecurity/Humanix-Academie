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
    facture: { findMany: vi.fn(), count: vi.fn() },
    identiteFacturation: { findUnique: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
  mockMollie: { getPayment: vi.fn(), isMollieConfigured: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/mollie", () => mockMollie);

import { paiementsAFacturer, etatFacturationTenant } from "./rattrapage";

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

describe("etatFacturationTenant", () => {
  const LE_17 = new Date("2026-08-17T22:54:02.000Z");
  const LE_26 = new Date("2026-08-26T09:12:00.000Z");

  beforeEach(() => {
    mockDb.billingEvent.findMany.mockResolvedValue([
      evenement("tr_1", "48.00"),
      evenement("tr_2", "48.00"),
    ]);
    mockDb.facture.findMany.mockResolvedValue([]);
    mockDb.facture.count.mockResolvedValue(0);
    mockDb.identiteFacturation.findUnique.mockResolvedValue(null);
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockMollie.isMollieConfigured.mockReturnValue(true);
  });

  it("compte les paiements en attente et leur total", async () => {
    const e = await etatFacturationTenant("t1");
    expect(e.paiementsEnAttente).toBe(2);
    expect(e.totalTtcCentimes).toBe(9600);
  });

  it("dit que les coordonnees manquent quand il n'y a pas d'identite", async () => {
    expect((await etatFacturationTenant("t1")).coordonneesPresentes).toBe(
      false,
    );
    mockDb.identiteFacturation.findUnique.mockResolvedValue({ tenantId: "t1" });
    expect((await etatFacturationTenant("t1")).coordonneesPresentes).toBe(true);
  });

  it("n'a aucune relance a montrer au depart", async () => {
    const e = await etatFacturationTenant("t1");
    expect(e.nombreRelances).toBe(0);
    expect(e.derniereRelance).toBeNull();
  });

  it("rend la plus recente relance et son nombre de destinataires", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([
      {
        createdAt: LE_26,
        outcome: "SUCCESS",
        metadata: { destinataires: 2 },
        message: "Relance coordonnees ...",
        targetType: "relance-facturation",
      },
      {
        createdAt: LE_17,
        outcome: "SUCCESS",
        metadata: { destinataires: 1 },
        message: "Relance coordonnees ...",
        targetType: "relance-facturation",
      },
    ]);
    const e = await etatFacturationTenant("t1");
    expect(e.nombreRelances).toBe(2);
    expect(e.derniereRelance).toEqual({ le: LE_26, destinataires: 2 });
  });

  // Un envoi refuse laisse une trace d'audit, mais le client n'a RIEN recu.
  // L'afficher comme une relance ferait croire qu'il a ete prevenu.
  it("ne compte PAS les tentatives qui ont echoue", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([
      {
        createdAt: LE_26,
        outcome: "FAILURE",
        metadata: { destinataires: 0 },
        message: "Relance coordonnees ...",
        targetType: "relance-facturation",
      },
      {
        createdAt: LE_17,
        outcome: "SUCCESS",
        metadata: { destinataires: 1 },
        message: "Relance coordonnees ...",
        targetType: "relance-facturation",
      },
    ]);
    const e = await etatFacturationTenant("t1");
    expect(e.nombreRelances).toBe(1);
    expect(e.derniereRelance).toEqual({ le: LE_17, destinataires: 1 });
  });

  it("survit a une metadata sans destinataires", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([
      {
        createdAt: LE_26,
        outcome: "SUCCESS",
        metadata: null,
        message: "Relance coordonnees ...",
        targetType: "relance-facturation",
      },
    ]);
    expect((await etatFacturationTenant("t1")).derniereRelance).toEqual({
      le: LE_26,
      destinataires: null,
    });
  });

  // La requete doit viser le type PROPRE a la relance : "facture" est deja
  // utilise par l'emission manuelle depuis /admin/billing.
  it("interroge le type propre ET l'ancien", async () => {
    await etatFacturationTenant("t1");
    expect(mockDb.auditLog.findMany.mock.calls[0][0].where).toEqual({
      tenantId: "t1",
      targetType: { in: ["relance-facturation", "facture"] },
    });
  });

  it("remonte le nombre de factures deja emises", async () => {
    mockDb.facture.count.mockResolvedValue(3);
    expect((await etatFacturationTenant("t1")).facturesEmises).toBe(3);
  });
});

describe("relances heritees de l'ancien type", () => {
  beforeEach(() => {
    mockDb.billingEvent.findMany.mockResolvedValue([]);
    mockDb.facture.findMany.mockResolvedValue([]);
    mockDb.facture.count.mockResolvedValue(0);
    mockDb.identiteFacturation.findUnique.mockResolvedValue(null);
    mockMollie.isMollieConfigured.mockReturnValue(true);
  });

  // La relance du 2026-08-26 porte targetType "facture" : le type propre
  // n'existait pas encore. Sans cette reconnaissance, la fiche dirait
  // « aucune relance » alors qu'une est partie.
  it("compte une ancienne relance, reconnue a son message", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-08-26T09:35:51Z"),
        outcome: "SUCCESS",
        metadata: { destinataires: 1 },
        message: "Relance coordonnees de facturation envoyee a 1 admin(s)",
        targetType: "facture",
      },
    ]);
    const e = await etatFacturationTenant("t1");
    expect(e.nombreRelances).toBe(1);
    expect(e.derniereRelance?.destinataires).toBe(1);
  });

  // Une EMISSION porte aussi targetType "facture". La confondre avec une
  // relance ferait croire que le client a ete prevenu alors qu'on lui a
  // simplement facture quelque chose.
  it("ne prend PAS une emission pour une relance", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-08-26T10:00:00Z"),
        outcome: "SUCCESS",
        metadata: {},
        message: "Facture FA-2026-0001 emise pour le paiement tr_x",
        targetType: "facture",
      },
    ]);
    const e = await etatFacturationTenant("t1");
    expect(e.nombreRelances).toBe(0);
    expect(e.derniereRelance).toBeNull();
  });
});

describe("provenance des coordonnees", () => {
  beforeEach(() => {
    mockDb.billingEvent.findMany.mockResolvedValue([]);
    mockDb.facture.findMany.mockResolvedValue([]);
    mockDb.facture.count.mockResolvedValue(0);
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockMollie.isMollieConfigured.mockReturnValue(true);
  });

  it("null quand le Client les a saisies lui-meme", async () => {
    mockDb.identiteFacturation.findUnique.mockResolvedValue({
      tenantId: "t1",
      saisiePar: null,
    });
    expect((await etatFacturationTenant("t1")).coordonneesSaisiePar).toBeNull();
  });

  it("porte l'adresse du SUPERADMIN qui les a transcrites", async () => {
    mockDb.identiteFacturation.findUnique.mockResolvedValue({
      tenantId: "t1",
      saisiePar: "moi@humanix.test",
    });
    expect((await etatFacturationTenant("t1")).coordonneesSaisiePar).toBe(
      "moi@humanix.test",
    );
  });
});
