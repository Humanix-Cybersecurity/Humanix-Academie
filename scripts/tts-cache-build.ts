#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// tts-cache-build.ts -- Pre-rendu de tous les segments audio des episodes.
// =============================================================================
//
// USAGE :
//   npm run tts:build                  # genere ce qui manque, idempotent
//   npm run tts:build -- --dry         # liste ce qui serait fait, sans appel API
//   npm run tts:build -- --force       # regenere tout (utile apres bump du marker)
//   npm run tts:build -- --concurrency 3
//   npm run tts:build -- --saison mots-de-passe   # cible une saison
//
// L'idempotence se fait par hash : segmentHash(text + voice + model + marker).
// Si le MP3 existe a `data/tts-cache/<2chars>/<hash>.mp3`, on saute.
//
// Le manifest `data/tts-cache/manifest.json` est COMMIT (texte ~30 Ko) afin
// que la prod sache quels MP3 sont attendus avant d'avoir le cache. Les MP3
// eux-memes sont GITIGNORED (regenerable, ~50-100 Mo total).
//
// Le script charge `process.env.MISTRAL_API_KEY` -- soit deja exporte par le
// shell, soit charge via `.env.local` si present (loader minimal, zero-dep).
// =============================================================================

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { listEpisodes, listSaisons, loadEpisode } from "../lib/episodes";
import { extractSegments } from "../lib/tts/segments";
import {
  defaultCacheRoot,
  estimateDurationSec,
  isCached,
  loadManifest,
  manifestKey,
  recordSegment,
  saveManifest,
  segmentHash,
  writeCachedMP3,
} from "../lib/tts/cache";
import { generateSpeechChunked, MistralTTSError, TTS_MODEL, countWords } from "../lib/tts/mistral";
import type { AudioSegment } from "../lib/tts/types";

// -----------------------------------------------------------------------------
// Args
// -----------------------------------------------------------------------------
const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const arg = (f: string, def: string | null = null): string | null => {
  const i = argv.indexOf(f);
  if (i === -1) return def;
  return argv[i + 1] ?? def;
};

const DRY_RUN = has("--dry") || has("--dry-run");
const FORCE = has("--force");
const CONCURRENCY = Math.max(1, Math.min(20, parseInt(arg("--concurrency", "5") || "5", 10)));
const SAISON_FILTER = arg("--saison", null);
const VERBOSE = has("--verbose") || has("-v");

// -----------------------------------------------------------------------------
// Couleurs (best-effort, sans dep)
// -----------------------------------------------------------------------------
const isTTY = process.stdout.isTTY;
const c = {
  dim: (s: string) => isTTY ? `\x1b[2m${s}\x1b[0m` : s,
  green: (s: string) => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  yellow: (s: string) => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  red: (s: string) => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  bold: (s: string) => isTTY ? `\x1b[1m${s}\x1b[0m` : s,
};

