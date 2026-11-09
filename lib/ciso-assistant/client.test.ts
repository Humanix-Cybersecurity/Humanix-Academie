// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du garde anti-SSRF du client CISO Assistant.
//
// Le baseUrl CISO est configure par un admin TENANT et chaque requete porte
// le token Knox dans l'en-tete Authorization (cf. request() + uploadAttachment).
// Politique VOLONTAIREMENT differente du dispatcher webhook : un CISO Assistant
// peut etre legitimement auto-heberge sur un reseau prive (RFC1918 / ULA / CGNAT
// AUTORISES), mais les plages JAMAIS legitimes (loopback, link-local/metadata
// cloud, unspecified, multicast) sont bloquees -- y compris via IPv6-mapped.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as dnsPromises from "node:dns/promises";
import { Agent, fetch as fetchUndici } from "undici";
import {
  CisoAssistantClient,
  CisoError,
  isForbiddenCisoIp,
  testCisoConnection,
} from "./client";

// On mock la resolution DNS du baseUrl pour piloter ce que VOIT le garde, et on
// espionne fetch() pour observer (a) qu'aucune connexion ne part vers une cible
// interdite, (b) que la connexion autorisee porte bien un dispatcher epingle.
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));

// ON DOUBLE LE `fetch` D'UNDICI, PLUS CELUI DU GLOBAL.
//
// `client.ts` appelait le fetch global avec un dispatcher issu du paquet npm
// `undici`. Les deux moities venaient de paquets differents, ce qui a casse a
// undici 8 (`invalid onRequestStart method`). Le code prend desormais le fetch
// d'undici, donc l'espion doit le suivre.
//
// Ce n'est pas cosmetique : laisse sur `globalThis.fetch`, l'assertion
// « aucune connexion n'est partie » passerait A VIDE -- le code n'appelle plus
// ce fetch-la. Un test vert qui ne prouve plus rien est pire qu'un test rouge.
//
// `Agent` reste REEL : les tests verifient `dispatcher instanceof Agent`.
vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: vi.fn(),
}));
const mockLookup = dnsPromises.lookup as unknown as ReturnType<typeof vi.fn>;

describe("isForbiddenCisoIp - garde SSRF (exfiltration token Knox)", () => {
  it("BLOQUE loopback / unspecified", () => {
    expect(isForbiddenCisoIp("127.0.0.1")).toBe(true);
    expect(isForbiddenCisoIp("127.42.42.42")).toBe(true);
    expect(isForbiddenCisoIp("0.0.0.0")).toBe(true);
    expect(isForbiddenCisoIp("::1")).toBe(true);
    expect(isForbiddenCisoIp("::")).toBe(true);
  });

  it("BLOQUE link-local + metadata cloud (169.254.169.254)", () => {
    expect(isForbiddenCisoIp("169.254.169.254")).toBe(true);
    expect(isForbiddenCisoIp("169.254.0.1")).toBe(true);
  });

  it("BLOQUE le link-local IPv6 fe80::/10 EN ENTIER (pas juste fe80:)", () => {
    expect(isForbiddenCisoIp("fe80::1")).toBe(true);
    expect(isForbiddenCisoIp("fea0::1")).toBe(true);
    expect(isForbiddenCisoIp("febf::1")).toBe(true);
  });

  it("BLOQUE le multicast (v4 >=224 et v6 ff00::/8)", () => {
    expect(isForbiddenCisoIp("224.0.0.1")).toBe(true);
    expect(isForbiddenCisoIp("239.255.255.250")).toBe(true);
    expect(isForbiddenCisoIp("ff02::1")).toBe(true);
  });

  it("BLOQUE l'IPv4-mapped IPv6 vers loopback/metadata (dotted ET hex)", () => {
    // Coeur du fix : sans extraction hex, ::ffff:a9fe:a9fe (== metadata cloud)
    // passait pour une IP publique -> exfiltration du token Knox.
    expect(isForbiddenCisoIp("::ffff:169.254.169.254")).toBe(true);
    expect(isForbiddenCisoIp("::ffff:a9fe:a9fe")).toBe(true);
    expect(isForbiddenCisoIp("::ffff:127.0.0.1")).toBe(true);
    expect(isForbiddenCisoIp("::ffff:7f00:1")).toBe(true);
  });

  it("BLOQUE une forme non canonique (refus prudent par defaut)", () => {
    expect(isForbiddenCisoIp("notanip")).toBe(true);
    expect(isForbiddenCisoIp("0x7f.0.0.1")).toBe(true);
  });

  // -- Politique : reseaux prives AUTORISES (self-host legitime) -----------

  it("AUTORISE le RFC 1918 (self-host CISO Assistant sur reseau prive)", () => {
    expect(isForbiddenCisoIp("10.0.0.5")).toBe(false);
    expect(isForbiddenCisoIp("172.16.0.5")).toBe(false);
    expect(isForbiddenCisoIp("192.168.1.10")).toBe(false);
  });

  it("AUTORISE l'ULA IPv6 fc00::/7 (equivalent prive de RFC 1918)", () => {
    expect(isForbiddenCisoIp("fc00::1")).toBe(false);
    expect(isForbiddenCisoIp("fd12:3456::1")).toBe(false);
  });

  it("AUTORISE les IPs publiques (v4 et v6)", () => {
    expect(isForbiddenCisoIp("8.8.8.8")).toBe(false);
    expect(isForbiddenCisoIp("172.32.0.1")).toBe(false);
    expect(isForbiddenCisoIp("2606:4700::1111")).toBe(false);
    expect(isForbiddenCisoIp("::ffff:8.8.8.8")).toBe(false); // mapped public
  });
});

