// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la memorisation des coordonnees entre le checkout et le webhook.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockVies } = vi.hoisted(() => ({
  mockDb: {
    identiteFacturationEnAttente: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    identiteFacturation: { upsert: vi.fn() },
  },
  mockVies: { verifierTvaIntra: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("./vies", () => mockVies);

import {
  memoriserCoordonnees,
  reprendreCoordonnees,
  purgerCoordonneesAbandonnees,
} from "./en-attente";

const COORD = {
  raisonSociale: "Client Test SARL",
  adresse: "1 rue de la Paix",
  codePostal: "75002",
  ville: "Paris",
  pays: "FR",
  siren: "123456789",
  tvaIntra: null,
};

beforeEach(() => {
  Object.values(mockDb.identiteFacturationEnAttente).forEach((f) =>
    f.mockReset(),
  );
  mockDb.identiteFacturation.upsert.mockReset();
  mockVies.verifierTvaIntra.mockReset();
  mockDb.identiteFacturationEnAttente.upsert.mockResolvedValue({});
  mockDb.identiteFacturation.upsert.mockResolvedValue({});
  mockDb.identiteFacturationEnAttente.delete.mockResolvedValue({});
});

describe("memoriserCoordonnees", () => {
  it("stocke la saisie sous la reference du client Mollie", async () => {
    await memoriserCoordonnees({
      paymentCustomerId: "cst_1",
      coordonnees: COORD,
    });
    const arg = mockDb.identiteFacturationEnAttente.upsert.mock.calls[0][0];
    expect(arg.where.paymentCustomerId).toBe("cst_1");
    expect(arg.create.raisonSociale).toBe("Client Test SARL");
  });

  it("n'appelle PAS VIES sans numero de TVA", async () => {
    await memoriserCoordonnees({
      paymentCustomerId: "cst_1",
      coordonnees: COORD,
    });
    expect(mockVies.verifierTvaIntra).not.toHaveBeenCalled();
  });

  // Budget court : on est dans le tunnel de paiement. Un « inconnu » fait
  // appliquer la TVA francaise -- le choix prudent -- sans faire attendre.
  it("interroge VIES avec un budget court quand un numero est fourni", async () => {
    mockVies.verifierTvaIntra.mockResolvedValue({
      statut: "valide",
      nom: "BE Co",
      adresse: null,
    });
    await memoriserCoordonnees({
      paymentCustomerId: "cst_1",
      coordonnees: { ...COORD, pays: "BE", tvaIntra: "BE0123456789" },
    });
    const [numero, options] = mockVies.verifierTvaIntra.mock.calls[0];
    expect(numero).toBe("BE0123456789");
    expect(options.delaiMs).toBeLessThanOrEqual(3000);
    const arg = mockDb.identiteFacturationEnAttente.upsert.mock.calls[0][0];
    expect(arg.create.tvaIntraStatut).toBe("valide");
    expect(arg.create.tvaIntraNom).toBe("BE Co");
  });

  it("un checkout recommence ecrase la saisie precedente (upsert)", async () => {
    await memoriserCoordonnees({
      paymentCustomerId: "cst_1",
      coordonnees: COORD,
    });
    const arg = mockDb.identiteFacturationEnAttente.upsert.mock.calls[0][0];
    expect(arg.update).toBeDefined();
  });
});

describe("reprendreCoordonnees", () => {
  it("transfere vers le tenant puis EFFACE la ligne d'attente", async () => {
    mockDb.identiteFacturationEnAttente.findUnique.mockResolvedValue({
      ...COORD,
      tvaIntraStatut: null,
      tvaIntraNom: null,
      createdAt: new Date("2026-08-20T10:00:00Z"),
    });
    const ok = await reprendreCoordonnees({
      tenantId: "t1",
      paymentCustomerId: "cst_1",
    });
    expect(ok).toBe(true);
    expect(mockDb.identiteFacturation.upsert).toHaveBeenCalled();
    // L'adresse d'un client ne doit pas survivre a son transfert.
    expect(mockDb.identiteFacturationEnAttente.delete).toHaveBeenCalledWith({
      where: { paymentCustomerId: "cst_1" },
    });
  });

  it("renvoie false sans reference client, sans toucher a la base", async () => {
    expect(
      await reprendreCoordonnees({ tenantId: "t1", paymentCustomerId: null }),
    ).toBe(false);
    expect(
      mockDb.identiteFacturationEnAttente.findUnique,
    ).not.toHaveBeenCalled();
  });

  it("renvoie false quand aucune saisie n'attend", async () => {
    mockDb.identiteFacturationEnAttente.findUnique.mockResolvedValue(null);
    expect(
      await reprendreCoordonnees({
        tenantId: "t1",
        paymentCustomerId: "cst_1",
      }),
    ).toBe(false);
  });

  // Appelee depuis le webhook : si elle levait, Mollie rejouerait et le
  // provisionnement repasserait.
  it("NE LEVE JAMAIS, meme si la base tombe", async () => {
    mockDb.identiteFacturationEnAttente.findUnique.mockRejectedValue(
      new Error("base HS"),
    );
    await expect(
      reprendreCoordonnees({ tenantId: "t1", paymentCustomerId: "cst_1" }),
    ).resolves.toBe(false);
  });
});

describe("purgerCoordonneesAbandonnees", () => {
  it("supprime au-dela du delai et renvoie le compte", async () => {
    mockDb.identiteFacturationEnAttente.deleteMany.mockResolvedValue({
      count: 3,
    });
    expect(await purgerCoordonneesAbandonnees(30)).toBe(3);
    const arg = mockDb.identiteFacturationEnAttente.deleteMany.mock.calls[0][0];
    expect(arg.where.createdAt.lt).toBeInstanceOf(Date);
  });
});
