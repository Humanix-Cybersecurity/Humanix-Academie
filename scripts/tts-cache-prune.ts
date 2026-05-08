#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// tts-cache-prune.ts -- Supprime les MP3 orphelins du cache TTS.
// =============================================================================
//
// USAGE :
//   npm run tts:prune                 # liste les orphelins, sans rien supprimer
//   npm run tts:prune -- --apply      # supprime reellement
//
// Un MP3 est "orphelin" s'il est dans data/tts-cache/<2>/<hash>.mp3 mais que
// son <hash> n'apparait pas dans manifest.json. Cas frequents :
//   - apres un changement de sanitize/voice mapping qui produit de nouveaux hashes
//   - apres une suppression d'un episode du catalogue
//   - apres un bump du CACHE_VERSION_MARKER
//
// Cette commande est idempotente et safe : --apply liste avant chaque rm.
// =============================================================================

import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import { defaultCacheRoot, loadManifest } from "../lib/tts/cache";

const APPLY = process.argv.includes("--apply");

const isTTY = process.stdout.isTTY;
const c = {
  dim: (s: string) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s),
  yellow: (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
  red: (s: string) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s: string) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  bold: (s: string) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s),
};

const HASH_RE = /^[a-f0-9]{64}\.mp3$/;

function main() {
  const root = defaultCacheRoot();
  if (!existsSync(root.root)) {
    console.error(`Cache absent : ${root.root}`);
    process.exit(0);
  }
  const manifest = loadManifest(root);
  const knownHashes = new Set<string>(
    Object.values(manifest.segments).map((s) => s.hash),
  );

  console.log(c.bold(`\n🧹 TTS cache prune`));
  console.log(c.dim(`   cache=${root.root}`));
  console.log(c.dim(`   manifest=${Object.keys(manifest.segments).length} segments references, ${knownHashes.size} hashes uniques`));
  if (!APPLY) console.log(c.yellow(`   --dry mode (use --apply pour supprimer)`));

  // Parcours des shards <2chars>/<hash>.mp3
  const orphans: string[] = [];
  let totalBytes = 0;
  let totalFiles = 0;

  for (const shard of readdirSync(root.root, { withFileTypes: true })) {
    if (!shard.isDirectory()) continue;
    if (!/^[a-f0-9]{2}$/.test(shard.name)) continue;
    const shardDir = join(root.root, shard.name);
    for (const file of readdirSync(shardDir)) {
      if (!HASH_RE.test(file)) continue;
      const filePath = join(shardDir, file);
      const hash = file.slice(0, 64);
      totalFiles++;
      totalBytes += statSync(filePath).size;
      if (!knownHashes.has(hash)) {
        orphans.push(filePath);
      }
    }
  }

  console.log(`\n   ${totalFiles} fichiers MP3 sur disque (${(totalBytes / 1024 / 1024).toFixed(1)} Mo)`);
  console.log(`   ${c.yellow(`${orphans.length} orphelin(s)`)} a nettoyer\n`);

  if (orphans.length === 0) {
    console.log(c.green(`✓ Cache deja propre.\n`));
    return;
  }

  let bytesFreed = 0;
  for (const p of orphans) {
    const sz = statSync(p).size;
    bytesFreed += sz;
    if (APPLY) {
      unlinkSync(p);
      console.log(`  ${c.red("rm")}  ${p.replace(root.root, "data/tts-cache")}  (${(sz / 1024).toFixed(0)} Ko)`);
    } else {
      console.log(`  ${c.dim("would rm")}  ${p.replace(root.root, "data/tts-cache")}  (${(sz / 1024).toFixed(0)} Ko)`);
    }
  }

  console.log(`\n${APPLY ? c.green("✓ Supprime") : c.yellow("Liste")} : ${(bytesFreed / 1024 / 1024).toFixed(1)} Mo de cache orphelin`);
  if (!APPLY) console.log(c.dim(`Relance avec --apply pour effacer reellement.\n`));
  else console.log();
}

main();
