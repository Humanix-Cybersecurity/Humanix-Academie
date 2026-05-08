// SPDX-License-Identifier: AGPL-3.0-or-later
// Client minimaliste pour Mistral Voxtral TTS.
//
// Endpoints utilises :
//   POST https://api.mistral.ai/v1/audio/speech
//
// Voir https://docs.mistral.ai/studio-api/audio/text_to_speech/speech
//
// Limites Voxtral :
//   - 300 mots max par requete (on chunk avant)
//   - Pas de markdown / emoji dans `input`
//
// La concatenation MP3 est faite par simple Buffer.concat : pour le meme
// modele et le meme bitrate, les frames MP3 successives s'enchainent sans
// reencodage. C'est ce que fait ffmpeg avec `concat:` sur des MP3 CBR.

import { FrenchVoiceSlug } from "./types";

const API_BASE = "https://api.mistral.ai/v1";

/**
 * Mots max par requete envoyee a Voxtral.
 * Le hard limit Mistral est 300 ; on garde une marge de securite.
 */
export const MAX_WORDS_PER_REQUEST = 280;

/**
 * Modele TTS courant. A bumper si Mistral release une nouvelle version
 * (ce qui invalidera tous les hashes du cache, donc une regeneration sera
 * declenchee au prochain `npm run tts:build`).
 */
export const TTS_MODEL = "voxtral-mini-tts-2603";

export type GenerateSpeechOpts = {
  text: string;
  voice: FrenchVoiceSlug;
  apiKey: string;
  format?: "mp3" | "wav" | "opus" | "flac" | "pcm";
  /**
   * Si true, attend la fin du stream SSE et concatene les chunks ;
   * si false (defaut), fait une requete classique JSON `{audio_data}`.
   */
  stream?: boolean;
};

export type GenerateSpeechResult = {
  buffer: Buffer;
  latencyMs: number;
  /** Pour les hash de cache : ce qui a ete reellement envoye (utile au debug). */
  inputUsed: string;
  voice: FrenchVoiceSlug;
  format: string;
};

/**
 * Decoupe un texte en chunks <= MAX_WORDS_PER_REQUEST en respectant les
 * frontieres de phrase. Si une "phrase" depasse la limite (rare en
 * francais didactique), on tombe en fallback word-split.
 */
