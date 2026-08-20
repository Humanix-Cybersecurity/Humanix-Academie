// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Exécute les scripts catalogue en SOUS-PROCESS tsx, depuis le runtime Next.
//
// POURQUOI : `prisma/catalog-saisons.ts` est un symlink vers le submodule
// commercial content-pro. Le build serveur Next (webpack) ne résout PAS
// fiablement ce symlink dans le bundle -> au runtime, loadCatalogSaisons()
// appelé in-process retombe sur le catalogue "demo" même quand content-pro est
// présent. tsx (comme le boot-seed et `npm run db:seed`) lit le .ts sur disque
// et voit le commercial. On délègue donc le diagnostic ET le re-seed de
// /superadmin/catalog à tsx pour qu'ils reflètent la réalité du disque.
//
// CE COMMENTAIRE ETAIT FAUX, ET IL A CASSE LE BOUTON DE RE-IMPORT.
//
//   Il affirmait que « tsx est présent dans l'image ». Ca ne l'est plus : le
//   Dockerfile fait `npm prune --omit=dev`, qui retire tsx (dependance de
//   developpement), puis retire npm lui-meme. Constate en production le
//   2026-08-20 : `spawn /app/node_modules/.bin/tsx ENOENT`, et ni le binaire
//   ni le paquet tsx n'existent dans le conteneur.
//
//   L'entrypoint, lui, avait ete migre vers des scripts COMPILES :
//   `node dist-scripts/scripts/seed-catalog.mjs`. Ce module est reste en
//   arriere. Le re-import etait donc casse depuis cette migration, sans que
//   rien ne le signale -- le diagnostic, lui, retombait silencieusement sur
//   la resolution in-process et continuait d'afficher des chiffres justes.
//
// ON APPELLE DONC LE MEME SCRIPT COMPILE QUE L'ENTRYPOINT, avec repli sur tsx
// en developpement, ou dist-scripts n'existe pas.

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CatalogReport = {
  source: "commercial" | "demo";
  demoMode: boolean;
  commercialAvailable: boolean;
  saisons: number;
  episodes: number;
  badges: number;
  items: number;
};

export type CatalogReseedResult = {
  source: "commercial" | "demo";
  saisons: number;
  episodes: number;
  achievements: number;
  shopItems: number;
  phishingTemplates: number;
  communityTenantSlug: string;
  durationMs: number;
  reevaluated: number;
  newBadges: number;
};

/**
 * Choisit comment executer un script catalogue.
 *
 * En production : le `.mjs` compile par esbuild, lance par `node` -- exactement
 * ce que fait docker-entrypoint.sh au demarrage.
 * En developpement : le `.ts` via tsx, qui n'existe que la.
 *
 * @param scriptRelPath chemin du source, ex. « scripts/seed-catalog.ts »
 */
function commandePour(scriptRelPath: string): {
  binaire: string;
  argument: string;
} | null {
  const compile = path.join(
    process.cwd(),
    "dist-scripts",
    scriptRelPath.replace(/\.ts$/, ".mjs"),
  );
  if (fs.existsSync(compile)) {
    return { binaire: process.execPath, argument: compile };
  }
  const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx");
  if (fs.existsSync(tsx)) {
    return { binaire: tsx, argument: path.join(process.cwd(), scriptRelPath) };
  }
  // Ni l'un ni l'autre : on le dit clairement plutot que de laisser remonter
  // un ENOENT que personne ne sait interpreter.
  return null;
}

async function runScript(
  scriptRelPath: string,
  timeoutMs: number,
): Promise<string> {
  const cmd = commandePour(scriptRelPath);
  if (!cmd) {
    throw new Error(
      `${scriptRelPath} introuvable : ni dist-scripts/*.mjs (production), ` +
        `ni tsx (developpement). Le script a-t-il ete ajoute a la liste ` +
        `esbuild du Dockerfile ?`,
    );
  }
  const { stdout } = await execFileAsync(cmd.binaire, [cmd.argument], {
    cwd: process.cwd(),
    // Hérite de l'env (DEMO_MODE, DATABASE_URL…) du process Next.
    env: process.env,
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

function extractJsonLine<T>(stdout: string, marker: string): T | null {
  const line = stdout.split("\n").find((l) => l.startsWith(marker));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(marker.length)) as T;
  } catch {
    return null;
  }
}

/**
 * Diagnostic READ-ONLY de la source du catalogue (aucun accès BDD).
 * ~1-2 s (démarrage tsx). Retourne null si le sous-process échoue : l'appelant
 * doit alors retomber sur la résolution in-process (dev / fork OSS).
 */
export async function getCatalogReport(): Promise<CatalogReport | null> {
  try {
    const out = await runScript("scripts/catalog-report.ts", 60_000);
    return extractJsonLine<CatalogReport>(out, "__CATALOG_REPORT__");
  } catch {
    return null;
  }
}

/**
 * Re-seed COMPLET du catalogue via tsx (résout le commercial, contrairement à
 * un seedCatalog() in-process bundlé). Lève en cas d'échec ou de sortie
 * inattendue - l'appelant (server action) loggue l'erreur en audit.
 */
export async function reseedCatalogViaTsx(): Promise<CatalogReseedResult> {
  const out = await runScript("scripts/seed-catalog.ts", 180_000);
  const result = extractJsonLine<CatalogReseedResult>(out, "__SEED_RESULT__");
  if (!result) {
    throw new Error(
      "reseed: sortie tsx sans __SEED_RESULT__ - " +
        out.trim().split("\n").slice(-3).join(" | ").slice(0, 500),
    );
  }
  return result;
}
