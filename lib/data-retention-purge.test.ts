// SPDX-License-Identifier: AGPL-3.0-or-later
//
// executePurge() SUPPRIME DES DONNEES. C'est le seul chemin du produit qui le
// fait en masse, et il n'etait couvert par aucun test -- `data-retention.test.ts`
// ne teste que les helpers purs et annonce « teste en integration post-launch ».
//
// On ne cherche pas ici a couvrir toute la purge, mais l'invariant qui decide
// de la conception du parcours de conformite :
//
//   ce qui appartient a la PERSONNE part avec elle,
//   ce qui decrit l'ENTREPRISE reste pour son successeur.
//
// Se tromper de cote signifie soit une progression fantome attachee a un compte
// anonymise, soit une organisation qui repart de zero a chaque depart.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockAudit } = vi.hoisted(() => ({
  mockDb: {
    tenant: { findUnique: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn(), update: vi.fn() },
    event: { deleteMany: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    etapeApprentissageDpo: { deleteMany: vi.fn() },
    etapeConformiteTenant: { deleteMany: vi.fn() },
  },
  mockAudit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  auditLog: mockAudit,
  AuditActions: new Proxy({}, { get: (_t, p) => String(p) }),
  AuditOutcomes: new Proxy({}, { get: (_t, p) => String(p) }),
}));

import { executePurge } from "./data-retention";

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.tenant.findUnique.mockResolvedValue({
    id: "t1",
    dataRetentionDays: 365,
  });
  mockDb.tenant.update.mockResolvedValue({});
  mockDb.event.deleteMany.mockResolvedValue({ count: 0 });
  mockDb.auditLog.deleteMany.mockResolvedValue({ count: 0 });
  mockDb.etapeApprentissageDpo.deleteMany.mockResolvedValue({ count: 0 });
  mockDb.user.update.mockResolvedValue({});
  // Un inactif, non encore anonymise.
  mockDb.user.findMany.mockResolvedValue([
    { id: "u-parti", email: "personne@client.fr" },
  ]);
});

describe("executePurge - le parcours de conformite au depart d'une personne", () => {
  it("supprime les etapes d'APPRENTISSAGE de l'inactif", () => {
    return executePurge("t1").then(() => {
      expect(mockDb.etapeApprentissageDpo.deleteMany).toHaveBeenCalledWith({
        where: { userId: "u-parti" },
      });
    });
  });

  it("ne touche JAMAIS aux etapes d'entreprise", async () => {
    // Elles decrivent l'organisation. Les effacer ferait repartir le
    // successeur de zero -- exactement le probleme que le parcours resout.
    await executePurge("t1");
    expect(mockDb.etapeConformiteTenant.deleteMany).not.toHaveBeenCalled();
  });

  it("supprime AVANT d'anonymiser, pas apres", async () => {
    // L'anonymisation conserve l'identifiant. L'ordre n'est donc pas
    // fonctionnellement critique, mais s'en remettre a l'ordre inverse
    // laisserait une fenetre ou la ligne existe sans personne derriere.
    const ordre: string[] = [];
    mockDb.etapeApprentissageDpo.deleteMany.mockImplementation(async () => {
      ordre.push("suppression");
      return { count: 1 };
    });
    mockDb.user.update.mockImplementation(async () => {
      ordre.push("anonymisation");
      return {};
    });

    await executePurge("t1");

    expect(ordre).toEqual(["suppression", "anonymisation"]);
  });

  it("n'efface rien quand aucun compte n'est inactif", async () => {
    mockDb.user.findMany.mockResolvedValue([]);
    await executePurge("t1");
    expect(mockDb.etapeApprentissageDpo.deleteMany).not.toHaveBeenCalled();
  });

  it("epargne un compte deja anonymise", async () => {
    // Repasser dessus supprimerait des lignes deja traitees et fausserait les
    // compteurs rapportes a l'admin.
    mockDb.user.findMany.mockResolvedValue([
      { id: "u-deja", email: "purged-u-deja@anonymized.local" },
    ]);
    await executePurge("t1");
    expect(mockDb.etapeApprentissageDpo.deleteMany).not.toHaveBeenCalled();
  });
});
