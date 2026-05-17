// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests pour lib/csp-nonce.ts — helper de lecture du nonce CSP
// per-request injecte par proxy.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCspNonce } from "./csp-nonce";

// Mock next/headers — on simule la lecture du header `x-csp-nonce`.
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";

describe("lib/csp-nonce — getCspNonce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne le nonce quand le header x-csp-nonce est present", async () => {
    const fakeNonce = "abcdef0123456789==";
    vi.mocked(headers).mockResolvedValue(
      // @ts-expect-error — minimal mock du shape attendu
      new Map([["x-csp-nonce", fakeNonce]]),
    );

    const result = await getCspNonce();
    expect(result).toBe(fakeNonce);
  });

  it("retourne undefined quand le header est absent", async () => {
    vi.mocked(headers).mockResolvedValue(
      // @ts-expect-error — minimal mock
      new Map(),
    );

    const result = await getCspNonce();
    expect(result).toBeUndefined();
  });

  it("retourne undefined quand headers() renvoie null pour ce header", async () => {
    vi.mocked(headers).mockResolvedValue(
      // @ts-expect-error — minimal mock qui renvoie null
      { get: (_: string) => null },
    );

    const result = await getCspNonce();
    expect(result).toBeUndefined();
  });

  it("ne throw jamais (defensive)", async () => {
    vi.mocked(headers).mockResolvedValue(
      // @ts-expect-error
      { get: () => "any-value" },
    );

    await expect(getCspNonce()).resolves.toBeDefined();
  });
});
