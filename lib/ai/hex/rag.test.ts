// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRagContext, retrieveRagContext, type RagChunk } from "./rag";

// Mock des dependances I/O : embeddings Mistral + pgvector.
// On teste la logique de degradation et le formatting, pas les appels reseau.
vi.mock("@/lib/ai/embeddings/mistral-embed", () => ({
  embedOneSafe: vi.fn(),
  isMistralEmbeddingsAvailable: vi.fn(),
}));
vi.mock("@/lib/ai/embeddings/pgvector", () => ({
  isPgvectorAvailable: vi.fn(),
  queryNearest: vi.fn(),
}));

import {
  embedOneSafe,
  isMistralEmbeddingsAvailable,
} from "@/lib/ai/embeddings/mistral-embed";
import {
  isPgvectorAvailable,
  queryNearest,
} from "@/lib/ai/embeddings/pgvector";

describe("formatRagContext", () => {
  it("retourne '' si liste vide", () => {
    expect(formatRagContext([])).toBe("");
  });

  it("inclut le titre, le score et le contenu de chaque chunk", () => {
    const chunks: RagChunk[] = [
      {
        title: "Phishing bancaire",
        sourcePath: "content/saisons/phishing/01.mdx",
        url: "/apprendre/phishing/01",
        score: 0.87,
        excerpt: "Un mail de banque legitime n'a jamais d'urgence factice.",
      },
    ];
    const out = formatRagContext(chunks);
    expect(out).toContain("# Extraits pertinents de la bibliotheque Humanix");
    expect(out).toContain("Phishing bancaire");
    expect(out).toContain("0.87");
    expect(out).toContain("urgence factice");
  });

  it("instructions de citation explicites pour le LLM", () => {
    const out = formatRagContext([
      {
        title: "T",
        sourcePath: "s",
        url: null,
        score: 0.9,
        excerpt: "E",
      },
    ]);
    expect(out).toContain("cite la source");
    expect(out).toContain('"Source : <titre>"');
  });

  it("ne reproduit pas mot pour mot — instruit a reformuler", () => {
    const out = formatRagContext([
      { title: "T", sourcePath: "s", url: null, score: 0.5, excerpt: "E" },
    ]);
    expect(out).toContain("Ne reproduis pas ces extraits mot pour mot");
  });

  it("respecte la limite MAX_RAG_CHARS (ne renvoie pas un truc immense)", () => {
    // 10 chunks de ~5000 chars => totale > MAX_RAG_CHARS (12000).
    // formatRagContext doit s'arreter avant pour ne pas saturer le contexte LLM.
    const huge = "a".repeat(5000);
    const chunks: RagChunk[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Module ${i}`,
      sourcePath: `s${i}`,
      url: null,
      score: 0.9,
      excerpt: huge,
    }));
    const out = formatRagContext(chunks);
    // Pas de cap strict mais on doit etre dans le meme ordre de grandeur
    // que MAX_RAG_CHARS (12000) + l'entete fixe (~250).
    expect(out.length).toBeLessThan(13_500);
  });
});

describe("retrieveRagContext (degradation gracieuse)", () => {
  beforeEach(() => {
    vi.mocked(isMistralEmbeddingsAvailable).mockReturnValue(false);
    vi.mocked(isPgvectorAvailable).mockResolvedValue(false);
    vi.mocked(embedOneSafe).mockResolvedValue(null);
    vi.mocked(queryNearest).mockResolvedValue([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retourne {chunks:[], available:false} si query vide", async () => {
    const r = await retrieveRagContext({ query: "" });
    expect(r.chunks).toEqual([]);
    expect(r.available).toBe(false);
  });

  it("retourne {chunks:[], available:false} si embeddings Mistral non configures", async () => {
    vi.mocked(isMistralEmbeddingsAvailable).mockReturnValue(false);
    const r = await retrieveRagContext({ query: "Test cyber" });
    expect(r.chunks).toEqual([]);
    expect(r.available).toBe(false);
  });

  it("retourne {chunks:[], available:false} si pgvector non installe", async () => {
    vi.mocked(isMistralEmbeddingsAvailable).mockReturnValue(true);
    vi.mocked(isPgvectorAvailable).mockResolvedValue(false);
    const r = await retrieveRagContext({ query: "Test cyber" });
    expect(r.chunks).toEqual([]);
    expect(r.available).toBe(false);
  });

  it("retourne available:true mais chunks:[] si embedOneSafe echoue", async () => {
    vi.mocked(isMistralEmbeddingsAvailable).mockReturnValue(true);
    vi.mocked(isPgvectorAvailable).mockResolvedValue(true);
    vi.mocked(embedOneSafe).mockResolvedValue(null);
    const r = await retrieveRagContext({ query: "Test cyber" });
    expect(r.chunks).toEqual([]);
    expect(r.available).toBe(true);
  });

  it("filtre les chunks sous le seuil MIN_SCORE (0.5)", async () => {
    vi.mocked(isMistralEmbeddingsAvailable).mockReturnValue(true);
    vi.mocked(isPgvectorAvailable).mockResolvedValue(true);
    vi.mocked(embedOneSafe).mockResolvedValue(new Array(1024).fill(0.1));
    vi.mocked(queryNearest).mockResolvedValue([
      {
        id: "1",
        source_path: "s1",
        chunk_index: 0,
        title: "Pertinent",
        url: "/p",
        content: "ok",
        metadata: {},
        score: 0.8,
      },
      {
        id: "2",
        source_path: "s2",
        chunk_index: 0,
        title: "Non pertinent",
        url: null,
        content: "noise",
        metadata: {},
        score: 0.3,
      },
    ]);
    const r = await retrieveRagContext({ query: "x" });
    expect(r.chunks).toHaveLength(1);
    expect(r.chunks[0].title).toBe("Pertinent");
  });

  it("ne plante JAMAIS — exception interne -> chunks:[]", async () => {
    vi.mocked(isMistralEmbeddingsAvailable).mockReturnValue(true);
    vi.mocked(isPgvectorAvailable).mockResolvedValue(true);
    vi.mocked(embedOneSafe).mockResolvedValue(new Array(1024).fill(0.1));
    vi.mocked(queryNearest).mockRejectedValue(new Error("DB broken"));
    const r = await retrieveRagContext({ query: "x" });
    expect(r.chunks).toEqual([]);
    expect(r.available).toBe(true);
  });
});
