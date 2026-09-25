// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  factureFindUnique: vi.fn(),
  tenantFindUnique: vi.fn(),
  tenantFindMany: vi.fn(),
  identiteFindUnique: vi.fn(),
  emettreFacture: vi.fn(),
  notifierFactureEmise: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    facture: { findUnique: m.factureFindUnique },
    tenant: { findUnique: m.tenantFindUnique, findMany: m.tenantFindMany },
    identiteFacturation: { findUnique: m.identiteFindUnique },
  },
}));
vi.mock("@/lib/facturation/emettre", () => ({
  emettreFacture: m.emettreFacture,
  EmissionImpossible: class EmissionImpossible extends Error {
    constructor(readonly motif: string) {
      super(motif);
    }
  },
}));
vi.mock("@/lib/facturation/notification", () => ({
  notifierFactureEmise: m.notifierFactureEmise,
}));

import {
  facturerRevendeur,
  finDePeriode,
  libellePeriode,
  referenceFactureRevendeur,
} from "./facturation";

beforeEach(() => {
  vi.clearAllMocks();
  m.factureFindUnique.mockResolvedValue(null);
  m.tenantFindUnique.mockResolvedValue({ isReseller: true });
  m.tenantFindMany.mockResolvedValue([
    { name: "Boulangerie Martin", _count: { users: 3 } },
    { name: "Cabinet Durand", _count: { users: 20 } },
  ]);
  m.identiteFindUnique.mockResolvedValue({
    pays: "FR",
    tvaIntra: null,
    tvaIntraStatut: null,
  });
  m.emettreFacture.mockResolvedValue({
    id: "f1",
    numero: "2026-0007",
    emiseLe: new Date("2026-09-30T10:00:00Z"),
    totalTtcCentimes: 10848,
  });
  m.notifierFactureEmise.mockResolvedValue({ etat: "envoyee" });
});

describe("periode", () => {
  it("libelle, fin de mois et reference", () => {
    const p = { annee: 2026, mois: 9 };
    expect(libellePeriode(p)).toBe("septembre 2026");
    expect(finDePeriode(p).toISOString()).toBe("2026-09-30T00:00:00.000Z");
    expect(referenceFactureRevendeur("t1", p)).toBe("revendeur:t1:2026-09");
  });
});

describe("facturerRevendeur", () => {
  it("emet une facture TTC a partir de la grille HT, au taux de l'acheteur", async () => {
    const r = await facturerRevendeur({
      tenantId: "t1",
      periode: { annee: 2026, mois: 9 },
    });
    expect(r).toMatchObject({ etat: "emise", numero: "2026-0007" });
    // 8 (plancher) + 20 = 28 utilisateurs, tranche 1 a 100 ; TVA 20 %
    expect(m.emettreFacture).toHaveBeenCalledWith({
      tenantId: "t1",
      paiementRef: "revendeur:t1:2026-09",
      presteeLe: new Date("2026-09-30T00:00:00.000Z"),
      lignes: [
        {
          designation: "Licence revendeur (septembre 2026)",
          quantite: 1,
          prixUnitaireTtcCentimes: 4800,
        },
        {
          designation: "Utilisateurs actifs, tranche 1 à 100 (septembre 2026)",
          quantite: 28,
          prixUnitaireTtcCentimes: 216,
        },
      ],
    });
    expect(m.notifierFactureEmise).toHaveBeenCalledWith(
      expect.objectContaining({ factureId: "f1", numero: "2026-0007" }),
    );
  });

  it("ne compte que les espaces actifs et les utilisateurs actifs", async () => {
    await facturerRevendeur({
      tenantId: "t1",
      periode: { annee: 2026, mois: 9 },
    });
    expect(m.tenantFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentTenantId: "t1", isActive: true },
        select: expect.objectContaining({
          _count: { select: { users: { where: { isActive: true } } } },
        }),
      }),
    );
  });

  it("applique un taux nul en autoliquidation intracommunautaire", async () => {
    m.identiteFindUnique.mockResolvedValue({
      pays: "BE",
      tvaIntra: "BE0123456789",
      tvaIntraStatut: "valide",
    });
    await facturerRevendeur({
      tenantId: "t1",
      periode: { annee: 2026, mois: 9 },
    });
    const lignes = m.emettreFacture.mock.calls[0][0].lignes;
    expect(lignes[0].prixUnitaireTtcCentimes).toBe(4000);
    expect(lignes[1].prixUnitaireTtcCentimes).toBe(180);
  });

  it("est idempotente sur le mois", async () => {
    m.factureFindUnique.mockResolvedValue({ numero: "2026-0007" });
    const r = await facturerRevendeur({
      tenantId: "t1",
      periode: { annee: 2026, mois: 9 },
    });
    expect(r).toEqual({ etat: "deja_emise", numero: "2026-0007" });
    expect(m.emettreFacture).not.toHaveBeenCalled();
  });

  it("refuse sans identite de facturation, sans rien emettre", async () => {
    m.identiteFindUnique.mockResolvedValue(null);
    const r = await facturerRevendeur({ tenantId: "t1" });
    expect(r).toEqual({
      etat: "refusee",
      motif: "identite_facturation_absente",
    });
    expect(m.emettreFacture).not.toHaveBeenCalled();
  });

  it("refuse un tenant qui n'est pas revendeur", async () => {
    m.tenantFindUnique.mockResolvedValue({ isReseller: false });
    const r = await facturerRevendeur({ tenantId: "t1" });
    expect(r).toEqual({ etat: "refusee", motif: "pas_revendeur" });
  });
});
