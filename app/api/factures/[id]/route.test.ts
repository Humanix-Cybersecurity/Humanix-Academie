// SPDX-License-Identifier: AGPL-3.0-or-later
// Autorisation sur le telechargement d'une facture.
//
// CE QUI EST EN JEU
//
//   Une facture est une piece comptable nominative. La regle a tenir tient en
//   deux lignes, et elles ne disent pas la meme chose :
//
//     un ADMIN ne voit que les factures de SON tenant ;
//     un SUPERADMIN les voit toutes, parce que le VENDEUR de ces factures est
//     Humanix -- le cadrage par tenant protege l'acheteur, pas le vendeur.
//
//   Le second point a ete ajoute le 2026-08-31 : sans lui, personne chez
//   Humanix ne pouvait relire une facture qu'il avait lui-meme emise. C'est
//   exactement le genre d'assouplissement qui, mal ecrit, laisse un Client
//   lire les pieces d'un autre. D'ou ces tests.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockAuth, mockAudit, mockRender } = vi.hoisted(() => ({
  mockDb: { facture: { findFirst: vi.fn() } },
  mockAuth: vi.fn(),
  mockAudit: vi.fn(),
  mockRender: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/audit", () => ({
  auditLog: mockAudit,
  AuditActions: new Proxy({}, { get: (_t, p) => String(p) }),
}));
// Mock PARTIEL : pdf.tsx importe aussi StyleSheet, Document, Page… Un mock
// nu casse le chargement du module, pas le test.
vi.mock("@react-pdf/renderer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@react-pdf/renderer")>()),
  renderToBuffer: mockRender,
}));

import { GET } from "./route";

const FACTURE = {
  id: "f1",
  tenantId: "tenant-braver",
  numero: "FA-2026-0001",
  emiseLe: new Date("2026-08-31T10:00:00Z"),
  presteeLe: new Date("2026-08-17T22:54:02Z"),
  vendeur: {},
  acheteur: {},
  lignes: [],
  totalHtCentimes: 4800,
  tvaCentimes: 0,
  totalTtcCentimes: 4800,
  tauxTvaBp: 0,
  mentionTva: "TVA non applicable",
};

function session(role: string, tenantId: string) {
  return { user: { id: "u1", email: "x@humanix.test", role, tenantId } };
}
const ctx = { params: Promise.resolve({ id: "f1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockRender.mockResolvedValue(Buffer.from("%PDF-1.7 factice"));
  mockDb.facture.findFirst.mockResolvedValue(FACTURE);
});

describe("qui peut telecharger", () => {
  it("refuse un visiteur non authentifie", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(401);
  });

  it.each(["LEARNER", "MANAGER", "RSSI"])("refuse le role %s", async (r) => {
    mockAuth.mockResolvedValue(session(r, "tenant-braver"));
    expect((await GET(new Request("http://x"), ctx)).status).toBe(403);
  });
});

describe("cloisonnement entre tenants", () => {
  // LA propriete a ne jamais perdre : le tenant est DANS le where, il n'est
  // pas verifie apres coup. Un ADMIN d'un autre tenant obtient 404, pas la
  // piece de quelqu'un d'autre.
  it("un ADMIN ne cherche QUE dans son propre tenant", async () => {
    mockAuth.mockResolvedValue(session("ADMIN", "tenant-autre"));
    await GET(new Request("http://x"), ctx);
    expect(mockDb.facture.findFirst).toHaveBeenCalledWith({
      where: { id: "f1", tenantId: "tenant-autre" },
    });
  });

  it("un ADMIN qui vise la facture d'un autre obtient 404", async () => {
    mockAuth.mockResolvedValue(session("ADMIN", "tenant-autre"));
    mockDb.facture.findFirst.mockResolvedValue(null);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(404);
  });
});

describe("acces du vendeur", () => {
  it("un SUPERADMIN cherche sans filtre de tenant", async () => {
    mockAuth.mockResolvedValue(session("SUPERADMIN", "tenant-humanix"));
    await GET(new Request("http://x"), ctx);
    expect(mockDb.facture.findFirst).toHaveBeenCalledWith({
      where: { id: "f1" },
    });
  });

  it("et obtient bien le document", async () => {
    mockAuth.mockResolvedValue(session("SUPERADMIN", "tenant-humanix"));
    const r = await GET(new Request("http://x"), ctx);
    expect(r.status).toBe(200);
  });

  // L'entree d'audit est classee sous le tenant DE LA FACTURE, pas sous celui
  // de la session. Rangee chez Humanix, elle serait invisible la ou on la
  // cherche -- et la regle Grafana « debit d'export anormal » regroupe par
  // tenantId.
  it("classe l'audit sous le tenant de la FACTURE", async () => {
    mockAuth.mockResolvedValue(session("SUPERADMIN", "tenant-humanix"));
    await GET(new Request("http://x"), ctx);
    expect(mockAudit).toHaveBeenCalledTimes(1);
    expect(mockAudit.mock.calls[0][0]).toMatchObject({
      tenantId: "tenant-braver",
      target: { type: "facture", label: "FA-2026-0001" },
    });
    expect(mockAudit.mock.calls[0][0].message).toContain("SUPERADMIN");
  });

  it("un ADMIN de ce tenant produit la meme entree, sans mention SUPERADMIN", async () => {
    mockAuth.mockResolvedValue(session("ADMIN", "tenant-braver"));
    await GET(new Request("http://x"), ctx);
    expect(mockAudit.mock.calls[0][0].tenantId).toBe("tenant-braver");
    expect(mockAudit.mock.calls[0][0].message).not.toContain("SUPERADMIN");
  });
});
