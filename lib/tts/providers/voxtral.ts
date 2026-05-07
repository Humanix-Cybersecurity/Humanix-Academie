// SPDX-License-Identifier: AGPL-3.0-or-later
// Provider TTS Voxtral (Mistral SaaS API).
// Use case : palier Pro+, qualite quasi humaine, batch de pre-rendu rentable.

import {
  defaultCacheRoot,
  isCached,
  readCachedMP3,
  segmentHash,
  writeCachedMP3,
} from "../cache";
import { generateSpeechChunked, MistralTTSError, TTS_MODEL } from "../mistral";
import { sanitizeForTTS } from "../sanitize";
import type { FrenchVoiceSlug } from "../types";

const REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_VOICE: FrenchVoiceSlug = "fr_marie_neutral";

const VALID_VOICES: ReadonlySet<FrenchVoiceSlug> = new Set<FrenchVoiceSlug>([
  "fr_marie_neutral",
  "fr_marie_curious",
  "fr_marie_happy",
  "fr_marie_sad",
  "fr_marie_excited",
  "fr_marie_angry",
]);

/** Mapping legacy voice names (Piper) -> Voxtral. */
const LEGACY_VOICE_MAP: Record<string, FrenchVoiceSlug> = {
  "fr_FR-siwis-medium": "fr_marie_neutral",
  "fr_FR-siwis": "fr_marie_neutral",
  "fr_marie": "fr_marie_neutral",
};

function resolveVoice(voice: string | undefined): FrenchVoiceSlug {
  if (!voice) return DEFAULT_VOICE;
  if (VALID_VOICES.has(voice as FrenchVoiceSlug)) return voice as FrenchVoiceSlug;
  return LEGACY_VOICE_MAP[voice] ?? DEFAULT_VOICE;
}

export function isVoxtralEnabled(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY);
}

export async function synthesizeVoxtral(args: {
  text: string;
  voice?: string;
  format?: "mp3" | "wav";
}): Promise<{ buffer: Buffer; format: string; cached: boolean }> {
  if (!isVoxtralEnabled()) throw new Error("voxtral_disabled");

  // Sanitize avant hash : meme texte source -> meme hash (batch et runtime).
  const text = sanitizeForTTS(args.text.trim());
  if (text.length === 0) throw new Error("empty_text");
  if (text.length > 5000) throw new Error("text_too_long");

  const format = "mp3"; // Voxtral est natif MP3
  const voice = resolveVoice(args.voice);

  const cacheRoot = defaultCacheRoot();
  const hash = segmentHash(text, voice, TTS_MODEL);

  // Cache hit
  if (isCached(cacheRoot, hash)) {
    const buf = readCachedMP3(cacheRoot, hash);
    if (buf) return { buffer: buf, format, cached: true };
  }

  // Cache miss : appel Voxtral
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const result = await generateSpeechChunked({
      text,
      voice,
      apiKey: process.env.MISTRAL_API_KEY!,
      format,
    });
    writeCachedMP3(cacheRoot, hash, result.buffer);
    return { buffer: result.buffer, format, cached: false };
  } catch (e) {
    if (e instanceof MistralTTSError) throw new Error(`voxtral_http_${e.status}`);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("tts_timeout");
    throw new Error(`voxtral_failed:${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export const VOXTRAL_VOICES = Array.from(VALID_VOICES);
