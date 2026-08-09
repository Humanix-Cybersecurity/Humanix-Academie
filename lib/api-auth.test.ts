// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests de l'authentification par cle d'API (#754).
//
// C'est le portier des endpoints /api/v1/* : une cle revoquee, expiree, ou
// appartenant a un tenant qui a downgrade ne doit JAMAIS passer. On verifie
// aussi qu'aucune cle en clair ne touche la BDD (lookup par hash).

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

// Hash opaque (ne reinjecte PAS le token en clair) : sans ca, l'assertion
// « le secret n'apparait pas dans la clause » serait vide de sens.
const FAKE_HASH = "b5f3c1a90e7d4f22";
vi.mock("@/lib/crypto", () => ({
  hashApiKey: vi.fn(() => "b5f3c1a90e7d4f22"),
}));

import { authenticateApiKey } from "./api-auth";
import { db } from "@/lib/db";
import { hashApiKey } from "@/lib/crypto";

const dbMock = db as unknown as {
  apiKey: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const hashApiKeyMock = hashApiKey as unknown as ReturnType<typeof vi.fn>;

const VALID_TOKEN = "hxa_cle_valide_123";

function reqWith(header?: string): Request {
  return new Request("https://humanix-academie.fr/api/v1/users", {
    headers: header ? { authorization: header } : {},
  });
}

/** Cle active, non expiree, sur un tenant Pro (plan qui a la feature api). */
function activeKey(over: Record<string, unknown> = {}) {
  return {
    id: "key1",
    tenantId: "t1",
    isActive: true,
    expiresAt: null,
    tenant: { plan: "pro" },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.apiKey.update.mockReturnValue({ catch: vi.fn() });
});

describe("authenticateApiKey — rejets avant tout acces BDD", () => {
  it("refuse une requete sans header Authorization", async () => {
    const res = await authenticateApiKey(reqWith());
    expect(res).toEqual({ ok: false, error: "missing_token", status: 401 });
    expect(dbMock.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it("refuse un schema d'auth autre que Bearer", async () => {
    const res = await authenticateApiKey(reqWith("Basic abcdef"));
    expect(res).toEqual({ ok: false, error: "missing_token", status: 401 });
    expect(dbMock.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it("refuse un token qui n'a pas le prefixe hxa_", async () => {
    const res = await authenticateApiKey(
      reqWith("Bearer sk_live_autre_produit"),
    );
    expect(res).toEqual({
      ok: false,
      error: "invalid_token_format",
      status: 401,
    });
    expect(dbMock.apiKey.findUnique).not.toHaveBeenCalled();
  });
});

describe("authenticateApiKey — validite de la cle", () => {
  it("cherche la cle par son HASH, jamais en clair", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(activeKey());

    await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));

    expect(hashApiKeyMock).toHaveBeenCalledWith(VALID_TOKEN);
    const { where } = dbMock.apiKey.findUnique.mock.calls[0][0];
    expect(where).toEqual({ hashedKey: FAKE_HASH });
    // Le secret ne doit apparaitre nulle part dans la clause.
    expect(JSON.stringify(where)).not.toContain("cle_valide_123");
  });

  it("refuse une cle inconnue", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(null);
    const res = await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));
    expect(res).toEqual({ ok: false, error: "invalid_token", status: 401 });
  });

  it("refuse une cle revoquee (isActive=false)", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(activeKey({ isActive: false }));
    const res = await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));
    expect(res).toEqual({ ok: false, error: "invalid_token", status: 401 });
  });

  it("refuse une cle expiree", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(
      activeKey({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));
    expect(res).toEqual({ ok: false, error: "token_expired", status: 401 });
  });

  it("accepte une cle dont l'expiration est dans le futur", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(
      activeKey({ expiresAt: new Date(Date.now() + 86_400_000) }),
    );
    const res = await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));
    expect(res).toMatchObject({ ok: true, tenantId: "t1" });
  });

  it("tolere les espaces autour du token", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(activeKey());
    const res = await authenticateApiKey(reqWith(`Bearer  ${VALID_TOKEN}  `));
    expect(res).toMatchObject({ ok: true });
  });
});

describe("authenticateApiKey — plan-gating", () => {
  it("refuse en 402 un tenant qui a downgrade, meme avec une cle valide", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(
      activeKey({ tenant: { plan: "starter" } }),
    );

    const res = await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));
    expect(res).toEqual({
      ok: false,
      error: "plan_upgrade_required",
      status: 402,
    });
    // Et surtout : on ne fuite pas le tenantId a un appelant non autorise.
    expect(res.tenantId).toBeUndefined();
  });

  it("refuse aussi quand le tenant est absent (plan indeterminable)", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(activeKey({ tenant: null }));
    const res = await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));
    expect(res.ok).toBe(false);
    expect(res.status).toBe(402);
  });
});

describe("authenticateApiKey — succes", () => {
  it("retourne le tenantId et l'id de cle", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(activeKey());
    const res = await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));
    expect(res).toEqual({ ok: true, tenantId: "t1", apiKeyId: "key1" });
  });

  it("met a jour lastUsedAt sans bloquer la reponse", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(activeKey());
    await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));

    expect(dbMock.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key1" },
        data: { lastUsedAt: expect.any(Date) },
      }),
    );
  });

  it("ne met PAS a jour lastUsedAt quand l'authentification echoue", async () => {
    dbMock.apiKey.findUnique.mockResolvedValue(activeKey({ isActive: false }));
    await authenticateApiKey(reqWith(`Bearer ${VALID_TOKEN}`));
    expect(dbMock.apiKey.update).not.toHaveBeenCalled();
  });
});