// -----------------------------------------------------------------------------
// .env.local loader (si MISTRAL_API_KEY pas deja dans l'env)
// -----------------------------------------------------------------------------
function loadDotEnvLocal() {
  if (process.env.MISTRAL_API_KEY) return;
  const candidates = [".env.local", ".env"];
  for (const f of candidates) {
    const p = join(process.cwd(), f);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const key = m[1];
      if (process.env[key]) continue;
      const val = m[2].replace(/^["'](.*)["']$/, "$1");
      process.env[key] = val;
    }
  }
}

// -----------------------------------------------------------------------------
// Job description
// -----------------------------------------------------------------------------
type Job = {
  saisonSlug: string;
  episodeSlug: string;
  segment: AudioSegment;
  hash: string;
  cached: boolean;
};

function buildJobList(): Job[] {
  const jobs: Job[] = [];
  const saisons = SAISON_FILTER ? [SAISON_FILTER] : listSaisons();
  if (SAISON_FILTER && !listSaisons().includes(SAISON_FILTER)) {
    console.error(c.red(`Saison "${SAISON_FILTER}" introuvable. Saisons dispo : ${listSaisons().join(", ")}`));
    process.exit(2);
  }

  const cacheRoot = defaultCacheRoot();
  for (const saisonSlug of saisons) {
    for (const episodeSlug of listEpisodes(saisonSlug)) {
      const ep = loadEpisode(saisonSlug, episodeSlug);
      if (!ep) continue;
      for (const seg of extractSegments(ep)) {
        const hash = segmentHash(seg.text, seg.voice);
        const cached = !FORCE && isCached(cacheRoot, hash);
        jobs.push({ saisonSlug, episodeSlug, segment: seg, hash, cached });
      }
    }
  }
  return jobs;
}

// -----------------------------------------------------------------------------
// Pool d'execution
// -----------------------------------------------------------------------------
async function runJobs(jobs: Job[]): Promise<{ ok: number; skipped: number; failed: number; bytes: number; ms: number }> {
  const cacheRoot = defaultCacheRoot();
  const manifest = loadManifest(cacheRoot);
  const apiKey = process.env.MISTRAL_API_KEY!;

  const stats = { ok: 0, skipped: 0, failed: 0, bytes: 0, ms: 0 };
  const todo = jobs.filter(j => !j.cached);
  const skipped = jobs.length - todo.length;
  stats.skipped = skipped;

  // Pour les jobs deja caches, on s'assure quand meme qu'ils sont dans le manifest
  // (cas : on a regenere le cache mais perdu le manifest, ou marker bumpe).
  for (const j of jobs.filter(x => x.cached)) {
    const key = manifestKey(j.saisonSlug, j.episodeSlug, j.segment.id);
    if (!manifest.segments[key] || manifest.segments[key].hash !== j.hash) {
      const stat = statSync(join(cacheRoot.root, j.hash.slice(0, 2), `${j.hash}.mp3`));
      recordSegment(manifest, j.saisonSlug, j.episodeSlug, j.segment.id, {
        hash: j.hash,
        voice: j.segment.voice,
        bytes: stat.size,
        durationEstimateSec: estimateDurationSec(j.segment.text),
        generatedAt: stat.mtime.toISOString(),
        format: "mp3",
      });
    }
  }

  if (DRY_RUN) {
    console.log(c.yellow(`\n[DRY RUN] ${todo.length} segment(s) seraient generes, ${skipped} deja cache(s).\n`));
    for (const j of todo.slice(0, 30)) {
      console.log(`  ${c.dim("would gen")}  ${j.saisonSlug}/${j.episodeSlug}/${j.segment.id.padEnd(22)} voice=${j.segment.voice.padEnd(20)} (${countWords(j.segment.text)} mots)`);
    }
    if (todo.length > 30) console.log(c.dim(`  ... et ${todo.length - 30} autres`));
    saveManifest(cacheRoot, { ...manifest, generatedAt: new Date().toISOString() });
    return stats;
  }

  if (todo.length === 0) {
    console.log(c.green("\n✓ Cache deja complet, rien a generer.\n"));
    saveManifest(cacheRoot, { ...manifest, generatedAt: new Date().toISOString() });
    return stats;
  }

  console.log(c.bold(`\n→ ${todo.length} segment(s) a generer (concurrency=${CONCURRENCY}, ${skipped} deja cache).\n`));

  // Pool simple : N workers consomment une queue partagee.
  const queue = [...todo];
  let processed = 0;
  const total = todo.length;
  const t0 = Date.now();

  async function worker(workerId: number) {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      const tag = `${job.saisonSlug}/${job.episodeSlug}/${job.segment.id}`;
      try {
        const r = await generateSpeechChunked({
          text: job.segment.text,
          voice: job.segment.voice,
          apiKey,
          format: "mp3",
        });
        writeCachedMP3(cacheRoot, job.hash, r.buffer);
        recordSegment(manifest, job.saisonSlug, job.episodeSlug, job.segment.id, {
          hash: job.hash,
          voice: job.segment.voice,
          bytes: r.buffer.length,
          durationEstimateSec: estimateDurationSec(job.segment.text),
          generatedAt: new Date().toISOString(),
          format: "mp3",
        });
        stats.ok++;
        stats.bytes += r.buffer.length;
        stats.ms += r.latencyMs;
        processed++;
        const pct = ((processed / total) * 100).toFixed(1);
        console.log(`  ${c.green("✓")} [${pct.padStart(5)}%] ${tag.padEnd(56)} ${(r.buffer.length / 1024).toFixed(0)} Ko en ${r.latencyMs} ms ${c.dim("(w" + workerId + ")")}`);
      } catch (e) {
        stats.failed++;
        processed++;
        const msg = e instanceof MistralTTSError ? `HTTP ${e.status}` : (e as Error).message;
        console.error(`  ${c.red("✗")} ${tag.padEnd(56)} ${c.red(msg)}`);
        if (VERBOSE) console.error(e);
        // Sauve le manifest periodiquement pour pas perdre le progres en cas de crash
        if (processed % 10 === 0) saveManifest(cacheRoot, { ...manifest, generatedAt: new Date().toISOString() });
      }
    }
  }

  // Sauvegarde defensive du manifest tous les N segments
  const saveInterval = setInterval(() => {
    saveManifest(cacheRoot, { ...manifest, generatedAt: new Date().toISOString() });
  }, 30_000);

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  clearInterval(saveInterval);

  saveManifest(cacheRoot, { ...manifest, generatedAt: new Date().toISOString() });
  return { ...stats, ms: Date.now() - t0 };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  loadDotEnvLocal();

  // Le batch est specifique a Voxtral : Piper se contente du runtime sans
  // batch (CPU local rapide, cache rempli au fil des clics utilisateur).
  // Si l'env declare TTS_PROVIDER=piper explicitement, on refuse net.
  const declaredProvider = (process.env.TTS_PROVIDER || "").toLowerCase();
  if (declaredProvider === "piper") {
    console.error(c.red(`\n❌ Le batch tts:build est reserve au mode Voxtral.`));
    console.error(`   En mode Piper, le runtime synthetise lui-meme au fil des requetes.`);
    console.error(`   Si tu veux pre-generer en Voxtral : exporte TTS_PROVIDER=voxtral + MISTRAL_API_KEY.\n`);
    process.exit(1);
  }

  if (!DRY_RUN && !process.env.MISTRAL_API_KEY) {
    console.error(c.red(`\n❌ MISTRAL_API_KEY manquant.`));
    console.error(`   Le batch tts:build genere via Mistral Voxtral.`);
    console.error(`   Definis-le dans .env.local ou exporte-le :`);
    console.error(`     echo 'MISTRAL_API_KEY=...' >> .env.local && chmod 600 .env.local\n`);
    console.error(`   Pour les self-hosters OSS qui prefenent Piper local :`);
    console.error(`     docker compose --profile piper up -d`);
    console.error(`     export TTS_PROVIDER=piper TTS_SERVER_URL=http://tts:5500`);
    console.error(`   (pas besoin de batch -- Piper synthetise au runtime)\n`);
    process.exit(1);
  }

  console.log(c.bold(`\n🎙️  Humanix TTS cache build`));
  console.log(c.dim(`    model=${TTS_MODEL}  cache=${defaultCacheRoot().root}`));
  if (DRY_RUN) console.log(c.yellow(`    --dry-run actif`));
  if (FORCE) console.log(c.yellow(`    --force actif (regeneration totale)`));
  if (SAISON_FILTER) console.log(c.dim(`    saison=${SAISON_FILTER}`));

  const jobs = buildJobList();
  console.log(c.dim(`    ${jobs.length} segments planifies sur ${new Set(jobs.map(j => `${j.saisonSlug}/${j.episodeSlug}`)).size} episodes\n`));

  const stats = await runJobs(jobs);

  // Resume final
  console.log(c.bold(`\n📊 Resume :`));
  console.log(`   ${c.green(`${stats.ok} OK`)}  ${c.yellow(`${stats.skipped} skipped`)}  ${stats.failed > 0 ? c.red(`${stats.failed} failed`) : c.dim("0 failed")}`);
  if (stats.bytes > 0) {
    console.log(`   ${(stats.bytes / 1024 / 1024).toFixed(1)} Mo audio genere, ${(stats.ms / 1000).toFixed(0)} sec total temps API`);
    if (stats.ok > 0) {
      console.log(`   moyenne : ${(stats.ms / stats.ok).toFixed(0)} ms / segment`);
    }
  }
  if (stats.failed > 0) {
    console.log(c.yellow(`\n⚠️  Certains segments ont echoue. Re-run la commande pour retry (idempotent).`));
    process.exit(3);
  }
  console.log(c.green(`\n✓ Cache TTS pret.\n`));
}

main().catch((e) => {
  console.error(c.red(`\n❌ ${(e as Error).message}`));
  if (process.env.DEBUG) console.error(e);
  process.exit(1);
});
