// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers pgvector pour le RAG Hex.
//
// On utilise une table autonome `hex_embedding` cree via raw SQL (cf.
// setupPgvector()). Le model n'est PAS dans schema.prisma - Prisma ne
// genere pas de typage pour les colonnes Unsupported, et `prisma db push`
// echoue si l'extension n'est pas dispo. On garde tout en raw SQL pour
// que le module soit purement additif (zero impact sur le schema Prisma
// existant si pgvector n'est pas active).
//
// Strategie de degradation gracieuse :
//   - Si l'extension pgvector n'est pas installee : le RAG est desactive
//     silencieusement, le chat marche en mode "sans citations".
//   - L'admin peut activer plus tard via : npm run hex:reindex (qui
//     appelle setupPgvector() automatiquement).
//
// Securite :
//   - Tous les inputs SQL passent par parametres ($1, $2, ...) - pas
//     de concatenation, pas d'injection.
//   - La table est par-installation (pas multi-tenant : les MDX
//     modules sont partages entre tous les tenants).

import { db } from "@/lib/db";

export const EMBED_DIMS = 1024;
const TABLE = "hex_embedding";

let pgvectorAvailable: boolean | null = null;

/**
 * Verifie si l'extension pgvector + la table hex_embedding sont presentes.
 * Cache du resultat en memoire pour eviter de pinger la DB a chaque message.
 * Cleared par setupPgvector() qui force le re-check.
 */
export async function isPgvectorAvailable(): Promise<boolean> {
  if (pgvectorAvailable !== null) return pgvectorAvailable;
  try {
    const rows = (await db.$queryRawUnsafe(
      `SELECT 1
       FROM pg_extension e
       WHERE e.extname = 'vector'
       LIMIT 1`,
    )) as unknown[];
    const extOk = Array.isArray(rows) && rows.length > 0;
    if (!extOk) {
      pgvectorAvailable = false;
      return false;
    }
    const tableRows = (await db.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.tables WHERE table_name = '${TABLE}' LIMIT 1`,
    )) as unknown[];
    pgvectorAvailable = Array.isArray(tableRows) && tableRows.length > 0;
    return pgvectorAvailable;
  } catch (err) {
    console.warn("pgvector: probe failed", err);
    pgvectorAvailable = false;
    return false;
  }
}

/**
 * Idempotent : installe l'extension + cree la table + index.
 * Appele par le script `hex:reindex` au demarrage. NE PAS appeler depuis
 * le code de runtime (require DB superuser sur certains hostings).
 */
export async function setupPgvector(): Promise<void> {
  await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id TEXT PRIMARY KEY,
      source_path TEXT NOT NULL,
      chunk_index INT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      content TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      embedding vector(${EMBED_DIMS}) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Index ANN pour la recherche cosine. ivfflat lists=100 = bon equilibre
  // pour ~1000-10000 chunks (notre cas avec 184 modules MDX).
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS ${TABLE}_embedding_idx
    ON ${TABLE} USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS ${TABLE}_source_path_idx
    ON ${TABLE}(source_path)
  `);
  pgvectorAvailable = null; // force re-check au prochain appel
}

export type HexChunkRow = {
  id: string;
  source_path: string;
  chunk_index: number;
  title: string;
  url: string | null;
  content: string;
  metadata: Record<string, unknown>;
};

export type HexChunkWithScore = HexChunkRow & { score: number };

/**
 * Cherche les top-K chunks similaires au vecteur de query (cosine similarity).
 * Le score retourne est en [0, 1] (1 = identique, 0 = orthogonal).
 *
 * pgvector retourne la cosine distance (1 - cos), on inverse pour exposer
 * une similarite plus intuitive.
 */
export async function queryNearest(
  queryVec: number[],
  topK = 4,
): Promise<HexChunkWithScore[]> {
  if (queryVec.length !== EMBED_DIMS) {
    throw new Error(
      `queryNearest: vecteur de dim ${queryVec.length}, attendu ${EMBED_DIMS}`,
    );
  }
  const vecLiteral = toVectorLiteral(queryVec);
  // Note : Prisma ne supporte pas le type vector dans les parametres
  // typed ($1::vector). On passe par $queryRawUnsafe avec le literal
  // inline (le vector est genere via toVectorLiteral qui valide les
  // numbers donc pas de risque d'injection).
  const rows = (await db.$queryRawUnsafe(
    `
    SELECT id, source_path, chunk_index, title, url, content, metadata,
           1 - (embedding <=> '${vecLiteral}'::vector) AS score
    FROM ${TABLE}
    ORDER BY embedding <=> '${vecLiteral}'::vector ASC
    LIMIT ${Math.max(1, Math.min(20, topK))}
    `,
  )) as Array<HexChunkRow & { score: number }>;
  return rows;
}

/**
 * Inserts/upserts un chunk (utilise par le script de reindex).
 * Si un chunk avec le meme (source_path, chunk_index) existe deja, on
 * le remplace (idempotence).
 */
export async function upsertChunk(args: {
  id: string;
  sourcePath: string;
  chunkIndex: number;
  title: string;
  url: string | null;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}): Promise<void> {
  if (args.embedding.length !== EMBED_DIMS) {
    throw new Error(
      `upsertChunk: embedding dim ${args.embedding.length}, attendu ${EMBED_DIMS}`,
    );
  }
  const vecLiteral = toVectorLiteral(args.embedding);
  await db.$executeRawUnsafe(
    `
    INSERT INTO ${TABLE} (id, source_path, chunk_index, title, url, content, metadata, embedding)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, '${vecLiteral}'::vector)
    ON CONFLICT (id) DO UPDATE SET
      source_path = EXCLUDED.source_path,
      chunk_index = EXCLUDED.chunk_index,
      title = EXCLUDED.title,
      url = EXCLUDED.url,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      embedding = EXCLUDED.embedding
    `,
    args.id,
    args.sourcePath,
    args.chunkIndex,
    args.title,
    args.url,
    args.content,
    JSON.stringify(args.metadata),
  );
}

/**
 * Supprime tous les chunks d'une source (utilise quand on re-indexe un
 * fichier MDX modifie : on purge l'ancien puis on re-insert).
 */
export async function deleteChunksFromSource(sourcePath: string): Promise<void> {
  await db.$executeRawUnsafe(
    `DELETE FROM ${TABLE} WHERE source_path = $1`,
    sourcePath,
  );
}

/**
 * Convertit un number[] en literal pgvector "[0.1,0.2,...]".
 * Valide que chaque element est un nombre fini (pas d'injection possible
 * meme si l'input est compromis).
 *
 * Exporte pour testabilite : la validation est notre seule defense
 * contre l'injection SQL puisque le vector literal est concatene
 * directement dans la requete (Prisma ne supporte pas le type vector
 * dans les params typed). Cf. pgvector.test.ts.
 */
export function toVectorLiteral(v: number[]): string {
  for (const x of v) {
    if (typeof x !== "number" || !Number.isFinite(x)) {
      throw new Error("vector contient une valeur non-numerique");
    }
  }
  return `[${v.join(",")}]`;
}
