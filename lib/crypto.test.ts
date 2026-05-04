// Tests des helpers crypto.
// Critique : api-keys + tracking tokens — un bug = compromission auth.

import { describe, it, expect } from "vitest";
import { generateTrackingToken, hashApiKey, generateApiKey } from "./crypto";

describe("generateTrackingToken", () => {
  it("retourne une chaîne préfixée 'phx_' suivie de 32 hex chars", () => {
    const t = generateTrackingToken();
    expect(t).toMatch(/^phx_[a-f0-9]{32}$/);
  });

  it("génère des tokens uniques (entropy)", () => {
    const tokens = new Set();
    for (let i = 0; i < 1000; i++) tokens.add(generateTrackingToken());
    expect(tokens.size).toBe(1000);
  });
});

describe("hashApiKey", () => {
  it("retourne un hash hex SHA-256 (64 chars)", () => {
    expect(hashApiKey("hello")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("est déterministe", () => {
    expect(hashApiKey("test")).toBe(hashApiKey("test"));
  });

  it("change si l'input change (collision-resistant)", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });

  it("test vector SHA-256 connu", () => {
    // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(hashApiKey("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});

describe("generateApiKey", () => {
  it("retourne { plain, prefix, hashed } cohérents", () => {
    const k = generateApiKey();
    expect(k.plain).toMatch(/^hxa_/);
    expect(k.prefix).toBe(k.plain.slice(0, 12));
    expect(k.hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(k.hashed).toBe(hashApiKey(k.plain));
  });

  it("plain est une string base64url (lettres/chiffres/-_)", () => {
    const k = generateApiKey();
    // Après le préfixe hxa_, on doit avoir base64url valide
    const body = k.plain.slice(4);
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("génère des plain uniques (entropy)", () => {
    const keys = new Set();
    for (let i = 0; i < 1000; i++) keys.add(generateApiKey().plain);
    expect(keys.size).toBe(1000);
  });

  it("le prefix permet de retrouver visuellement la clé sans la log", () => {
    const k = generateApiKey();
    expect(k.prefix.length).toBe(12);
    expect(k.plain.startsWith(k.prefix)).toBe(true);
  });
});
