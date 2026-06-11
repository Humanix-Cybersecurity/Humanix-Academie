// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Mélange DÉTERMINISTE et seedé (Fisher-Yates + PRNG mulberry32).
//
// Pourquoi seedé et pas Math.random :
//   - DÉTERMINISME : appelé dans un Server Component, le même seed donne le
//     même ordre côté SSR et côté client -> pas de mismatch d'hydratation.
//   - STABILITÉ : un user retrouve le même ordre à chaque visite d'un épisode
//     (reprise cohérente, pas de re-mélange au reload).
//   - ANTI-CORRIGÉ : en seedant par (userId + episodeId), l'ordre diffère d'un
//     user à l'autre -> impossible de partager « la bonne réponse est en 2 ».

/** Hash FNV-1a 32 bits d'une chaîne -> uint32 (pour seeder le PRNG). */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG déterministe mulberry32 : renvoie une fonction () => [0,1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Renvoie une COPIE du tableau mélangée de façon déterministe selon `seed`.
 * Le même (tableau, seed) -> toujours le même ordre. Tableau d'origine intact.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const arr = [...items];
  const rng = mulberry32(hashString(seed));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
