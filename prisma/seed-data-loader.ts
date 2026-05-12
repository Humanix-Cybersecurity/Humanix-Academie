// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Open Core seed data loader — resout dynamiquement la source des donnees
// pedagogiques au seeding.
//
// 4 surfaces de contenu commercial Humanix Cybersecurity :
//   1. CATALOG_SAISONS    catalogue 27 saisons × 6 episodes
//   2. LIBRARY_ARTICLES   articles librairie cyber-RH
//   3. MARKETPLACE_MODULES marketplace officielle (modules contributes
//                          + curated par Humanix)
//   4. ANECDOTES          newsletter quotidienne
//
// Chacune peut etre absente sur un fork OSS pur — auquel cas on fallback
// gracieusement :
//   - CATALOG : on bascule sur le catalog DEMO (2 saisons × 3 episodes,
//     CC BY-SA, livre dans le repo public).
//   - LIBRARY, MARKETPLACE, ANECDOTES : tableau vide. L'app marche, ces
//     surfaces sont juste vides.
//
// Cf. docs/OPEN_CORE.md pour le rationale + workflow operateur.

import type { CatalogSaison } from "./catalog-saisons-shared";
import { CATALOG_SAISONS_DEMO } from "./catalog-saisons-demo";

/**
 * Tente d'importer dynamiquement un module. Retourne `null` si absent.
 *
 * Utilise un require() entoure de try/catch plutot qu'un import statique :
 *   - Permet aux forks OSS purs (sans le catalog commercial) de compiler
 *     et de tourner sans erreur.
 *   - Le bundler Next.js gere bien require() au runtime serveur Node.
 *   - eslint-disable car la regle no-require-imports est trop stricte
 *     pour ce cas de plugin loading.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryRequire(path: string): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(path);
  } catch {
    return null;
  }
}

/**
 * Resout le catalog de saisons actif :
 *   - Si prisma/catalog-saisons.ts existe → l'utilise (catalogue commercial
 *     complet, 27 saisons × 6 episodes)
 *   - Sinon → fallback sur catalog-saisons-demo (2 saisons × 3 episodes,
 *     CC BY-SA, livre dans le repo public)
 */
export function loadCatalogSaisons(): {
  saisons: CatalogSaison[];
  source: "commercial" | "demo";
} {
  const pro = tryRequire("./catalog-saisons");
  if (pro && Array.isArray(pro.CATALOG_SAISONS) && pro.CATALOG_SAISONS.length) {
    return { saisons: pro.CATALOG_SAISONS, source: "commercial" };
  }
  return { saisons: CATALOG_SAISONS_DEMO, source: "demo" };
}

/**
 * Resout les articles de librairie cyber-RH.
 * Tableau vide si non disponibles (fork OSS pur).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadLibraryArticles(): any[] {
  const pro = tryRequire("../lib/library-seed");
  if (pro && Array.isArray(pro.LIBRARY_ARTICLES)) return pro.LIBRARY_ARTICLES;
  return [];
}

/**
 * Resout les modules marketplace officiels.
 * Tableau vide si non disponibles (fork OSS pur).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadMarketplaceModules(): any[] {
  const pro = tryRequire("../lib/marketplace-seed");
  if (pro && Array.isArray(pro.MARKETPLACE_MODULES))
    return pro.MARKETPLACE_MODULES;
  return [];
}

/**
 * Resout les anecdotes de newsletter.
 * Tableau vide si non disponibles (fork OSS pur).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadAnecdoteSeeds(): any[] {
  const pro = tryRequire("../lib/anecdotes/seed-data");
  if (pro && Array.isArray(pro.ANECDOTE_SEEDS)) return pro.ANECDOTE_SEEDS;
  // Certains projets exportent sous un nom different
  if (pro && Array.isArray(pro.SEED_ANECDOTES)) return pro.SEED_ANECDOTES;
  return [];
}
