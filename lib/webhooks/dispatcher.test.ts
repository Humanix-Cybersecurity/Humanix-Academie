// Tests des helpers sécurité du dispatcher webhook.
// Critique : signPayload garantit l'intégrité des évènements outbound.
// isSafeWebhookUrl bloque les attaques SSRF (Server-Side Request Forgery).

import { describe, it, expect } from "vitest";
import { signPayload, isSafeWebhookUrl } from "./dispatcher";

describe("signPayload — HMAC SHA-256", () => {
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

describe("isSafeWebhookUrl — SSRF protection", () => {
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

  it("REFUSE les IPs link-local (169.254.x.x — AWS metadata)", () => {
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
    // 8.8.8.8 (Google DNS), 1.1.1.1 (Cloudflare DNS) — domaines publics
    expect(isSafeWebhookUrl("https://8.8.8.8")).toBe(true);
    expect(isSafeWebhookUrl("https://1.1.1.1")).toBe(true);
  });
});
