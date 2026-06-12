// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Open Core seed data loader - resout dynamiquement la source des donnees
// pedagogiques au seeding.
//
// 4 surfaces de contenu commercial Humanix Cybersecurity :
//   1. CATALOG_SAISONS    catalogue 27 saisons × 6 episodes
//   2. LIBRARY_ARTICLES   articles librairie cyber-RH
//   3. MARKETPLACE_MODULES marketplace officielle (modules contributes
//                          + curated par Humanix)
//   4. ANECDOTES          newsletter quotidienne
//
// Chacune peut etre absente sur un fork OSS pur - auquel cas on fallback
// gracieusement :
//   - CATALOG : on bascule sur le catalog DEMO (2 saisons × 3 episodes,
//     CC BY-SA, livre dans le repo public).
//   - LIBRARY, MARKETPLACE, ANECDOTES : tableau vide. L'app marche, ces
//     surfaces sont juste vides.
//
// Mode DEMO (DEMO_MODE=true) : on force le fallback OSS meme si
// content-pro/ est present. Une instance de demo doit se comporter comme
// un fork AGPLv3 pur - aucun contenu premium visible, pour ne pas
// induire un visiteur en erreur ("c'est ce que j'aurai en m'abonnant")
// et pour proteger la propriete intellectuelle du contenu commercial.
//
// Cf. docs/OPEN_CORE.md pour le rationale + workflow operateur.

import type { CatalogSaison } from "./catalog-saisons-shared";
import { CATALOG_SAISONS_DEMO } from "./catalog-saisons-demo";

/**
 * En mode DEMO, on bypass systematiquement content-pro pour offrir
 * une experience OSS pure aux visiteurs de la demo publique.
 * Cf. en-tete de fichier pour le rationale.
 */
const IS_DEMO_MODE = process.env.DEMO_MODE === "true";

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
  if (IS_DEMO_MODE) {
    return { saisons: CATALOG_SAISONS_DEMO, source: "demo" };
  }
  const pro = tryRequire("./catalog-saisons");
  if (pro && Array.isArray(pro.CATALOG_SAISONS) && pro.CATALOG_SAISONS.length) {
    return { saisons: pro.CATALOG_SAISONS, source: "commercial" };
  }
  return { saisons: CATALOG_SAISONS_DEMO, source: "demo" };
}

/**
 * Le catalogue COMMERCIAL (content-pro / prisma/catalog-saisons.ts) est-il
 * present et chargeable dans CETTE image ? Independant de DEMO_MODE.
 *
 * Sert au diagnostic /superadmin/catalog : si le catalogue resout en "demo"
 * alors qu'on attend du commercial, on veut savoir si c'est (a) DEMO_MODE=true
 * qui force le demo, ou (b) content-pro absent de l'image (ex. image OSS).
 */
export function isCommercialCatalogAvailable(): boolean {
  const pro = tryRequire("./catalog-saisons");
  return !!(
    pro &&
    Array.isArray(pro.CATALOG_SAISONS) &&
    pro.CATALOG_SAISONS.length
  );
}

/**
 * Resout les articles de librairie cyber-RH.
 * Tableau vide si non disponibles (fork OSS pur).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadLibraryArticles(): any[] {
  // EXCEPTION DEMO_MODE : la librairie est la VITRINE SEO publique de
  // Humanix. Elle doit etre identique en demo et en prod commerciale -
  // 30 articles complets, indexables par Google sans gating. On ne
  // grise rien et on ne masque rien : c'est notre canal d'acquisition.
  // Cf. app/librairie/page.tsx + app/robots.ts (allow).
  const pro = tryRequire("../lib/library-seed");
  if (pro && Array.isArray(pro.LIBRARY_ARTICLES)) return pro.LIBRARY_ARTICLES;
  // Fork OSS pur (content-pro absent) : fallback sur les 5 articles demo
  // pour qu'une instance fork ait quand meme une librairie fonctionnelle.
  const demo = tryRequire("../lib/library-seed-demo");
  if (demo && Array.isArray(demo.LIBRARY_ARTICLES_DEMO))
    return demo.LIBRARY_ARTICLES_DEMO;
  return [];
}

/**
 * Resout les modules marketplace officiels.
 * Tableau vide si non disponibles (fork OSS pur).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadMarketplaceModules(): any[] {
  if (IS_DEMO_MODE) return [];
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
  if (IS_DEMO_MODE) {
    // En demo, on seed 6 anecdotes 2024 publiquement sourcees (CC BY-SA)
    // pour montrer le format newsletter sans exposer le catalogue complet.
    const demo = tryRequire("../lib/anecdotes/seed-data-demo");
    if (demo && Array.isArray(demo.ANECDOTES_SEED_DEMO))
      return demo.ANECDOTES_SEED_DEMO;
    return [];
  }
  const pro = tryRequire("../lib/anecdotes/seed-data");
  if (pro && Array.isArray(pro.ANECDOTES_SEED)) return pro.ANECDOTES_SEED;
  // Tolere d'anciens noms d'export pour compat fork
  if (pro && Array.isArray(pro.ANECDOTE_SEEDS)) return pro.ANECDOTE_SEEDS;
  if (pro && Array.isArray(pro.SEED_ANECDOTES)) return pro.SEED_ANECDOTES;
  return [];
}
