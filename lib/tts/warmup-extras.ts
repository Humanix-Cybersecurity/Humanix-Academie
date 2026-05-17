// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Collecte les segments TTS A WARMUP en plus des episodes (qui sont gerés
// par lib/tts/segments.ts).
//
// On warmup ici tout ce qui est expose via <TTSButton> ou <AudioPreviewButton>
// sur le site public. Source de verite des seeds (LIBRARY_ARTICLES, etc.)
// → on fait sortir un texte (post-sanitize) que `scripts/tts-cache-build.ts`
// hash et persiste.
//
// Ajouter ici tout nouveau lieu d'usage TTS du site pour eviter les latences
// "premier clic".

// @ts-ignore — `../library-seed` est un symlink vers le submodule prive
// content-pro/ qui peut etre absent en build OSS pur (CI public, fork
// sans contrat commercial). TypeScript se plaint a la resolution
// statique, mais au runtime le fichier est present sur les instances
// commerciales et le script de warmup est gracieusement skip ailleurs.
import { LIBRARY_ARTICLES } from "../library-seed";
import { markdownToPlainText } from "../markdown";
import { sanitizeForTTS } from "./sanitize";
import type { AudioSegment, FrenchVoiceSlug } from "./types";

/**
 * Segments des articles de la librairie :
 *   - "library/<slug>/full" : body complet (TTSButton sur /librairie/<slug>)
 *   - "library/<slug>/teaser" : titre + description (AudioPreviewButton)
 *
 * Voix : fr_marie_neutral partout pour matcher le defaut TTSButton /
 * AudioPreviewButton (cf. provider voxtral DEFAULT_VOICE).
 */
export function extractLibrarySegments(): AudioSegment[] {
  const out: AudioSegment[] = [];
  const voice: FrenchVoiceSlug = "fr_marie_neutral";

  for (const article of LIBRARY_ARTICLES) {
    // 1. Full body (TTSButton sur /librairie/<slug>) — meme transformation
    //    que la page detail : markdownToPlainText puis sanitize cote provider.
    const fullPlain = markdownToPlainText(article.body);
    const fullText = sanitizeForTTS(fullPlain);
    if (fullText) {
      out.push({
        id: `library/${article.slug}/full`,
        kind: "intro",
        text: fullText,
        voice,
      });
    }

    // 2. Teaser (AudioPreviewButton sur /famille pour audience='famille')
    //    Format identique au call site : `${title}. ${description}`.
    const teaserText = sanitizeForTTS(`${article.title}. ${article.description}`);
    if (teaserText) {
      out.push({
        id: `library/${article.slug}/teaser`,
        kind: "intro",
        text: teaserText,
        voice,
      });
    }
  }

  return out;
}

/**
 * Compose la liste complète des segments hors-episodes.
 * Ajouter ici toute future source (anecdotes, audit-flash, marketplace...).
 */
export function extractAllExtraSegments(): AudioSegment[] {
  return [...extractLibrarySegments()];
}
