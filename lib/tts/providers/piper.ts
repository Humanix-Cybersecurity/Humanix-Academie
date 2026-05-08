// SPDX-License-Identifier: AGPL-3.0-or-later
// Provider TTS Piper (self-hosted via container `humanix-tts`).
// Use case : self-hosters OSS qui ne veulent pas dependre de Mistral / SaaS.
// Voix par defaut : `fr_FR-siwis-medium` (femme FR, qualite acceptable).
//
// Cache mutualise avec Voxtral (meme arborescence data/tts-cache/<2>/<hash>.mp3)
// mais les hashes different par le parametre `model="piper-<voice>"`.

import {
  defaultCacheRoot,
  isCached,
  readCachedMP3,
  segmentHash,
  writeCachedMP3,
} from "../cache";
import { sanitizeForTTS } from "../sanitize";

const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_VOICE = "fr_FR-siwis-medium";

export function isPiperEnabled(): boolean {
  return Boolean(process.env.TTS_SERVER_URL);
}

export async function synthesizePiper(args: {
  text: string;
  voice?: string;
  format?: "mp3" | "wav";
}): Promise<{ buffer: Buffer; format: string; cached: boolean }> {
  if (!isPiperEnabled()) throw new Error("piper_disabled");

  // Sanitize avant hash : aligne avec Voxtral pour cohesion conceptuelle
  // (meme si Piper en a un peu moins besoin -- son moteur tolere le markdown brut).
  const text = sanitizeForTTS(args.text.trim());
  if (text.length === 0) throw new Error("empty_text");
  if (text.length > 5000) throw new Error("text_too_long");

  const format = args.format ?? "mp3";
  const voice = args.voice ?? DEFAULT_VOICE;

  const cacheRoot = defaultCacheRoot();
  // Modele = "piper-<voice>" pour disjoindre les hashes Piper/Voxtral
  const hash = segmentHash(text, voice, `piper-${voice}`);

  if (isCached(cacheRoot, hash)) {
    const buf = readCachedMP3(cacheRoot, hash);
    if (buf) return { buffer: buf, format, cached: true };
  }

  const ttsUrl = process.env.TTS_SERVER_URL!;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${ttsUrl}/synthesize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voice, format }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`piper_http_${res.status}`);

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    writeCachedMP3(cacheRoot, hash, buffer);
    return { buffer, format, cached: false };
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw new Error("tts_timeout");
    throw new Error(`piper_failed:${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function checkPiperHealth(): Promise<{ ok: boolean; voices?: string[]; error?: string }> {
  if (!isPiperEnabled()) return { ok: false, error: "piper_disabled" };
  try {
    const res = await fetch(`${process.env.TTS_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) return { ok: false, error: `http_${res.status}` };
    const data = (await res.json()) as { voices_count?: number };
    return { ok: true, voices: [`${data.voices_count} voix dispo`] };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "unknown" };
  }
}
