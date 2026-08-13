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

// --- Contenu commercial, resolu STATIQUEMENT -------------------------------
//
// Ces quatre modules sont des symlinks vers le submodule prive content-pro/,
// gitignores : sur un fork AGPLv3 pur ils n'existent pas. Ils sont garantis
// presents au build par scripts/resoudre-contenu-optionnel.ts, qui genere
// un substitut exportant un tableau vide quand content-pro est absent.
//
// POURQUOI DES IMPORTS STATIQUES PLUTOT QU'UN require() DYNAMIQUE.
//
// Le chargement se faisait par `require()` entoure d'un try/catch. Ca
// fonctionnait, mais avec un defaut grave : TOUTE transformation du mode
// d'execution le cassait EN SILENCE. Mesure du 2026-08-12, meme code :
//
//     tsx (mode historique)       : 58 saisons, source=commercial
//     bundle ESM (esbuild + node) :  5 saisons, source=demo
//
// Le `catch` avalait l'echec et le code concluait poliment "pas de catalogue
// commercial". Aucune erreur, aucun journal : le site serait passe de 63
// saisons a 5 sans que rien ne le signale.
//
// La resolution se fait desormais a la COMPILATION. Bundler, compiler ou
// passer a `node` ne peut plus rien casser, et un module reellement
// introuvable fait echouer le build au lieu de degrader la production.
import { CATALOG_SAISONS } from "./catalog-saisons";
import { LIBRARY_ARTICLES } from "../lib/library-seed";
import { LIBRARY_ARTICLES_DEMO } from "../lib/library-seed-demo";
import { MARKETPLACE_MODULES } from "../lib/marketplace-seed";
import { ANECDOTES_SEED } from "../lib/anecdotes/seed-data";
import { ANECDOTES_SEED_DEMO } from "../lib/anecdotes/seed-data-demo";

/**
 * En mode DEMO, on bypass systematiquement content-pro pour offrir
 * une experience OSS pure aux visiteurs de la demo publique.
 * Cf. en-tete de fichier pour le rationale.
 */
const IS_DEMO_MODE = process.env.DEMO_MODE === "true";

/**
 * Le contenu commercial est-il REELLEMENT present, ou s'agit-il d'un
 * substitut genere ? Un substitut exporte un tableau vide : c'est le
 * signal, et il remplace exactement l'ancien `tryRequire() === null`.
 */
function estPresent(donnees: unknown[]): boolean {
  return Array.isArray(donnees) && donnees.length > 0;
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
  if (estPresent(CATALOG_SAISONS)) {
    return {
      saisons: CATALOG_SAISONS as CatalogSaison[],
      source: "commercial",
    };
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
  return estPresent(CATALOG_SAISONS);
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
  // Un substitut genere exporte un tableau VIDE : on retombe alors sur les
  // 5 articles demo, comme le faisait l'ancien `tryRequire() === null`.
  if (estPresent(LIBRARY_ARTICLES)) return LIBRARY_ARTICLES;
  return LIBRARY_ARTICLES_DEMO;
}

/**
 * Resout les modules marketplace officiels.
 * Tableau vide si non disponibles (fork OSS pur).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadMarketplaceModules(): any[] {
  if (IS_DEMO_MODE) return [];
  return estPresent(MARKETPLACE_MODULES) ? MARKETPLACE_MODULES : [];
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
    return ANECDOTES_SEED_DEMO;
  }
  // Les alias historiques ANECDOTE_SEEDS / SEED_ANECDOTES ne sont plus
  // tolerés : un import statique porte un nom unique. Un fork qui utilisait
  // l'ancien nom verra desormais son BUILD echouer avec un message explicite,
  // au lieu de recevoir un tableau vide sans explication.
  return estPresent(ANECDOTES_SEED) ? ANECDOTES_SEED : [];
}
