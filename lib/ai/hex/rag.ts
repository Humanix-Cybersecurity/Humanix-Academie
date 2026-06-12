// SPDX-License-Identifier: AGPL-3.0-or-later
// RAG (Retrieval Augmented Generation) pour Hex.
//
// Pipeline :
//   1. Embed la query de l'humain (mistral-embed, 1024 dims)
//   2. Cosine similarity sur la table hex_embedding (pgvector)
//   3. Top-K chunks rerankes par score brut
//   4. Filtrage : on garde uniquement les chunks au-dessus du seuil
//      MIN_SCORE pour eviter d'injecter du contenu non-pertinent
//   5. Format en string injectable dans le system prompt
//
// Degradation :
//   - Si pgvector n'est pas dispo : on retourne 0 chunk, Hex repond sans
//     contexte (mais reste fonctionnel).
//   - Si l'embedding de la query echoue (timeout Mistral) : idem.
//   - Le chat ne plante JAMAIS a cause du RAG.

import {
  embedOneSafe,
  isMistralEmbeddingsAvailable,
} from "@/lib/ai/embeddings/mistral-embed";
import {
  isPgvectorAvailable,
  queryNearest,
  type HexChunkWithScore,
} from "@/lib/ai/embeddings/pgvector";

// Seuil minimum de similarite cosine [0, 1] pour qu'un chunk soit injecte.
// 0.5 = chunk au moins moderement pertinent. En-dessous : trop generique,
// risque d'injecter du bruit qui distrait le LLM.
const MIN_SCORE = 0.5;

// Limite tokens du contexte RAG injecte. ~3000 tokens = ~12 000 caracteres
// francais (~2700 mots). On garde de la marge pour la conversation user.
const MAX_RAG_CHARS = 12_000;

export type RagChunk = {
  title: string;
  sourcePath: string;
  url: string | null;
  score: number;
  excerpt: string;
};

export type RagResult = {
  chunks: RagChunk[];
  /** True si le RAG est techniquement dispo sur l'instance (extension + table). */
  available: boolean;
};

/**
 * Recupere les chunks pertinents pour une query. Retourne un objet
 * `{ chunks, available }`. Si rien de pertinent : chunks = [].
 *
 * Cette fonction NE FAIT JAMAIS d'erreur - toute erreur interne est
 * loggee et la fonction retourne un objet vide. Le RAG est best-effort.
 */
export async function retrieveRagContext(opts: {
  query: string;
  topK?: number;
}): Promise<RagResult> {
  const topK = opts.topK ?? 4;

  // Pre-checks
  if (!opts.query || !opts.query.trim()) {
    return { chunks: [], available: false };
  }
  if (!isMistralEmbeddingsAvailable()) {
    return { chunks: [], available: false };
  }
  const pgvecOk = await isPgvectorAvailable();
  if (!pgvecOk) {
    return { chunks: [], available: false };
  }

  // 1) Embed la query
  const vec = await embedOneSafe(opts.query);
  if (!vec) return { chunks: [], available: true };

  // 2) Top-K via pgvector
  let rows: HexChunkWithScore[];
  try {
    rows = await queryNearest(vec, topK);
  } catch (err) {
    console.warn("hex-rag: queryNearest failed", err);
    return { chunks: [], available: true };
  }

  // 3) Filtre par seuil + format
  const filtered = rows
    .filter((r) => r.score >= MIN_SCORE)
    .map<RagChunk>((r) => ({
      title: r.title,
      sourcePath: r.source_path,
      url: typeof r.metadata?.url === "string" ? (r.metadata.url as string) : null,
      score: r.score,
      excerpt: r.content,
    }));

  return { chunks: filtered, available: true };
}

/**
 * Construit le bloc de contexte RAG a injecter au system prompt. Renvoie
 * "" si aucun chunk a injecter.
 *
 * Format pedagogique : on liste les extraits avec leur source explicite.
 * Le LLM est instruit (via le system prompt) de citer ces sources dans
 * sa reponse, et les citations metadata sont aussi exposees a l'UI.
 */
export function formatRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "";

  const lines: string[] = [
    "\n\n# Extraits pertinents de la bibliotheque Humanix",
    "Voici des passages issus de modules officiels Humanix Académie qui",
    "pourraient eclairer la reponse. Utilise-les comme reference factuelle",
    "et cite la source au format \"Source : <titre>\" quand tu t'en sers.",
    "Ne reproduis pas ces extraits mot pour mot : reformule en restant",
    "fidele au sens.\n",
  ];

  let used = 0;
  for (const c of chunks) {
    const block = `\n## ${c.title} (score ${c.score.toFixed(2)})\n${c.excerpt}\n`;
    if (used + block.length > MAX_RAG_CHARS) break;
    lines.push(block);
    used += block.length;
  }

  return lines.join("");
}
