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
import { Agent } from "undici";
import { CisoAssistantClient, isForbiddenCisoIp } from "./client";

// On mock la resolution DNS du baseUrl pour piloter ce que VOIT le garde, et on
// espionne fetch() pour observer (a) qu'aucune connexion ne part vers une cible
// interdite, (b) que la connexion autorisee porte bien un dispatcher epingle.
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
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
  function folderFoundResponse(): Response {
    return new Response(
      JSON.stringify({ results: [{ id: "folder-1", name: baseConn.folderName }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  let fetchSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    mockLookup.mockReset();
  });
  afterEach(() => {
    fetchSpy?.mockRestore();
    fetchSpy = undefined;
  });

  it("REFUSE sans aucun fetch quand le baseUrl resout vers une IP interdite (loopback)", async () => {
    // L'attaquant fait resoudre un hostname public vers le loopback.
    mockLookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    fetchSpy = vi.spyOn(globalThis, "fetch");
    const client = new CisoAssistantClient(baseConn);
    await expect(client.ensureFolder()).rejects.toThrow("ciso_host_forbidden");
    // Le token Knox ne part JAMAIS : aucune connexion n'a ete ouverte.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("REFUSE sans aucun fetch quand le baseUrl resout vers le metadata cloud (169.254.169.254)", async () => {
    mockLookup.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    fetchSpy = vi.spyOn(globalThis, "fetch");
    const client = new CisoAssistantClient(baseConn);
    await expect(client.ensureFolder()).rejects.toThrow("ciso_host_forbidden");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("attache un dispatcher undici epingle quand le host resout vers une IP publique", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    let dispatcher: unknown;
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_url, init) => {
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
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_url, init) => {
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
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_url, init) => {
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
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_url, init) => {
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
