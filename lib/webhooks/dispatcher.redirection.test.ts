// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du refus des redirections par le dispatcher webhook.
//
// Une cible de webhook est validee (https, IP publique) puis la connexion est
// epinglee sur cette IP. Suivre une redirection annulerait tout cela : c'est
// la cible qui choisirait la destination suivante. Reproduit le 2026-11-09 sur
// undici 8.12.3 : `307 Location: http://[::1]:port/` rejouait le POST et son
// corps sur le loopback de l'hote.
//
// Ce fichier verifie le contrat du dispatcher : la requete part en
// `redirect: "manual"`, un statut de redirection devient un echec explicite
// ("redirect_refused") trace dans TenantWebhook.lastError, et rien d'autre
// n'est emis. Que l'option empeche REELLEMENT undici de suivre, et que l'agent
// refuse un litteral d'IP hors liste, est prouve sur de vraies connexions
// dans lib/net/pinned-agent.test.ts.
//
// Fichier separe de dispatcher.test.ts : ces tests doublent `@/lib/db` et le
// `fetch` d'undici, ce dont les tests des helpers purs n'ont pas besoin.

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as dnsPromises from "node:dns/promises";
import { Agent, fetch as fetchUndici } from "undici";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    tenant: { findUnique: vi.fn() },
    tenantWebhook: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
// On double le `fetch` D'UNDICI, celui que le dispatcher appelle, pas le
// global : sinon « une seule requete » et « redirect: manual » passeraient a
// vide. `Agent` reste reel.
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: vi.fn(),
}));

import { fireWebhook, testWebhook } from "./dispatcher";

const mockLookup = dnsPromises.lookup as unknown as ReturnType<typeof vi.fn>;
const fetchSpy = vi.mocked(fetchUndici);

type UndiciResponse = Awaited<ReturnType<typeof fetchUndici>>;

function respond(status: number, location?: string): UndiciResponse {
  return new Response(null, {
    status,
    headers: location ? { location } : {},
  }) as unknown as UndiciResponse;
}

function sentInit(call = 0): {
  method?: string;
  redirect?: string;
  dispatcher?: unknown;
} {
  return fetchSpy.mock.calls[call][1] as never;
}

const WEBHOOK = {
  id: "wh-1",
  tenantId: "t-1",
  label: "Canal de test",
  type: "GENERIC" as const,
  url: "https://hook.example.com/in",
  events: "user.invited",
  secret: "s3cret",
  isActive: true,
};

beforeEach(() => {
  mockLookup.mockReset();
  fetchSpy.mockReset();
  mockDb.tenant.findUnique.mockReset();
  mockDb.tenantWebhook.findUnique.mockReset();
  mockDb.tenantWebhook.findMany.mockReset();
  mockDb.tenantWebhook.update.mockReset();

  // La cible est legitime en apparence : https, IP publique.
  mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  mockDb.tenant.findUnique.mockResolvedValue({ name: "Acme" });
  mockDb.tenantWebhook.findUnique.mockResolvedValue(WEBHOOK);
  mockDb.tenantWebhook.findMany.mockResolvedValue([WEBHOOK]);
  mockDb.tenantWebhook.update.mockResolvedValue({});
});

describe("dispatcher webhook - une redirection n'est jamais suivie", () => {
  it("emet la requete en redirect: manual, sur un agent epingle", async () => {
    fetchSpy.mockResolvedValue(respond(200));

    await testWebhook("wh-1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://hook.example.com/in");
    expect(sentInit().method).toBe("POST");
    expect(sentInit().redirect).toBe("manual");
    expect(sentInit().dispatcher).toBeInstanceOf(Agent);
  });

  it.each([301, 302, 303, 307, 308])(
    "testWebhook : un HTTP %i est un echec explicite, sans 2e requete",
    async (status) => {
      // La cible validee tente d'envoyer le POST sur le loopback de l'hote.
      fetchSpy.mockResolvedValue(respond(status, "http://[::1]:8080/interne"));

      const result = await testWebhook("wh-1");

      expect(result).toEqual({ ok: false, status, error: "redirect_refused" });
      // Une seule requete : la destination annoncee par Location n'est jamais
      // jointe, quelle qu'elle soit.
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      // L'echec est trace la ou l'admin le lit (console des integrations).
      expect(mockDb.tenantWebhook.update).toHaveBeenCalledTimes(1);
      const { where, data } = mockDb.tenantWebhook.update.mock.calls[0][0];
      expect(where).toEqual({ id: "wh-1" });
      expect(data.failureCount).toEqual({ increment: 1 });
      expect(data.lastError).toBe(`HTTP ${status} - redirect_refused`);
    },
  );

  it("fireWebhook : meme refus sur le chemin d'envoi reel", async () => {
    fetchSpy.mockResolvedValue(respond(307, "http://0.0.0.0:3000/interne"));

    await fireWebhook("t-1", "user.invited", { email: "bob@acme.fr" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(sentInit().redirect).toBe("manual");
    expect(mockDb.tenantWebhook.update).toHaveBeenCalledTimes(1);
    const { where, data } = mockDb.tenantWebhook.update.mock.calls[0][0];
    expect(where).toEqual({ id: "wh-1" });
    expect(data.failureCount).toEqual({ increment: 1 });
    expect(data.lastError).toBe("HTTP 307 - redirect_refused");
  });

  it("temoin : une reponse 200 reste un succes", async () => {
    fetchSpy.mockResolvedValue(respond(200));

    const result = await testWebhook("wh-1");

    expect(result).toEqual({ ok: true, status: 200 });
    const { data } = mockDb.tenantWebhook.update.mock.calls[0][0];
    expect(data.successCount).toEqual({ increment: 1 });
    expect(data.lastError).toBeNull();
  });

  it("temoin : un 404 reste un echec HTTP ordinaire, sans le code de redirection", async () => {
    fetchSpy.mockResolvedValue(respond(404));

    const result = await testWebhook("wh-1");

    expect(result).toEqual({ ok: false, status: 404, error: undefined });
    const { data } = mockDb.tenantWebhook.update.mock.calls[0][0];
    expect(data.lastError).toBe("HTTP 404");
  });
});
