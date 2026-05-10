// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isMistralEmbeddingsAvailable,
  embedTexts,
  embedOneSafe,
  MistralEmbeddingsUnavailableError,
  EMBED_DIMS,
} from "./mistral-embed";

const originalEnv = { ...process.env };

describe("EMBED_DIMS", () => {
  it("expose la dimension Mistral mistral-embed (1024)", () => {
    expect(EMBED_DIMS).toBe(1024);
  });
});

describe("isMistralEmbeddingsAvailable", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("false sans MISTRAL_API_KEY", () => {
    delete process.env.MISTRAL_API_KEY;
    expect(isMistralEmbeddingsAvailable()).toBe(false);
  });
  it("true avec MISTRAL_API_KEY", () => {
    process.env.MISTRAL_API_KEY = "sk-test";
    expect(isMistralEmbeddingsAvailable()).toBe(true);
  });
});

describe("embedTexts", () => {
  beforeEach(() => {
    process.env.MISTRAL_API_KEY = "sk-test";
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("retourne tableau vide pour entree vide (pas d'appel API)", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const out = await embedTexts([]);
    expect(out).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("throw MistralEmbeddingsUnavailableError si pas de cle", async () => {
    delete process.env.MISTRAL_API_KEY;
    await expect(embedTexts(["test"])).rejects.toThrow(
      MistralEmbeddingsUnavailableError,
    );
  });

  it("decode correctement la reponse Mistral en number[][]", async () => {
    const fakeVec = new Array(EMBED_DIMS).fill(0.123);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: fakeVec }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const out = await embedTexts(["bonjour"]);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(EMBED_DIMS);
    expect(out[0][0]).toBe(0.123);
  });

  it("remap les vecteurs dans l'ordre du input (index API peut etre desordonne)", async () => {
    const v0 = new Array(EMBED_DIMS).fill(0.1);
    const v1 = new Array(EMBED_DIMS).fill(0.2);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { index: 1, embedding: v1 },
            { index: 0, embedding: v0 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const out = await embedTexts(["a", "b"]);
    expect(out[0][0]).toBe(0.1); // v0 d'abord
    expect(out[1][0]).toBe(0.2); // v1 ensuite
  });

  it("rejette si la dimension renvoyee ne matche pas EMBED_DIMS", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: [0.1, 0.2] }], // 2 dims, attendu 1024
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    await expect(embedTexts(["x"])).rejects.toThrow(/dimension mismatch/);
  });

  it("rejette explicitement sur 401/403 avec le code HTTP", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );
    await expect(embedTexts(["x"])).rejects.toThrow(/401/);
  });

  it("rejette avec code clair sur erreur reseau (mistral_embed_unreachable)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("ENOTFOUND"));
    await expect(embedTexts(["x"])).rejects.toThrow(/unreachable/);
  });
});

describe("embedOneSafe", () => {
  beforeEach(() => {
    process.env.MISTRAL_API_KEY = "sk-test";
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("null si texte vide", async () => {
    expect(await embedOneSafe("")).toBeNull();
    expect(await embedOneSafe("   ")).toBeNull();
  });

  it("null si MISTRAL_API_KEY manque (pas d'erreur)", async () => {
    delete process.env.MISTRAL_API_KEY;
    expect(await embedOneSafe("test")).toBeNull();
  });

  it("retourne le vecteur si OK", async () => {
    const fakeVec = new Array(EMBED_DIMS).fill(0.5);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ data: [{ index: 0, embedding: fakeVec }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const v = await embedOneSafe("test");
    expect(v).toHaveLength(EMBED_DIMS);
  });

  it("null en cas d'erreur (silencieux, ne propage pas)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    const v = await embedOneSafe("test");
    expect(v).toBeNull();
  });
});
