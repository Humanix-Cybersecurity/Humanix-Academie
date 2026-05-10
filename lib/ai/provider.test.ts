// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getProviderKind, isHexChatAvailable, streamChat } from "./provider";

// Snapshot des env pour eviter de polluer le process entre tests
const originalEnv = { ...process.env };

describe("getProviderKind", () => {
  beforeEach(() => {
    delete process.env.HEX_AI_PROVIDER;
    delete process.env.MISTRAL_API_KEY;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("retourne 'disabled' par defaut quand rien n'est configure", () => {
    expect(getProviderKind()).toBe("disabled");
  });

  it("retourne 'mistral' si MISTRAL_API_KEY est defini (auto-detect)", () => {
    process.env.MISTRAL_API_KEY = "sk-test-123";
    expect(getProviderKind()).toBe("mistral");
  });

  it("respecte HEX_AI_PROVIDER=ollama meme sans MISTRAL_API_KEY", () => {
    process.env.HEX_AI_PROVIDER = "ollama";
    expect(getProviderKind()).toBe("ollama");
  });

  it("respecte HEX_AI_PROVIDER=disabled meme si MISTRAL_API_KEY est defini", () => {
    process.env.HEX_AI_PROVIDER = "disabled";
    process.env.MISTRAL_API_KEY = "sk-test-123";
    expect(getProviderKind()).toBe("disabled");
  });

  it("normalise la casse (HEX_AI_PROVIDER=OLLAMA -> ollama)", () => {
    process.env.HEX_AI_PROVIDER = "OLLAMA";
    expect(getProviderKind()).toBe("ollama");
  });

  it("fallback 'mistral' si HEX_AI_PROVIDER inconnu mais cle dispo", () => {
    process.env.HEX_AI_PROVIDER = "openai"; // non supporte
    process.env.MISTRAL_API_KEY = "sk-test-123";
    // Notre logique : valeur inconnue -> auto-detect mistral si key OK
    expect(getProviderKind()).toBe("mistral");
  });
});

describe("isHexChatAvailable", () => {
  beforeEach(() => {
    delete process.env.HEX_AI_PROVIDER;
    delete process.env.MISTRAL_API_KEY;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("false si aucun provider", () => {
    expect(isHexChatAvailable()).toBe(false);
  });

  it("true si Mistral key dispo", () => {
    process.env.MISTRAL_API_KEY = "sk";
    expect(isHexChatAvailable()).toBe(true);
  });

  it("true si Ollama explicite", () => {
    process.env.HEX_AI_PROVIDER = "ollama";
    expect(isHexChatAvailable()).toBe(true);
  });

  it("false si HEX_AI_PROVIDER=disabled meme avec key", () => {
    process.env.HEX_AI_PROVIDER = "disabled";
    process.env.MISTRAL_API_KEY = "sk";
    expect(isHexChatAvailable()).toBe(false);
  });
});

describe("streamChat (provider=disabled)", () => {
  beforeEach(() => {
    process.env.HEX_AI_PROVIDER = "disabled";
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("retourne un ReadableStream emettant un message d'erreur explicite", async () => {
    const stream = await streamChat({
      messages: [{ role: "user", content: "salut" }],
    });
    expect(stream).toBeInstanceOf(ReadableStream);

    // Consomme tout le stream
    const reader = stream.getReader();
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (typeof value === "string") chunks.push(value);
    }
    const full = chunks.join("");
    expect(full).toContain("Hex est en pause");
    expect(full).toContain("MISTRAL_API_KEY");
    expect(full).toContain("OLLAMA_BASE_URL");
  });
});

describe("streamChat (provider=mistral sans key)", () => {
  beforeEach(() => {
    process.env.HEX_AI_PROVIDER = "mistral";
    delete process.env.MISTRAL_API_KEY;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejette avec un message explicite si MISTRAL_API_KEY manque", async () => {
    await expect(
      streamChat({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toThrow(/MISTRAL_API_KEY/);
  });
});
