// SPDX-License-Identifier: AGPL-3.0-or-later
// Cache disque + manifest pour le TTS pre-rendu.
//
// LAYOUT :
//   data/tts-cache/
//     manifest.json                       <-- COMMIT
//     ab/abcdef123456...mp3               <-- gitignored (regenerable)
//     cd/cdef987654...mp3
//     ...
//
// Pourquoi sharder par 2 chars : avec ~270 segments, un seul dossier flat marche
// mais devient pesant a `ls` ; le sharding par prefix de hash garde chaque dossier
// sous ~10 fichiers et passe bien sur n'importe quel FS.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Manifest, ManifestEntry } from "./types";
import { TTS_MODEL } from "./mistral";

/**
 * Bumper ce marker invalide tout le cache au prochain build.
 * Utile si :
 *   - on change la logique de sanitize (nouveau bug fixe)
 *   - on change le mapping voix par defaut
 *   - on veut forcer une regeneration sans toucher au texte source
 */
const CACHE_VERSION_MARKER = "v1";

export type CacheRoot = {
  /** Chemin absolu vers data/tts-cache/ */
  root: string;
};

export function defaultCacheRoot(cwd = process.cwd()): CacheRoot {
  return { root: join(cwd, "data", "tts-cache") };
}

/**
 * Hash deterministe d'un segment.
 * Inclut le modele (voxtral-...|piper-...), la voix, le marker de version,
 * et le texte sanitise. Tout ce qui change la sortie audio est dans le hash.
 *
 * Le parametre `model` est optionnel et defaut sur le modele Voxtral courant ;
 * les autres providers passent leur propre identifiant ("piper-fr_FR-siwis-medium").
 * Resultat : Voxtral et Piper coexistent dans le meme cache sans collision.
 */
export function segmentHash(
  text: string,
  voice: string,
  model: string = TTS_MODEL,
): string {
  const h = createHash("sha256");
  h.update(`${model}\n${CACHE_VERSION_MARKER}\n${voice}\n${text}`);
  return h.digest("hex");
}

/**
 * Chemin du fichier MP3 cache pour un hash donne (cree le dossier shard si besoin).
 */
export function pathForHash(cacheRoot: CacheRoot, hash: string): string {
  const shard = hash.slice(0, 2);
  return join(cacheRoot.root, shard, `${hash}.mp3`);
}

export function ensureCacheDir(cacheRoot: CacheRoot, hash: string): void {
  const dir = dirname(pathForHash(cacheRoot, hash));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function isCached(cacheRoot: CacheRoot, hash: string): boolean {
  return existsSync(pathForHash(cacheRoot, hash));
}

export function writeCachedMP3(cacheRoot: CacheRoot, hash: string, buffer: Buffer): string {
  ensureCacheDir(cacheRoot, hash);
  const p = pathForHash(cacheRoot, hash);
  writeFileSync(p, buffer);
  return p;
}

export function readCachedMP3(cacheRoot: CacheRoot, hash: string): Buffer | null {
  const p = pathForHash(cacheRoot, hash);
  if (!existsSync(p)) return null;
  return readFileSync(p);
}

// ----------------------------------------------------------------------------
// Manifest
// ----------------------------------------------------------------------------

export function manifestPath(cacheRoot: CacheRoot): string {
  return join(cacheRoot.root, "manifest.json");
}

export function loadManifest(cacheRoot: CacheRoot): Manifest {
  const p = manifestPath(cacheRoot);
  if (!existsSync(p)) {
    return {
      version: 1,
      model: TTS_MODEL,
      generatedAt: new Date(0).toISOString(),
      segments: {},
    };
  }
  return JSON.parse(readFileSync(p, "utf8")) as Manifest;
}

export function saveManifest(cacheRoot: CacheRoot, manifest: Manifest): void {
  const p = manifestPath(cacheRoot);
  if (!existsSync(cacheRoot.root)) mkdirSync(cacheRoot.root, { recursive: true });
  writeFileSync(p, JSON.stringify(manifest, null, 2));
}

/**
 * Cle stable pour un segment dans le manifest.
 * Format : `${saisonSlug}/${episodeSlug}/${segmentId}`
 */
export function manifestKey(saisonSlug: string, episodeSlug: string, segmentId: string): string {
  return `${saisonSlug}/${episodeSlug}/${segmentId}`;
}

/**
 * Estime la duree audio (en secondes) a partir du nombre de mots.
 * Heuristique FR : ~150 mots/min lecture didactique posee, soit 2.5 mots/s.
 */
export function estimateDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Number((words / 2.5).toFixed(1));
}

/**
 * Met a jour une entree du manifest pour un segment cache.
 */
export function recordSegment(
  manifest: Manifest,
  saisonSlug: string,
  episodeSlug: string,
  segmentId: string,
  entry: ManifestEntry,
): void {
  const key = manifestKey(saisonSlug, episodeSlug, segmentId);
  manifest.segments[key] = entry;
}
