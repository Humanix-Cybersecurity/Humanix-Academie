// SPDX-License-Identifier: AGPL-3.0-or-later
// Script d'indexation des modules MDX + articles librairie pour Hex RAG.
//
// Pipeline :
//   1. Setup pgvector (idempotent : CREATE EXTENSION + CREATE TABLE + INDEX)
//   2. Scan content/saisons/*/*.mdx et content/bibliotheque/*.mdx
//   3. Pour chaque MDX :
//      - Parse frontmatter (gray-matter)
//      - Extrait le corps textuel (concatene scenario + debrief + choices)
//      - Split en chunks de ~800 caracteres (overlap 100)
//      - Embed par batch de 8 (Mistral API)
//      - Upsert dans hex_embedding (idempotent via PK source_path:chunk_index)
//   4. Statistiques finales : N fichiers, M chunks, X erreurs
//
// Usage :
//   npm run hex:reindex          # full reindex (idempotent)
//   npm run hex:reindex -- --dry # dry-run : liste les fichiers sans appeler l'API
//   npm run hex:reindex -- --only content/saisons/email-pro  # subset
//
// Cout : ~1000 chunks × $0.0001/embed = ~$0.10 par full reindex en cloud.
// Free tier Mistral "Experiment" couvre largement ce volume one-shot.

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PrismaClient } from "@prisma/client";
import {
  embedTexts,
  isMistralEmbeddingsAvailable,
  EMBED_DIMS,
} from "../lib/ai/embeddings/mistral-embed";
import {
  setupPgvector,
  upsertChunk,
  deleteChunksFromSource,
} from "../lib/ai/embeddings/pgvector";

const prisma = new PrismaClient();

// Bind du `db` shared (lib/db.ts) sur ce prisma standalone. Permet
// d'utiliser les helpers pgvector.ts qui referencent `db`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__hexReindexPrisma = prisma;

// On surclasse lib/db.ts via le globalThis cache utilise par Prisma en dev.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__prisma = prisma;

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const BATCH_SIZE = 8;

type Args = {
  dry: boolean;
  only: string | null;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let dry = false;
  let only: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry") dry = true;
    else if (a === "--only") {
      only = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return { dry, only };
}

async function findMdxFiles(root: string, subset: string | null): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string) {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && e.name.endsWith(".mdx")) {
        if (subset && !p.includes(subset)) continue;
        found.push(p);
      }
    }
  }
  await walk(root);
  return found.sort();
}

// Extrait un corps de texte exploitable depuis le frontmatter MDX. Les
// champs structures (scenario, choices, debrief...) sont concatenes en
// une chaine plate pour le chunking. On garde l'ordre source pour
// preserver la coherence du flow narratif.
function extractBody(frontmatter: Record<string, unknown>, content: string): string {
  const parts: string[] = [];

  const push = (label: string, val: unknown) => {
    if (typeof val === "string" && val.trim()) {
      parts.push(`${label} : ${val.trim()}`);
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string") {
          parts.push(`- ${item}`);
        } else if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          if (typeof obj.feedback === "string") {
            parts.push(`- ${obj.label ?? ""} → ${obj.feedback}`);
          } else if (typeof obj.label === "string") {
            parts.push(`- ${obj.label}`);
          }
        }
      }
    }
  };

  push("Titre", frontmatter.title);
  push("Objectif", frontmatter.objective);
  push("Scenario", frontmatter.scenario);
  push("Choix", frontmatter.choices);
  push("Debrief", frontmatter.debrief);
  push("Tips", frontmatter.tips);
  push("Quiz", frontmatter.quiz);

  // Corps MDX (souvent vide mais on l'inclut au cas ou)
  const trimmed = content.trim();
  if (trimmed) parts.push(trimmed);

  return parts.join("\n\n");
}

function chunkText(text: string): string[] {
  const out: string[] = [];
  if (text.length <= CHUNK_SIZE) {
    out.push(text);
    return out;
  }
  let pos = 0;
  while (pos < text.length) {
    const end = Math.min(text.length, pos + CHUNK_SIZE);
    // Cut sur saut de paragraphe le plus proche pour ne pas hacher
    // au milieu d'une phrase
    let cut = end;
    if (end < text.length) {
      const lastBreak = text.lastIndexOf("\n\n", end);
      if (lastBreak > pos + CHUNK_SIZE / 2) cut = lastBreak;
    }
    out.push(text.slice(pos, cut).trim());
    if (cut === text.length) break;
    pos = Math.max(cut - CHUNK_OVERLAP, pos + 1);
  }
  return out;
}