export function chunkText(text: string, maxWords = MAX_WORDS_PER_REQUEST): string[] {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (countWords(cleaned) <= maxWords) return [cleaned];

  // Decoupage sur les fins de phrase. On garde la ponctuation finale.
  // Regex simple : split apres . ! ? suivis d'un espace + majuscule (heuristique FR).
  const sentences = cleaned.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [cleaned];

  const chunks: string[] = [];
  let current = "";
  let currentWords = 0;
  for (const s of sentences) {
    const sWords = countWords(s);
    if (sWords > maxWords) {
      // Phrase a rallonge : on flush le buffer, puis on split la phrase elle-meme.
      if (current) { chunks.push(current.trim()); current = ""; currentWords = 0; }
      chunks.push(...splitOversizedSentence(s, maxWords));
      continue;
    }
    if (currentWords + sWords > maxWords) {
      chunks.push(current.trim());
      current = s;
      currentWords = sWords;
    } else {
      current += s;
      currentWords += sWords;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function splitOversizedSentence(sentence: string, maxWords: number): string[] {
  const words = sentence.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    out.push(words.slice(i, i + maxWords).join(" "));
  }
  return out;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Genere de l'audio TTS pour un texte court (<= 300 mots).
 * Pour un texte long, utiliser `generateSpeechChunked` qui s'occupe du chunk + concat.
 *
 * Inclut un retry automatique sur 429 (rate limit) et 502/503/504 (transients)
 * avec backoff exponentiel : 1s, 2s, 4s, 8s. Apres 4 retries, lance l'erreur.
 */
export async function generateSpeech(opts: GenerateSpeechOpts): Promise<GenerateSpeechResult> {
  const format = opts.format ?? "mp3";
  const t0 = Date.now();
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${API_BASE}/audio/speech`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: opts.text,
        voice_id: opts.voice, // les preset slugs sont accepts comme voice_id
        response_format: format,
        stream: opts.stream ?? false,
      }),
    });

    if (res.ok) {
      return await parseSpeechResponse(res, opts, t0, format);
    }

    // Retry sur 429 / 502 / 503 / 504. Backoff exponentiel.
    if ([429, 502, 503, 504].includes(res.status) && attempt < maxAttempts) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * Math.pow(2, attempt - 1);
      // Petit jitter pour eviter le thundering herd
      const jitter = Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, backoffMs + jitter));
      continue;
    }

    // Erreur non-retryable
    const errText = await res.text();
    throw new MistralTTSError(res.status, errText);
  }

  // Tous les retries epuises -- on ne devrait pas arriver ici (le dernier attempt
  // throw deja), mais TS exige un return.
  throw new MistralTTSError(0, "exhausted retries");
}

async function parseSpeechResponse(
  res: Response,
  opts: GenerateSpeechOpts,
  t0: number,
  format: string,
): Promise<GenerateSpeechResult> {

  let buffer: Buffer;
  if (opts.stream) {
    buffer = await consumeSSEStream(res);
  } else {
    const json = await res.json() as { audio_data?: string };
    if (!json.audio_data) {
      throw new MistralTTSError(200, `Reponse sans audio_data : ${JSON.stringify(json).slice(0, 200)}`);
    }
    buffer = Buffer.from(json.audio_data, "base64");
  }

  return {
    buffer,
    latencyMs: Date.now() - t0,
    inputUsed: opts.text,
    voice: opts.voice,
    format,
  };
}

async function consumeSSEStream(res: Response): Promise<Buffer> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let leftover = "";
  const chunks: Buffer[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    leftover += decoder.decode(value, { stream: true });
    const lines = leftover.split("\n");
    leftover = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as { audio_data?: string; delta?: string; data?: string };
        const b64 = evt.audio_data || evt.delta || evt.data;
        if (b64) chunks.push(Buffer.from(b64, "base64"));
      } catch {
        // SSE noise (commentaires, heartbeats) : ignorer
      }
    }
  }
  return Buffer.concat(chunks);
}

/**
 * Genere l'audio pour un texte de longueur quelconque : chunk si necessaire
 * et concatene les MP3 produits. Retourne un seul Buffer playable.
 */
export async function generateSpeechChunked(
  opts: GenerateSpeechOpts,
): Promise<GenerateSpeechResult> {
  const chunks = chunkText(opts.text);
  if (chunks.length === 1) return generateSpeech(opts);

  const t0 = Date.now();
  const buffers: Buffer[] = [];
  // Sequentiel : pour le batch global on parallelise au niveau segment, pas au niveau chunk.
  // CRITIQUE : on strip le tag ID3v2 des chunks 2+ pour eviter d'avoir des
  // tags au milieu du flux MP3 (ce qui provoque des lectures muettes dans
  // certains decoders navigateur). Voir stripID3v2Header() ci-dessous.
  for (let i = 0; i < chunks.length; i++) {
    const r = await generateSpeech({ ...opts, text: chunks[i] });
    buffers.push(i === 0 ? r.buffer : stripID3v2Header(r.buffer));
  }
  return {
    buffer: Buffer.concat(buffers),
    latencyMs: Date.now() - t0,
    inputUsed: opts.text,
    voice: opts.voice,
    format: opts.format ?? "mp3",
  };
}

/**
 * Si le buffer commence par un tag ID3v2, retourne le buffer SANS ce tag
 * (= juste les frames MP3). Sinon retourne le buffer tel quel.
 *
 * Format ID3v2 (RFC) :
 *   bytes 0..2  : "ID3" (0x49 0x44 0x33)
 *   byte  3     : version major
 *   byte  4     : version revision
 *   byte  5     : flags
 *   bytes 6..9  : size en "synchsafe integer" (4 bytes de 7 bits utiles, MSB=0)
 *
 * La taille exclut les 10 bytes d'en-tete -- on saute donc 10 + size.
 *
 * Pourquoi : Voxtral retourne un MP3 COMPLET par appel (avec son ID3v2 en
 * tete). Concatener naivement N reponses produit un fichier avec des tags
 * ID3 au milieu -- certains decoders browser le rejettent silencieusement
 * (200 OK cote reseau mais audio muet). En strippant l'ID3 des chunks 2+,
 * on obtient un MP3 unique avec un seul header, accepte par tous les
 * players (Chrome, Safari, Firefox, ffmpeg, vlc, afplay).
 */
export function stripID3v2Header(buf: Buffer): Buffer {
  if (buf.length < 10) return buf;
  if (buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return buf; // pas "ID3"
  // synchsafe : chaque byte = 7 bits, MSB ignore
  const size =
    ((buf[6] & 0x7f) << 21) |
    ((buf[7] & 0x7f) << 14) |
    ((buf[8] & 0x7f) << 7) |
    (buf[9] & 0x7f);
  return buf.subarray(10 + size);
}

export class MistralTTSError extends Error {
  constructor(public status: number, public body: string) {
    super(`Mistral TTS HTTP ${status} : ${body.slice(0, 300)}`);
    this.name = "MistralTTSError";
  }
}
