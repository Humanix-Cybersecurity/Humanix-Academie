// SPDX-License-Identifier: AGPL-3.0-or-later
// Dispatcher TTS premium. Selon `TTS_PROVIDER` :
//
//   TTS_PROVIDER=voxtral   Mistral Voxtral SaaS (~$0.0001/mot, voix Marie expressive)
//                          Necessite MISTRAL_API_KEY. Cache pre-rendu via `npm run tts:build`.
//   TTS_PROVIDER=piper     Piper self-hosted via container `humanix-tts`
//                          Necessite TTS_SERVER_URL. Cache mutualise mais regen legere
//                          (CPU local ~300 ms par phrase, batch optionnel).
//   TTS_PROVIDER=          (vide) Pas de TTS premium. TTSButton bascule sur Web Speech API.
//
// HISTORIQUE :
//   v1 (avr 2026)  Piper-only via TTS_SERVER_URL.
//   v2 (mai 2026)  Bascule Voxtral, Piper conserve en option self-host
//                  (plebiscite par les forks AGPL). TTS_PROVIDER ajoute.
//                  Variable TTS_SERVER_URL toujours valide en mode piper.
//
// SECURITE : aucune donnee user n'est envoyee au-dela du texte. Pas de log
// du contenu (RGPD : le texte peut contenir des donnees du tenant).

import { manifestKey, pathForHash, segmentHash } from "./cache";
import {
  isPiperEnabled,
  synthesizePiper,
  checkPiperHealth,
} from "./providers/piper";
import {
  isVoxtralEnabled,
  synthesizeVoxtral,
  VOXTRAL_VOICES,
} from "./providers/voxtral";

type Provider = "voxtral" | "piper" | "";

function detectProvider(): Provider {
  const explicit = (process.env.TTS_PROVIDER || "").toLowerCase().trim();
  if (explicit === "voxtral" || explicit === "piper") return explicit;

  // Compat retro : si TTS_PROVIDER vide mais qu'on a une cle Mistral OU
  // qu'un TTS_SERVER_URL est configure, on infere. Voxtral prioritaire.
  if (process.env.MISTRAL_API_KEY) return "voxtral";
  if (process.env.TTS_SERVER_URL) return "piper";
  return "";
}

export function isTtsServerEnabled(): boolean {
  const p = detectProvider();
  if (p === "voxtral") return isVoxtralEnabled();
  if (p === "piper") return isPiperEnabled();
  return false;
}

/**
 * Synthese TTS avec cache disque content-addressed.
 * Dispatch automatique selon `TTS_PROVIDER` (voxtral | piper).
 */
export async function synthesizeText(args: {
  text: string;
  voice?: string;
  format?: "mp3" | "wav";
}): Promise<{ buffer: Buffer; format: string; cached: boolean }> {
  const provider = detectProvider();
  if (provider === "voxtral") return synthesizeVoxtral(args);
  if (provider === "piper") return synthesizePiper(args);
  throw new Error("tts_disabled");
}

/**
 * Healthcheck. Pour Voxtral on ne tape pas l'API a chaque check (couterait des
 * appels) ; pour Piper on sonde le container interne.
 */
export async function checkTtsHealth(): Promise<{
  ok: boolean;
  provider?: Provider;
  voices?: string[];
  error?: string;
}> {
  const provider = detectProvider();
  if (provider === "voxtral") {
    if (!isVoxtralEnabled())
      return { ok: false, provider, error: "voxtral_disabled" };
    return { ok: true, provider, voices: VOXTRAL_VOICES };
  }
  if (provider === "piper") {
    const h = await checkPiperHealth();
    return { ok: h.ok, provider, voices: h.voices, error: h.error };
  }
  return { ok: false, provider: "", error: "tts_disabled" };
}

/**
 * Renvoie le provider courant (utile au /api/tts/status).
 */
export function getProvider(): Provider {
  return detectProvider();
}

// Helpers expose pour les tests et pour le route handler `[hash]`.
export { segmentHash, pathForHash, manifestKey };
