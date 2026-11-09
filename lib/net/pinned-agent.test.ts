// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de l'epinglage (pin) anti DNS-rebinding.
//
// Coeur de la garantie : une fois l'IP validee par le garde SSRF, la connexion
// sortante DOIT cibler EXACTEMENT cette IP -- jamais une 2e resolution du
// hostname (que l'attaquant pourrait rebinder vers loopback/metadata/RFC1918).

import { describe, it, expect, beforeAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
// `fetch` d'undici et non le global : ce test fait une VRAIE requete a
// travers l'Agent epingle. Avec le fetch global, les deux moities viendraient
// de paquets undici differents et la requete echouerait sur
// `invalid onRequestStart method` des undici 8 -- le defaut meme que ce module
// a rencontre en production. Cf. lib/webhooks/dispatcher.ts.
import { Agent, fetch as fetchUndici } from "undici";
import {
  PINNED_ADDRESS_REFUSED,
  buildPinnedAgent,
  isRedirectStatus,
  makePinnedHostGuard,
  makePinnedLookup,
} from "./pinned-agent";

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
      // Plus de cast : le fetch d'undici type `dispatcher` nativement, la ou
      // les types DOM Fetch l'ignoraient et imposaient une acrobatie.
      const res = await fetchUndici(`http://dns-rebind.invalid:${port}/hook`, {
        dispatcher: agent,
      });
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

describe("isRedirectStatus - ce que fetch() suivrait", () => {
  it("reconnait les cinq statuts de redirection de la norme Fetch", () => {
    for (const status of [301, 302, 303, 307, 308]) {
      expect(isRedirectStatus(status)).toBe(true);
    }
  });

  it("ne confond ni les succes ni les autres 3xx", () => {
    for (const status of [200, 204, 300, 304, 305, 400, 500]) {
      expect(isRedirectStatus(status)).toBe(false);
    }
  });
});

describe("makePinnedHostGuard - aucune adresse litterale hors liste", () => {
  const guard = makePinnedHostGuard([
    { address: "93.184.216.34", family: 4 },
    { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
  ]);

  it("laisse passer un NOM d'hote : c'est lookup qui le ramene aux adresses epinglees", () => {
    expect(guard("hooks.example.com")).toBe(true);
    expect(guard("attacker-rebind.invalid")).toBe(true);
    expect(guard("localhost")).toBe(true);
  });

  it("laisse passer une adresse litterale qui FAIT PARTIE de la liste", () => {
    expect(guard("93.184.216.34")).toBe(true);
    expect(guard("2606:2800:220:1:248:1893:25c8:1946")).toBe(true);
  });

  it("REFUSE loopback, metadata cloud et reseau prive ecrits en litteral", () => {
    // Ce sont les cibles d'une redirection hostile : node:net les joindrait
    // SANS appeler lookup, donc sans passer par l'epinglage.
    for (const host of [
      "127.0.0.1",
      "0.0.0.0",
      "169.254.169.254",
      "169.254.42.42",
      "10.0.0.1",
      "192.168.1.1",
      "::1",
      "::",
      "fe80::1",
      "fd00::1",
    ]) {
      expect(guard(host)).toBe(false);
    }
  });

  it("REFUSE une autre adresse publique : seule la liste compte, pas la plage", () => {
    expect(guard("93.184.216.35")).toBe(false);
    expect(guard("2606:2800:220:1:248:1893:25c8:1947")).toBe(false);
  });

  it("compare les adresses, pas leur ecriture", () => {
    // Meme IPv6, casse et zeros de tete differents.
    expect(guard("2606:2800:0220:0001:0248:1893:25C8:1946")).toBe(true);
    // IPv4 enveloppee en IPv6 : c'est la meme machine que l'IPv4 epinglee...
    expect(guard("::ffff:93.184.216.34")).toBe(true);
    expect(guard("::ffff:5db8:d822")).toBe(true);
    // ...et le loopback enveloppe reste dehors (dotted ET hex).
    expect(guard("::ffff:127.0.0.1")).toBe(false);
    expect(guard("::ffff:7f00:1")).toBe(false);
  });

  it("leve sans adresse, ou si une adresse epinglee n'en est pas une", () => {
    expect(() => makePinnedHostGuard([])).toThrow();
    expect(() =>
      makePinnedHostGuard([{ address: "pas-une-adresse", family: 4 }]),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// La scene de l'attaque, avec de VRAIES connexions sur la boucle locale.
//
// `target` joue la cible VALIDEE par le garde SSRF : elle vit sur 127.0.0.1,
// seule adresse epinglee, et repond 307 vers `location`. `internal` joue le
// service qui ne devait jamais etre joint ; il note ce qu'il recoit.
// ---------------------------------------------------------------------------
function listen(server: http.Server, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () =>
      resolve((server.address() as AddressInfo).port),
    );
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

type Scene = {
  url: string;
  agent: Agent;
  location: string;
  received: string[];
};

async function withRedirectingTarget(
  internalHost: string,
  makeLocation: (internalPort: number) => string,
  run: (scene: Scene) => Promise<void>,
): Promise<void> {
  const received: string[] = [];
  const internal = http.createServer((req, res) => {
    received.push(`${req.method} ${req.url}`);
    res.writeHead(204).end();
  });
  const internalPort = await listen(internal, internalHost);
  const location = makeLocation(internalPort);
  const target = http.createServer((_req, res) => {
    res.writeHead(307, { location }).end();
  });
  const targetPort = await listen(target, "127.0.0.1");
  const agent = buildPinnedAgent([{ address: "127.0.0.1", family: 4 }]);
  try {
    await run({
      url: `http://webhook.example.test:${targetPort}/hook`,
      agent,
      location,
      received,
    });
  } finally {
    await agent.destroy().catch(() => {});
    await Promise.all([close(internal), close(target)]);
  }
}

const post = { method: "POST", body: JSON.stringify({ event: "test" }) };

/** fetch() emballe l'erreur du connecteur dans `cause` : on en lit le code. */
function causeCode(err: unknown): string | undefined {
  return (err as { cause?: { code?: string } } | null)?.cause?.code;
}

describe("buildPinnedAgent - une redirection ne fait pas sortir le socket de la liste", () => {
  // ::1 n'existe pas partout (conteneur sans IPv6). Le scenario IPv6 est saute
  // la ou il manque ; le scenario 0.0.0.0, lui, tourne partout.
  let hasIpv6Loopback = false;
  beforeAll(async () => {
    const probe = http.createServer();
    hasIpv6Loopback = await listen(probe, "::1").then(
      () => true,
      () => false,
    );
    if (hasIpv6Loopback) await close(probe);
  });

  it("REFUSE la redirection vers 0.0.0.0 : le service local ne recoit rien", async () => {
    // 0.0.0.0 designe la machine elle-meme pour connect(), sous Linux comme
    // sous macOS : c'est le contournement classique des filtres « 127.x ».
    await withRedirectingTarget(
      "127.0.0.1",
      (port) => `http://0.0.0.0:${port}/interne`,
      async ({ url, agent, received }) => {
        const err = await fetchUndici(url, { ...post, dispatcher: agent }).then(
          () => null,
          (e: unknown) => e,
        );
        expect(err).toBeInstanceOf(TypeError);
        expect(causeCode(err)).toBe(PINNED_ADDRESS_REFUSED);
        expect(received).toEqual([]);
      },
    );
  });

  it("REFUSE la redirection vers [::1] : le service local ne recoit rien", async (ctx) => {
    if (!hasIpv6Loopback) ctx.skip();
    await withRedirectingTarget(
      "::1",
      (port) => `http://[::1]:${port}/interne`,
      async ({ url, agent, received }) => {
        const err = await fetchUndici(url, { ...post, dispatcher: agent }).then(
          () => null,
          (e: unknown) => e,
        );
        expect(err).toBeInstanceOf(TypeError);
        expect(causeCode(err)).toBe(PINNED_ADDRESS_REFUSED);
        expect(received).toEqual([]);
      },
    );
  });

  it("une redirection vers un NOM d'hote retombe sur l'adresse epinglee, pas ailleurs", async () => {
    // `metadata.invalid` ne resout nulle part : si la requete arrive, c'est
    // que lookup l'a ramenee sur 127.0.0.1, l'adresse validee.
    await withRedirectingTarget(
      "127.0.0.1",
      (port) => `http://metadata.invalid:${port}/suite`,
      async ({ url, agent, received }) => {
        const res = await fetchUndici(url, { ...post, dispatcher: agent });
        expect(res.status).toBe(204);
        expect(received).toEqual(["POST /suite"]);
      },
    );
  });

  it("ne garantit que l'ADRESSE : une redirection vers l'IP epinglee elle-meme passe", async () => {
    // D'ou le `redirect: "manual"` des appelants : l'agent borne ou va le
    // socket, pas ce que la cible validee fait faire a la requete.
    await withRedirectingTarget(
      "127.0.0.1",
      (port) => `http://127.0.0.1:${port}/suite`,
      async ({ url, agent, received }) => {
        const res = await fetchUndici(url, { ...post, dispatcher: agent });
        expect(res.status).toBe(204);
        expect(res.redirected).toBe(true);
        expect(received).toEqual(["POST /suite"]);
      },
    );
  });

  it('avec `redirect: "manual"`, le fetch d\'undici rend le 3xx SANS le suivre', async () => {
    // C'est ce sur quoi reposent lib/webhooks/dispatcher.ts et
    // lib/ciso-assistant/client.ts. La redirection vise ici une adresse que
    // l'agent laisserait passer : si `manual` cessait d'etre respecte par une
    // version d'undici, le service recevrait la requete et ce test tomberait.
    await withRedirectingTarget(
      "127.0.0.1",
      (port) => `http://127.0.0.1:${port}/suite`,
      async ({ url, agent, location, received }) => {
        const res = await fetchUndici(url, {
          ...post,
          redirect: "manual",
          dispatcher: agent,
        });
        expect(res.status).toBe(307);
        expect(isRedirectStatus(res.status)).toBe(true);
        expect(res.headers.get("location")).toBe(location);
        expect(received).toEqual([]);
      },
    );
  });

  it("joint une URL dont l'hote est DEJA l'adresse epinglee (litteral dans la liste)", async () => {
    const server = http.createServer((_req, res) => res.writeHead(200).end());
    const port = await listen(server, "127.0.0.1");
    const agent = buildPinnedAgent([{ address: "127.0.0.1", family: 4 }]);
    try {
      const res = await fetchUndici(`http://127.0.0.1:${port}/hook`, {
        dispatcher: agent,
      });
      expect(res.status).toBe(200);
    } finally {
      await agent.destroy().catch(() => {});
      await close(server);
    }
  });
});
