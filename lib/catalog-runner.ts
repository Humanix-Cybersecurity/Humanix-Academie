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
// tsx est présent dans l'image (node_modules complet copié depuis le builder ;
// le docker-entrypoint fait déjà `npx tsx scripts/seed-catalog.ts`).

import { execFile } from "node:child_process";
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

/** Binaire tsx local (présent dans node_modules de l'image). */
function tsxBin(): string {
  return path.join(process.cwd(), "node_modules", ".bin", "tsx");
}

async function runTsxScript(
  scriptRelPath: string,
  timeoutMs: number,
): Promise<string> {
  const { stdout } = await execFileAsync(
    tsxBin(),
    [path.join(process.cwd(), scriptRelPath)],
    {
      cwd: process.cwd(),
      // Hérite de l'env (DEMO_MODE, DATABASE_URL…) du process Next.
      env: process.env,
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return stdout;
}

function extractJsonLine<T>(stdout: string, marker: string): T | null {
  const line = stdout
    .split("\n")
    .find((l) => l.startsWith(marker));
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
    const out = await runTsxScript("scripts/catalog-report.ts", 60_000);
    return extractJsonLine<CatalogReport>(out, "__CATALOG_REPORT__");
  } catch {
    return null;
  }
}

/**
 * Re-seed COMPLET du catalogue via tsx (résout le commercial, contrairement à
 * un seedCatalog() in-process bundlé). Lève en cas d'échec ou de sortie
 * inattendue — l'appelant (server action) loggue l'erreur en audit.
 */
export async function reseedCatalogViaTsx(): Promise<CatalogReseedResult> {
  const out = await runTsxScript("scripts/seed-catalog.ts", 180_000);
  const result = extractJsonLine<CatalogReseedResult>(out, "__SEED_RESULT__");
  if (!result) {
    throw new Error(
      "reseed: sortie tsx sans __SEED_RESULT__ — " +
        out.trim().split("\n").slice(-3).join(" | ").slice(0, 500),
    );
  }
  return result;
}
