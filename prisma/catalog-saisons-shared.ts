// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Types partages entre le catalog COMMERCIAL (prisma/catalog-saisons.ts,
// en repo prive Open Core) et le catalog DEMO (prisma/catalog-saisons-demo.ts,
// en repo public AGPL).
//
// Pourquoi ce fichier : permettre au repo OSS pur (sans le catalog
// commercial) de continuer a compiler et a typer le catalog demo.
//
// Cf. docs/OPEN_CORE.md pour l'architecture.

export type CatalogEpisode = {
  slug: string;
  title: string;
  durationMinutes: number; // 5-10 min cible (5 min/sem)
  difficulty: "easy" | "medium" | "hard";
};

export type CatalogSaison = {
  slug: string;
  title: string;
  description: string;
  coverEmoji: string;
  order: number;
  // Audience suggeree : "tous" / "managers" / "rh" / "compta" / "dev" / etc.
  audience: string;
  episodes: CatalogEpisode[];
};

/**
 * Mapping XP par difficulte (utilise par les 2 catalogs).
 *  - easy   :  40 XP
 *  - medium :  60 XP
 *  - hard   :  90 XP
 */
export function xpForDifficulty(
  difficulty: CatalogEpisode["difficulty"],
): number {
  if (difficulty === "easy") return 40;
  if (difficulty === "hard") return 90;
  return 60;
}

/**
 * Mapping coins par difficulte (utilise par les 2 catalogs).
 *  - easy   :  8 coins
 *  - medium : 12 coins
 *  - hard   : 18 coins
 */
export function coinsForDifficulty(
  difficulty: CatalogEpisode["difficulty"],
): number {
  if (difficulty === "easy") return 8;
  if (difficulty === "hard") return 18;
  return 12;
}

/**
 * Helper combine pour le seed : retourne `{ xpReward, coinsReward }` selon
 * la difficulte. Utilise dans prisma/seed.ts au moment de creer chaque
 * Episode en BDD.
 */
export function rewardsFor(diff: CatalogEpisode["difficulty"]): {
  xpReward: number;
  coinsReward: number;
} {
  return {
    xpReward: xpForDifficulty(diff),
    coinsReward: coinsForDifficulty(diff),
  };
}

/**
 * Verification d'integrite du catalogue (anti-doublons + comptage).
 * Appele en debut de seed pour fail-fast. Generique : prend le catalog
 * en parametre pour fonctionner avec le commercial OU le demo.
 *
 * @throws si un slug de saison ou d'episode est duplique
 */
export function validateCatalog(saisons: CatalogSaison[]): {
  totalSaisons: number;
  totalEpisodes: number;
} {
  const saisonSlugs = new Set<string>();
  let totalEpisodes = 0;
  for (const s of saisons) {
    if (saisonSlugs.has(s.slug)) {
      throw new Error(`Doublon de saison : ${s.slug}`);
    }
    saisonSlugs.add(s.slug);
    const episodeSlugs = new Set<string>();
    for (const e of s.episodes) {
      if (episodeSlugs.has(e.slug)) {
        throw new Error(`Doublon d'episode dans ${s.slug} : ${e.slug}`);
      }
      episodeSlugs.add(e.slug);
      totalEpisodes++;
    }
  }
  return { totalSaisons: saisons.length, totalEpisodes };
}
