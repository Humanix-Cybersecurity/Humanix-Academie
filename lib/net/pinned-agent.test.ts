// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de l'epinglage (pin) anti DNS-rebinding.
//
// Coeur de la garantie : une fois l'IP validee par le garde SSRF, la connexion
// sortante DOIT cibler EXACTEMENT cette IP -- jamais une 2e resolution du
// hostname (que l'attaquant pourrait rebinder vers loopback/metadata/RFC1918).

import { describe, it, expect } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Agent } from "undici";
import { buildPinnedAgent, makePinnedLookup } from "./pinned-agent";

describe("makePinnedLookup - court-circuit DNS vers l'IP validee", () => {
  it("renvoie le tableau d'adresses epinglees (forme all:true, Node 20)", () => {
    const lookup = makePinnedLookup([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
    let err: unknown;
    let addr: unknown;
    lookup("attacker-rebind.invalid", { all: true }, (e, a) => {
      err = e;
      addr = a;
    });
    expect(err).toBeNull();
    expect(addr).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
  });

  it("renvoie la 1ere adresse (forme mono-adresse, all absent)", () => {
    const lookup = makePinnedLookup([{ address: "93.184.216.34", family: 4 }]);
    const captured: unknown[] = [];
    lookup("attacker-rebind.invalid", undefined, (e, a, f) => {
      captured.push(e, a, f);
    });
    expect(captured).toEqual([null, "93.184.216.34", 4]);
  });

  it("IGNORE totalement le hostname demande (coeur de l'anti-rebinding)", () => {
    const lookup = makePinnedLookup([{ address: "93.184.216.34", family: 4 }]);
    let a1: unknown;
    let a2: unknown;
    // 1er appel : le hostname public (validation). 2e appel : la valeur que
    // l'attaquant rebinderait. Les deux renvoient l'IP epinglee, jamais l'autre.
    lookup("public-at-validation.example", undefined, (_e, a) => (a1 = a));
    lookup("169.254.169.254", undefined, (_e, a) => (a2 = a));
    expect(a1).toBe("93.184.216.34");
    expect(a2).toBe("93.184.216.34");
  });

  it("leve si aucune adresse validee n'est fournie", () => {
    expect(() => makePinnedLookup([])).toThrow();
  });
});

describe("buildPinnedAgent - epinglage de la connexion sortante", () => {
  it("retourne un undici Agent", () => {
    const agent = buildPinnedAgent([{ address: "127.0.0.1", family: 4 }]);
    expect(agent).toBeInstanceOf(Agent);
  });

  it("leve si aucune adresse fournie", () => {
    expect(() => buildPinnedAgent([])).toThrow();
  });

  it("epingle la connexion sur l'IP validee : le hostname n'est JAMAIS re-resolu (anti DNS-rebinding)", async () => {
    // Serveur local = l'IP "validee" (127.0.0.1). On epingle la connexion dessus.
    const server = http.createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ host: req.headers.host, url: req.url }));
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const port = (server.address() as AddressInfo).port;
    const agent = buildPinnedAgent([{ address: "127.0.0.1", family: 4 }]);
    try {
      // `dns-rebind.invalid` NE RESOUT PAS en vrai DNS. La requete n'aboutit QUE
      // parce que la connexion est epinglee sur 127.0.0.1 : si le code
      // re-resolvait le hostname (= fenetre TOCTOU), on aurait un ENOTFOUND.
      const res = await fetch(`http://dns-rebind.invalid:${port}/hook`, {
        dispatcher: agent,
      } as RequestInit & { dispatcher: unknown });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { host: string; url: string };
      expect(body.url).toBe("/hook");
      // Host header preserve = autorite d'origine de l'URL : le routage vhost et
      // (en TLS) le SNI restent le hostname, seule la cible IP est figee.
      expect(body.host).toBe(`dns-rebind.invalid:${port}`);
    } finally {
      await agent.close().catch(() => {});
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
