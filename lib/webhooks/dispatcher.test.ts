// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des helpers sécurité du dispatcher webhook.
// Critique : signPayload garantit l'intégrité des évènements outbound.
// isSafeWebhookUrl bloque les attaques SSRF (Server-Side Request Forgery).

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as dnsPromises from "node:dns/promises";
import {
  signPayload,
  isSafeWebhookUrl,
  isPrivateIp,
  resolvePublicHost,
} from "./dispatcher";
import { makePinnedLookup } from "@/lib/net/pinned-agent";

// On mock la resolution DNS pour piloter ce que VOIT la validation (l'IP a
// laquelle un hostname public resout), sans dependre du reseau ni du DNS reel.
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const mockLookup = dnsPromises.lookup as unknown as ReturnType<typeof vi.fn>;

describe("signPayload - HMAC SHA-256", () => {
  it("produit une signature hex de 64 caractères", () => {
    const sig = signPayload("hello", "secret");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("est déterministe (mêmes inputs → même signature)", () => {
    expect(signPayload("payload", "secret")).toBe(
      signPayload("payload", "secret"),
    );
  });

  it("change si le payload change", () => {
    expect(signPayload("a", "secret")).not.toBe(signPayload("b", "secret"));
  });

  it("change si le secret change", () => {
    expect(signPayload("payload", "s1")).not.toBe(signPayload("payload", "s2"));
  });

  it("test vector RFC 4231 (équivalent HMAC-SHA256)", () => {
    // Vérifie qu'on utilise bien HMAC-SHA256 et pas une autre primitive.
    // Test vector : key="key", data="The quick brown fox jumps over the lazy dog"
    const expected =
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8";
    expect(
      signPayload("The quick brown fox jumps over the lazy dog", "key"),
    ).toBe(expected);
  });

  it("gère payloads vides et secrets vides", () => {
    expect(() => signPayload("", "secret")).not.toThrow();
    expect(() => signPayload("payload", "")).not.toThrow();
    expect(signPayload("", "")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("gère payloads avec caractères Unicode (UTF-8 attendu)", () => {
    const sig = signPayload("Bonjour 🦊 Hex", "secret");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("isSafeWebhookUrl - SSRF protection", () => {
  it("accepte les URLs HTTPS publiques", () => {
    expect(isSafeWebhookUrl("https://hooks.slack.com/services/T0/B0/x")).toBe(
      true,
    );
    expect(isSafeWebhookUrl("https://outlook.office.com/webhook/abc")).toBe(
      true,
    );
    expect(isSafeWebhookUrl("https://example.com/webhook")).toBe(true);
  });

  it("REFUSE les URLs HTTP (non chiffrées)", () => {
    expect(isSafeWebhookUrl("http://example.com")).toBe(false);
    expect(isSafeWebhookUrl("http://hooks.slack.com")).toBe(false);
  });

  it("REFUSE localhost (toutes variantes)", () => {
    expect(isSafeWebhookUrl("https://localhost")).toBe(false);
    expect(isSafeWebhookUrl("https://localhost:8080/webhook")).toBe(false);
    expect(isSafeWebhookUrl("https://LOCALHOST")).toBe(false); // case-insensitive
  });

  it("REFUSE les IPs privées RFC 1918 (10.x.x.x)", () => {
    expect(isSafeWebhookUrl("https://10.0.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://10.255.255.255")).toBe(false);
  });

  it("REFUSE les IPs privées RFC 1918 (172.16-31.x.x)", () => {
    expect(isSafeWebhookUrl("https://172.16.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://172.31.255.255")).toBe(false);
  });

  it("ACCEPTE 172.32.x.x (hors plage privée)", () => {
    expect(isSafeWebhookUrl("https://172.32.0.1")).toBe(true);
    expect(isSafeWebhookUrl("https://172.15.0.1")).toBe(true);
  });

  it("REFUSE les IPs privées RFC 1918 (192.168.x.x)", () => {
    expect(isSafeWebhookUrl("https://192.168.1.1")).toBe(false);
    expect(isSafeWebhookUrl("https://192.168.255.255")).toBe(false);
  });

  it("REFUSE les IPs loopback (127.x.x.x)", () => {
    expect(isSafeWebhookUrl("https://127.0.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://127.42.42.42")).toBe(false);
  });

  it("REFUSE les IPs link-local (169.254.x.x - AWS metadata)", () => {
    expect(isSafeWebhookUrl("https://169.254.169.254")).toBe(false);
    expect(isSafeWebhookUrl("https://169.254.0.1")).toBe(false);
  });

  it("REFUSE les IPs 0.x.x.x (unspecified)", () => {
    expect(isSafeWebhookUrl("https://0.0.0.0")).toBe(false);
    expect(isSafeWebhookUrl("https://0.1.2.3")).toBe(false);
  });

  it("REFUSE les TLDs internes (.local, .internal, .lan)", () => {
    expect(isSafeWebhookUrl("https://server.local")).toBe(false);
    expect(isSafeWebhookUrl("https://service.internal")).toBe(false);
    expect(isSafeWebhookUrl("https://router.lan")).toBe(false);
  });

  it("REFUSE les URLs invalides", () => {
    expect(isSafeWebhookUrl("not-a-url")).toBe(false);
    expect(isSafeWebhookUrl("")).toBe(false);
    expect(isSafeWebhookUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeWebhookUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeWebhookUrl("ftp://example.com")).toBe(false);
  });

  it("ACCEPTE les IPs publiques", () => {
    // 8.8.8.8 (Google DNS), 1.1.1.1 (Cloudflare DNS) - domaines publics
    expect(isSafeWebhookUrl("https://8.8.8.8")).toBe(true);
    expect(isSafeWebhookUrl("https://1.1.1.1")).toBe(true);
  });

  // -- Vecteurs de contournement SSRF (cf. audit secu) -------------------

  it("REFUSE la plage CGNAT 100.64.0.0/10", () => {
    expect(isSafeWebhookUrl("https://100.64.0.1")).toBe(false);
    expect(isSafeWebhookUrl("https://100.127.255.255")).toBe(false);
    // 100.63 et 100.128 sont HORS plage CGNAT -> publics.
    expect(isSafeWebhookUrl("https://100.63.0.1")).toBe(true);
    expect(isSafeWebhookUrl("https://100.128.0.1")).toBe(true);
  });

  it("REFUSE les encodages IPv4 alternatifs (le parseur URL les normalise)", () => {
    // WHATWG URL normalise ces formes en dotted-decimal -> 127.0.0.1, donc le
    // filtre canonique les attrape. Regression-guard sur ce comportement.
    expect(isSafeWebhookUrl("https://2130706433")).toBe(false); // decimal
    expect(isSafeWebhookUrl("https://0x7f000001")).toBe(false); // hex
    expect(isSafeWebhookUrl("https://0177.0.0.1")).toBe(false); // octal
    expect(isSafeWebhookUrl("https://127.1")).toBe(false); // forme courte
  });

  it("REFUSE les litteraux IPv6 loopback / unspecified", () => {
    expect(isSafeWebhookUrl("https://[::1]")).toBe(false);
    expect(isSafeWebhookUrl("https://[::]")).toBe(false);
  });

  it("REFUSE les litteraux IPv6 link-local fe80::/10 (tout le range)", () => {
    expect(isSafeWebhookUrl("https://[fe80::1]")).toBe(false);
    expect(isSafeWebhookUrl("https://[fea0::1]")).toBe(false); // toujours fe80::/10
    expect(isSafeWebhookUrl("https://[febf::1]")).toBe(false);
  });

  it("REFUSE les litteraux IPv6 ULA fc00::/7", () => {
    expect(isSafeWebhookUrl("https://[fc00::1]")).toBe(false);
    expect(isSafeWebhookUrl("https://[fd00::1]")).toBe(false);
  });

  it("REFUSE l'IPv4-mapped IPv6 vers metadata/loopback (dotted ET hex)", () => {
    // [::ffff:169.254.169.254] est re-serialise par le parseur URL en
    // [::ffff:a9fe:a9fe] (hex) : le filtre doit reconnaitre les DEUX formes.
    expect(isSafeWebhookUrl("https://[::ffff:169.254.169.254]")).toBe(false);
    expect(isSafeWebhookUrl("https://[::ffff:a9fe:a9fe]")).toBe(false);
    expect(isSafeWebhookUrl("https://[::ffff:127.0.0.1]")).toBe(false);
    expect(isSafeWebhookUrl("https://[::ffff:7f00:1]")).toBe(false);
  });

  it("ACCEPTE les litteraux IPv6 publics (global unicast)", () => {
    expect(isSafeWebhookUrl("https://[2606:4700::1111]")).toBe(true); // Cloudflare
    expect(isSafeWebhookUrl("https://[2001:4860:4860::8888]")).toBe(true); // Google
  });
});

describe("isPrivateIp - classification IP brute (anti DNS-rebinding)", () => {
  it("classe les loopback/unspecified IPv4 comme privees", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("0.0.0.0")).toBe(true);
  });

  it("classe les plages RFC 1918 + link-local + CGNAT comme privees", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true); // metadata cloud
    expect(isPrivateIp("100.64.0.1")).toBe(true); // CGNAT
  });

  it("classe une IPv4 non canonique comme privee (refus prudent)", () => {
    // Une resolution DNS qui renverrait une forme inattendue ne doit jamais
    // etre traitee comme publique par defaut.
    expect(isPrivateIp("0x7f.0.0.1")).toBe(true);
    expect(isPrivateIp("notanip")).toBe(true);
  });

  it("classe les IPv6 loopback / link-local / ULA / multicast comme privees", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("::")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("fea0::1")).toBe(true); // fe80::/10, pas juste fe80:
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("fd12:3456::1")).toBe(true);
    expect(isPrivateIp("ff02::1")).toBe(true); // multicast
  });

  it("classe l'IPv4-mapped IPv6 (dotted ET hex) selon l'IPv4 sous-jacente", () => {
    // Coeur du fix : dns.lookup peut renvoyer la forme hex ::ffff:a9fe:a9fe
    // pour un AAAA pointant vers 169.254.169.254.
    expect(isPrivateIp("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateIp("::ffff:a9fe:a9fe")).toBe(true); // == 169.254.169.254
    expect(isPrivateIp("::ffff:7f00:1")).toBe(true); // == 127.0.0.1
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false); // mapped public -> OK
  });

  it("classe les IPv6 global unicast comme publiques", () => {
    expect(isPrivateIp("2606:4700::1111")).toBe(false);
    expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
  });

  it("classe les IPv4 publiques comme publiques", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
    expect(isPrivateIp("172.32.0.1")).toBe(false);
    expect(isPrivateIp("100.63.0.1")).toBe(false);
  });
});

describe("resolvePublicHost - resolution + IP a epingler (anti DNS-rebinding)", () => {
  beforeEach(() => {
    mockLookup.mockReset();
  });

  it("renvoie les adresses validees quand toutes les IP resolues sont publiques", async () => {
    mockLookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
    const res = await resolvePublicHost("hook.example.com");
    expect(res).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
  });

  it("REFUSE (null) si UNE IP resolue est privee = reponse de l'attaquant DNS-rebinding", async () => {
    // Validation : un hostname public resout vers le endpoint metadata cloud.
    mockLookup.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    expect(await resolvePublicHost("evil-rebind.example.com")).toBeNull();
    // Melange public + loopback -> refus global (on n'epingle pas un set douteux).
    mockLookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    expect(await resolvePublicHost("evil-rebind.example.com")).toBeNull();
  });

  it("REFUSE (null) si la resolution est vide ou echoue", async () => {
    mockLookup.mockResolvedValue([]);
    expect(await resolvePublicHost("nxdomain.example")).toBeNull();
    mockLookup.mockRejectedValue(new Error("ENOTFOUND"));
    expect(await resolvePublicHost("nxdomain.example")).toBeNull();
  });

  it("la sortie de resolvePublicHost alimente directement l'epinglage (chaine complete)", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const pinned = await resolvePublicHost("hook.example.com");
    expect(pinned).not.toBeNull();
    // makePinnedLookup(pinned) renverra EXACTEMENT cette IP, quel que soit le
    // hostname re-demande au moment de la connexion -> pas de detournement.
    const lookup = makePinnedLookup(pinned!);
    let connectTarget: unknown;
    lookup("attacker-rebinds-to-private.example", { all: true }, (_e, a) => {
      connectTarget = a;
    });
    expect(connectTarget).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });
});
