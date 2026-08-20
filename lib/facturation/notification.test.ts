// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la notification de facture.
//
// Deux proprietes protegees :
//   1. le mail ne porte JAMAIS la facture, seulement un lien ;
//   2. la fonction ne leve jamais -- elle est appelee depuis le webhook.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockEmail } = vi.hoisted(() => ({
  mockDb: {
    user: { findMany: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
  mockEmail: { sendEmail: vi.fn(), isEmailConfigured: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email", () => mockEmail);
vi.mock("@/lib/subdomain-tenant", () => ({
  getAppBaseUrl: () => "https://humanix-academie.fr",
}));

import { notifierFactureEmise } from "./notification";

const FACTURE = {
  tenantId: "t1",
  factureId: "f1",
  numero: "FA-2026-0001",
  emiseLe: new Date("2026-08-20T10:00:00Z"),
  totalTtcCentimes: 4800,
};

beforeEach(() => {
  mockDb.user.findMany.mockReset();
  mockDb.tenant.findUnique.mockReset();
  mockEmail.sendEmail.mockReset();
  mockEmail.isEmailConfigured.mockReturnValue(true);
  mockDb.user.findMany.mockResolvedValue([
    { email: "admin@client.test", name: "Admin" },
  ]);
  mockDb.tenant.findUnique.mockResolvedValue({ name: "Client Test" });
  mockEmail.sendEmail.mockResolvedValue({ ok: true });
});

describe("notifierFactureEmise", () => {
  it("envoie aux ADMIN actifs du tenant, et a eux seuls", async () => {
    const r = await notifierFactureEmise(FACTURE);
    expect(r.etat).toBe("envoyee");
    const filtre = mockDb.user.findMany.mock.calls[0][0].where;
    expect(filtre.tenantId).toBe("t1");
    expect(filtre.role).toBe("ADMIN");
    expect(filtre.isActive).toBe(true);
  });

  it("le sujet porte le numero et le montant", async () => {
    await notifierFactureEmise(FACTURE);
    const arg = mockEmail.sendEmail.mock.calls[0][0];
    expect(arg.subject).toContain("FA-2026-0001");
    expect(arg.subject).toContain("48,00");
  });

  // La propriete centrale : aucune piece comptable ne circule par mail.
  it("N'ATTACHE PAS la facture : le message ne porte qu'un lien", async () => {
    await notifierFactureEmise(FACTURE);
    const arg = mockEmail.sendEmail.mock.calls[0][0];
    expect(arg.attachments).toBeUndefined();
    expect(arg.html).toContain("https://humanix-academie.fr/admin/billing");
    expect(arg.text).toContain("https://humanix-academie.fr/admin/billing");
    // Et rien qui ressemble a un PDF embarque.
    expect(arg.html).not.toContain("%PDF");
    expect(arg.html).not.toContain("base64");
  });

  it("est marque transactionnel (en-tetes Gmail/Outlook)", async () => {
    await notifierFactureEmise(FACTURE);
    expect(mockEmail.sendEmail.mock.calls[0][0].unsubscribe).toEqual({
      kind: "transactional",
    });
  });

  it("echappe le nom du tenant dans le HTML", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ name: 'Dupont & Fils <b>' });
    await notifierFactureEmise(FACTURE);
    const html = mockEmail.sendEmail.mock.calls[0][0].html;
    expect(html).toContain("Dupont &amp; Fils &lt;b&gt;");
    expect(html).not.toContain("Dupont & Fils <b>");
  });

  it("n'envoie rien si aucun ADMIN actif", async () => {
    mockDb.user.findMany.mockResolvedValue([]);
    const r = await notifierFactureEmise(FACTURE);
    expect(r).toEqual({ etat: "ignoree", motif: "aucun_admin_actif" });
    expect(mockEmail.sendEmail).not.toHaveBeenCalled();
  });

  // Un compte anonymise par la retention RGPD n'a plus d'adresse valide.
  it("ecarte les comptes anonymises", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { email: "purged-abc@anonymized.local", name: null },
    ]);
    const r = await notifierFactureEmise(FACTURE);
    expect(r).toEqual({ etat: "ignoree", motif: "aucun_admin_actif" });
  });

  it("n'envoie rien si la messagerie n'est pas configuree", async () => {
    mockEmail.isEmailConfigured.mockReturnValue(false);
    const r = await notifierFactureEmise(FACTURE);
    expect(r).toEqual({ etat: "ignoree", motif: "email_non_configure" });
    expect(mockDb.user.findMany).not.toHaveBeenCalled();
  });

  // Appelee depuis le webhook : si elle levait, Mollie rejouerait et le
  // provisionnement repasserait.
  it("NE LEVE JAMAIS, meme si la base tombe", async () => {
    mockDb.user.findMany.mockRejectedValue(new Error("base HS"));
    const r = await notifierFactureEmise(FACTURE);
    expect(r.etat).toBe("ignoree");
  });

  it("NE LEVE JAMAIS, meme si l'envoi echoue", async () => {
    mockEmail.sendEmail.mockRejectedValue(new Error("SMTP HS"));
    const r = await notifierFactureEmise(FACTURE);
    expect(r.etat).toBe("ignoree");
  });
});
