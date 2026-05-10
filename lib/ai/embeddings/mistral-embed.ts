// SPDX-License-Identifier: AGPL-3.0-or-later
// Client Mistral embeddings pour le RAG Hex.
//
// Modele : `mistral-embed` (dimension 1024).
// API : https://docs.mistral.ai/api/#operation/createEmbedding
//
// Free tier suffit pour notre cas d'usage :
//   - Indexation initiale : 184 modules MDX × ~5 chunks = ~1000 embeddings
//     en one-shot (qq minutes).
//   - Indexation incrementale : ~quelques embeddings par jour (nouveau
//     module ou article ajoute).
//   - Query time : 1 embedding par message user. A 12 msg/h/user en
//     Starter, c'est non-bloquant.

import { isAbortError } from "@/lib/errors";

const MISTRAL_EMBEDDINGS_API = "https://api.mistral.ai/v1/embeddings";
const EMBED_MODEL = "mistral-embed";
export const EMBED_DIMS = 1024;

export class MistralEmbeddingsUnavailableError extends Error {
  constructor() {
    super("Mistral embeddings non disponibles (MISTRAL_API_KEY absent)");
    this.name = "MistralEmbeddingsUnavailableError";
  }
}

export function isMistralEmbeddingsAvailable(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY);
}

/**
 * Embed un ou plusieurs textes. Retourne les vecteurs dans le meme ordre.
 * Timeout 30 sec, abort propage.
 *
 * Limite Mistral : ~16 textes par batch + ~8000 tokens cumules. On laisse
 * l'appelant gerer le batching pour rester sous ces limites.
 */
export async function embedTexts(
  texts: string[],
  options?: { signal?: AbortSignal },
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!isMistralEmbeddingsAvailable()) {
    throw new MistralEmbeddingsUnavailableError();
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  // Si l'appelant fournit un signal externe, on relaye l'abort
  if (options?.signal) {
    if (options.signal.aborted) ctrl.abort();
    else options.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(MISTRAL_EMBEDDINGS_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: texts,
      }),
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    throw new Error(
      isAbortError(e) ? "mistral_embed_timeout" : "mistral_embed_unreachable",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mistral embeddings ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data?: { index?: number; embedding?: number[] }[];
  };
  const arr = data.data;
  if (!Array.isArray(arr)) throw new Error("mistral_embed_invalid_response");

  // L'API garantit que `index` reflete l'ordre du `input`. On verifie quand
  // meme et on remap dans l'ordre attendu.
  const vectors = new Array<number[]>(texts.length);
  for (const item of arr) {
    const i = typeof item.index === "number" ? item.index : -1;
    if (i < 0 || i >= texts.length) continue;
    if (!Array.isArray(item.embedding)) continue;
    if (item.embedding.length !== EMBED_DIMS) {
      throw new Error(
        `Mistral embedding dimension mismatch: expected ${EMBED_DIMS}, got ${item.embedding.length}`,
      );
    }
    vectors[i] = item.embedding;
  }

  // Sanity : tous les slots remplis ?
  for (let i = 0; i < vectors.length; i += 1) {
    if (!vectors[i]) {
      throw new Error(`Mistral embeddings: missing vector at index ${i}`);
    }
  }
  return vectors;
}

/**
 * Helper : embed un seul texte. Retourne le vecteur ou null en cas d'echec
 * non-fatal (silencieux pour le RAG qui doit degrader gracieusement).
 */
export async function embedOneSafe(
  text: string,
  signal?: AbortSignal,
): Promise<number[] | null> {
  if (!text || !text.trim()) return null;
  if (!isMistralEmbeddingsAvailable()) return null;
  try {
    const [v] = await embedTexts([text], { signal });
    return v ?? null;
  } catch (err) {
    console.warn("hex-embeddings: embedOneSafe failed", err);
    return null;
  }
}
