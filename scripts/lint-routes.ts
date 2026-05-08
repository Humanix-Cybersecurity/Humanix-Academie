#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Lint des hrefs vers des routes inexistantes ou obsolètes.
 *
 * Scanne app/, components/, lib/ à la recherche de patterns interdits
 * dans les attributs `href`. Sort en code 1 dès qu'un est trouvé.
 *
 * Pour ajouter une règle : pousser dans FORBIDDEN_PATTERNS ci-dessous.
 *
 * Lancement : `npm run lint:routes` (ou `tsx scripts/lint-routes.ts`).
 * Branché aussi dans le `lint` global de package.json.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

type Rule = {
  /** Pattern regex à interdire dans les hrefs (sans les guillemets) */
  pattern: RegExp;
  /** Description du problème pour l'erreur */
  reason: string;
  /** Suggestion de remplacement à afficher */
  fix: string;
};

const FORBIDDEN_PATTERNS: Rule[] = [
  {
    pattern: /href=["']\/saisons\//,
    reason:
      '/saisons/ est le chemin du contenu source (content/saisons/), pas une route applicative.',
    fix: 'Remplacer "/saisons/" par "/apprendre/" (route Next.js : app/apprendre/[saison]/[episode]/page.tsx).',
  },
];

const SCAN_DIRS = ["app", "components", "lib"];
const FILE_EXT = /\.(tsx?|jsx?|mdx)$/;

type Hit = { file: string; line: number; snippet: string; rule: Rule };

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      await walk(full, files);
    } else if (FILE_EXT.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const hits: Hit[] = [];
  for (const dir of SCAN_DIRS) {
    let files: string[] = [];
    try {
      files = await walk(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      const content = await readFile(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        for (const rule of FORBIDDEN_PATTERNS) {
          if (rule.pattern.test(line)) {
            hits.push({
              file,
              line: idx + 1,
              snippet: line.trim(),
              rule,
            });
          }
        }
      });
    }
  }

  if (hits.length === 0) {
    console.log("✓ lint-routes : aucun href interdit");
    return;
  }

  console.error(`\n✗ lint-routes : ${hits.length} href(s) interdit(s) détecté(s)\n`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line}`);
    console.error(`    ${hit.snippet}`);
    console.error(`    ↳ ${hit.rule.reason}`);
    console.error(`    ↳ ${hit.rule.fix}\n`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("lint-routes a planté :", err);
  process.exit(2);
});