describe("CisoAssistantClient - garde SSRF + epinglage IP (anti DNS-rebinding)", () => {
  const baseConn = {
    baseUrl: "https://ciso.example.com",
    username: "admin",
    password: "secret",
    folderName: "Humanix Académie",
    verifySSL: true,
  };

  // Reponse GET /api/folders/ qui contient deja le folder -> ensureFolder()
  // s'arrete apres UN seul fetch (le GET), pratique pour observer le dispatcher.
  // Le double doit rendre une Response D'UNDICI (elle porte `textStream`), pas
  // celle du DOM : c'est le fetch d'undici qu'on remplace desormais.
  function folderFoundResponse(): Awaited<ReturnType<typeof fetchUndici>> {
    return new Response(
      JSON.stringify({
        results: [{ id: "folder-1", name: baseConn.folderName }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ) as unknown as Awaited<ReturnType<typeof fetchUndici>>;
  }

  const fetchSpy = vi.mocked(fetchUndici);

  beforeEach(() => {
    mockLookup.mockReset();
    fetchSpy.mockReset();
  });
  afterEach(() => {
    fetchSpy.mockReset();
  });

  it("REFUSE sans aucun fetch quand le baseUrl resout vers une IP interdite (loopback)", async () => {
    // L'attaquant fait resoudre un hostname public vers le loopback.
    mockLookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    // fetchSpy est deja le double du module undici (cf. vi.mock en tete).
    const client = new CisoAssistantClient(baseConn);
    await expect(client.ensureFolder()).rejects.toThrow("ciso_host_forbidden");
    // Le token Knox ne part JAMAIS : aucune connexion n'a ete ouverte.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("REFUSE sans aucun fetch quand le baseUrl resout vers le metadata cloud (169.254.169.254)", async () => {
    mockLookup.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    // fetchSpy est deja le double du module undici (cf. vi.mock en tete).
    const client = new CisoAssistantClient(baseConn);
    await expect(client.ensureFolder()).rejects.toThrow("ciso_host_forbidden");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("attache un dispatcher undici epingle quand le host resout vers une IP publique", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    let dispatcher: unknown;
    fetchSpy.mockImplementation((_url, init) => {
      dispatcher = (init as { dispatcher?: unknown } | undefined)?.dispatcher;
      return Promise.resolve(folderFoundResponse());
    });
    const client = new CisoAssistantClient(baseConn);
    const folderId = await client.ensureFolder();
    expect(folderId).toBe("folder-1");
    // La connexion porte un Agent undici epingle (sur l'IP validee), pas le
    // fetch global qui re-resoudrait le hostname.
    expect(dispatcher).toBeInstanceOf(Agent);
  });

  it("AUTORISE le RFC1918 (self-host legitime) et epingle dessus", async () => {
    // Politique CISO : un CISO Assistant peut etre auto-heberge sur reseau prive.
    mockLookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);
    let dispatcher: unknown;
    fetchSpy.mockImplementation((_url, init) => {
      dispatcher = (init as { dispatcher?: unknown } | undefined)?.dispatcher;
      return Promise.resolve(folderFoundResponse());
    });
    const client = new CisoAssistantClient(baseConn);
    await expect(client.ensureFolder()).resolves.toBe("folder-1");
    expect(dispatcher).toBeInstanceOf(Agent);
  });

  it("reutilise le MEME agent epingle tant que la resolution ne change pas (pas de fuite de pool)", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const seen: unknown[] = [];
    fetchSpy.mockImplementation((_url, init) => {
      seen.push((init as { dispatcher?: unknown } | undefined)?.dispatcher);
      return Promise.resolve(folderFoundResponse());
    });
    const client = new CisoAssistantClient(baseConn);
    await client.ensureFolder();
    await client.ensureFolder();
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBeInstanceOf(Agent);
    expect(seen[1]).toBe(seen[0]);
  });

  it("RECONSTRUIT l'agent epingle quand la resolution change (DNS legitimement mis a jour)", async () => {
    const seen: unknown[] = [];
    fetchSpy.mockImplementation((_url, init) => {
      seen.push((init as { dispatcher?: unknown } | undefined)?.dispatcher);
      return Promise.resolve(folderFoundResponse());
    });
    const client = new CisoAssistantClient(baseConn);
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    await client.ensureFolder();
    mockLookup.mockResolvedValue([{ address: "93.184.216.35", family: 4 }]);
    await client.ensureFolder();
    expect(seen[0]).toBeInstanceOf(Agent);
    expect(seen[1]).toBeInstanceOf(Agent);
    expect(seen[1]).not.toBe(seen[0]);
  });
});

describe("CisoAssistantClient - une redirection n'est jamais suivie", () => {
  // Le baseUrl est valide puis epingle, mais c'est le serveur d'en face qui
  // choisit ce qu'il repond. Reproduit le 2026-11-09 sur undici 8.12.3 : un
  // `307 Location: http://[::1]:port/` faisait rejouer la requete sur le
  // loopback de l'hote, un litteral d'IP echappant a l'epinglage DNS.
  //
  // Ici : le contrat du client (redirect: "manual", echec explicite, une seule
  // requete). Que l'option empeche REELLEMENT undici de suivre est prouve sur
  // de vraies connexions dans lib/net/pinned-agent.test.ts.
  const conn = {
    baseUrl: "https://ciso.example.com",
    username: "admin",
    password: "secret",
    folderName: "Humanix Académie",
    verifySSL: true,
  };

  type UndiciResponse = Awaited<ReturnType<typeof fetchUndici>>;

  function redirectResponse(status: number, location?: string): UndiciResponse {
    return new Response(null, {
      status,
      headers: location ? { location } : {},
    }) as unknown as UndiciResponse;
  }

  const fetchSpy = vi.mocked(fetchUndici);

  function sentInit(call = 0): { method?: string; redirect?: string } {
    return fetchSpy.mock.calls[call][1] as never;
  }

  beforeEach(() => {
    mockLookup.mockReset();
    fetchSpy.mockReset();
    // La cible est legitime en apparence : IP publique.
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  it.each([301, 302, 303, 307, 308])(
    "login : un HTTP %i est un echec explicite, sans 2e requete",
    async (status) => {
      fetchSpy.mockResolvedValue(
        redirectResponse(status, "http://[::1]:8000/api/iam/login/"),
      );
      const client = new CisoAssistantClient(conn);

      const err = await client.login().catch((e: unknown) => e);

      expect(err).toBeInstanceOf(CisoError);
      expect((err as CisoError).reason).toBe("redirect_refused");
      expect((err as CisoError).message).toBe(
        `Redirection HTTP ${status} refusée sur POST /api/iam/login/ ` +
          "vers http://[::1]:8000/api/iam/login/ : " +
          "saisissez l'adresse finale dans « URL de base ».",
      );
      // Une seule requete : ni les identifiants ni le token ne sont rejoues
      // vers la destination annoncee par Location.
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(sentInit().method).toBe("POST");
      expect(sentInit().redirect).toBe("manual");
    },
  );

  it("refuse aussi sur un GET, et sans en-tete Location", async () => {
    fetchSpy.mockResolvedValue(redirectResponse(302));
    const client = new CisoAssistantClient(conn);

    const err = await client.ensureFolder().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(CisoError);
    expect((err as CisoError).reason).toBe("redirect_refused");
    expect((err as CisoError).message).toBe(
      "Redirection HTTP 302 refusée sur GET /api/folders/ : " +
        "saisissez l'adresse finale dans « URL de base ».",
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(sentInit().redirect).toBe("manual");
  });

  it("borne un Location demesure dans le message", async () => {
    fetchSpy.mockResolvedValue(
      redirectResponse(307, `https://ailleurs.example/${"a".repeat(5000)}`),
    );
    const client = new CisoAssistantClient(conn);

    const err = await client.login().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(CisoError);
    expect((err as CisoError).message.length).toBeLessThan(350);
    expect((err as CisoError).message).toContain("URL de base");
  });

  it("testCisoConnection remonte le motif redirect_refused, pas « Erreur inconnue »", async () => {
    // Cas reel : URL de base en http:// devant un serveur qui force https.
    fetchSpy.mockResolvedValue(
      redirectResponse(301, "https://ciso.example.com/api/iam/login/"),
    );

    const result = await testCisoConnection({
      ...conn,
      baseUrl: "http://ciso.example.com",
    });

    expect(result).toEqual({
      ok: false,
      reason: "redirect_refused",
      error:
        "Redirection HTTP 301 refusée sur POST /api/iam/login/ " +
        "vers https://ciso.example.com/api/iam/login/ : " +
        "saisissez l'adresse finale dans « URL de base ».",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("uploadAttachment : meme refus, rendu dans son contrat { ok: false }", async () => {
    // Le PDF de preuve ne doit pas etre rejoue ailleurs (un 308 garde le corps).
    fetchSpy.mockResolvedValue(
      redirectResponse(308, "http://169.254.169.254/latest/"),
    );
    const client = new CisoAssistantClient(conn);

    const up = await client.uploadAttachment(
      "ev-1",
      "preuve.pdf",
      Buffer.from("%PDF-1.7"),
    );

    expect(up).toEqual({
      ok: false,
      status: 308,
      error:
        "Redirection HTTP 308 refusée sur POST /api/evidences/ev-1/upload/ " +
        "vers http://169.254.169.254/latest/ : " +
        "saisissez l'adresse finale dans « URL de base ».",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(sentInit().method).toBe("POST");
    expect(sentInit().redirect).toBe("manual");
  });

  it("temoin : uploadAttachment aboutit toujours sur un 201", async () => {
    fetchSpy.mockResolvedValue(
      new Response(null, { status: 201 }) as unknown as UndiciResponse,
    );
    const client = new CisoAssistantClient(conn);

    await expect(
      client.uploadAttachment("ev-1", "preuve.pdf", Buffer.from("%PDF-1.7")),
    ).resolves.toEqual({ ok: true });
  });
});