// Mappe un chemin MDX vers l'URL publique de l'episode.
// content/saisons/email-pro/01-cci-cco.mdx → /apprendre/email-pro/01-cci-cco
function pathToUrl(mdxPath: string): string | null {
  const rel = mdxPath.replace(/^.*\/content\//, "");
  const saisonsMatch = rel.match(/^saisons\/([^/]+)\/([^/]+)\.mdx$/);
  if (saisonsMatch) {
    return `/apprendre/${saisonsMatch[1]}/${saisonsMatch[2]}`;
  }
  const libMatch = rel.match(/^bibliotheque\/(.+)\.mdx$/);
  if (libMatch) {
    return `/librairie/${libMatch[1]}`;
  }
  return null;
}

async function main() {
  const args = parseArgs();

  console.log("hex-reindex: démarrage");
  console.log(`  dry-run: ${args.dry}`);
  console.log(`  subset:  ${args.only ?? "(tous)"}`);

  if (!args.dry) {
    if (!isMistralEmbeddingsAvailable()) {
      console.error(
        "  MISTRAL_API_KEY manquant : indexation impossible. Set la cle puis relance.",
      );
      process.exit(1);
    }

    console.log("\n[1/3] Setup pgvector (CREATE EXTENSION + table + index)…");
    try {
      await setupPgvector();
      console.log("       ✓ pgvector pret");
    } catch (err) {
      console.error("       ✗ setup pgvector echoue :", err);
      console.error(
        "       Probleme typique : l'utilisateur DB n'a pas SUPERUSER pour CREATE EXTENSION.",
      );
      console.error(
        "       Solution : un admin DB doit lancer 'CREATE EXTENSION vector;' manuellement.",
      );
      process.exit(1);
    }
  }

  console.log("\n[2/3] Scan des fichiers MDX…");
  const root = path.resolve(process.cwd(), "content");
  const files = await findMdxFiles(root, args.only);
  console.log(`       ${files.length} fichier(s) trouve(s)`);
  if (args.dry) {
    for (const f of files) console.log(`  - ${path.relative(process.cwd(), f)}`);
    console.log("\nDry-run termine. Re-lance sans --dry pour indexer.");
    return;
  }

  console.log(`\n[3/3] Indexation (chunks ~${CHUNK_SIZE} chars, batch ${BATCH_SIZE})…`);
  let totalChunks = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i += 1) {
    const filePath = files[i];
    const rel = path.relative(process.cwd(), filePath);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = matter(raw);
      const title =
        (parsed.data?.title as string | undefined) ?? path.basename(filePath);
      const body = extractBody(parsed.data ?? {}, parsed.content);
      const url = pathToUrl(filePath);

      const chunks = chunkText(body);
      if (chunks.length === 0) {
        console.log(`  [${i + 1}/${files.length}] ${rel} → skip (vide)`);
        continue;
      }

      // Purge l'ancien indexage pour cette source (idempotent : re-run propre)
      await deleteChunksFromSource(rel);

      // Batch les embeddings pour optimiser les appels API
      for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
        const batch = chunks.slice(b, b + BATCH_SIZE);
        const vectors = await embedTexts(batch);
        for (let j = 0; j < batch.length; j += 1) {
          const v = vectors[j];
          if (!v || v.length !== EMBED_DIMS) {
            console.warn(`     chunk ${b + j} : vector invalide, skip`);
            continue;
          }
          await upsertChunk({
            id: `${rel}#${b + j}`,
            sourcePath: rel,
            chunkIndex: b + j,
            title,
            url,
            content: batch[j],
            metadata: { url, source: rel },
            embedding: v,
          });
          totalChunks += 1;
        }
      }

      console.log(`  [${i + 1}/${files.length}] ${rel} → ${chunks.length} chunks`);
    } catch (err) {
      errors += 1;
      console.error(`  [${i + 1}/${files.length}] ${rel} → ERREUR`, err);
    }
  }

  console.log("\nhex-reindex: termine.");
  console.log(`  fichiers traites : ${files.length}`);
  console.log(`  chunks indexes   : ${totalChunks}`);
  console.log(`  erreurs          : ${errors}`);
  if (errors > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error("hex-reindex a echoue :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
