// SPDX-License-Identifier: AGPL-3.0-or-later
// Types partages pour le pipeline TTS Humanix.

/**
 * Voix Voxtral disponibles pour le francais (preset Mistral, 2026-03).
 * Le slug est l'identifiant stable utilise dans les requetes API et dans le hash de cache.
 */
export type FrenchVoiceSlug =
  | "fr_marie_neutral"   // didactique, pose
  | "fr_marie_curious"   // intrigue, accroche
  | "fr_marie_happy"     // encourageant (bonne reponse)
  | "fr_marie_sad"       // didactique-attriste (mauvaise reponse, sans agressivite)
  | "fr_marie_excited"   // emphase, decouverte
  | "fr_marie_angry";    // alerte forte (reserver aux scenarios attaque)

/**
 * Type de segment audio dans un episode.
 * Permet d'associer une voix par defaut differente selon le contexte pedagogique.
 */
export type SegmentKind =
  | "intro"             // titre + scenario
  | "feedback_good"     // feedback d'une bonne reponse
  | "feedback_bad"      // feedback d'une mauvaise reponse
  | "feedback_neutral"  // feedback sans connotation
  | "debrief"           // takeaway de l'episode
  | "quiz_question"
  | "quiz_explanation";

/**
 * Un segment audio a generer pour un episode.
 * `id` est unique au sein d'un episode (utilise comme cle dans le manifest).
 */
export type AudioSegment = {
  id: string;             // ex: "intro", "feedback_a", "debrief", "quiz_0_explanation"
  kind: SegmentKind;
  voice: FrenchVoiceSlug;
  text: string;           // texte propre (pas de markdown, pas d'emoji)
};

/**
 * Entree dans le manifest pour un segment cache.
 */
export type ManifestEntry = {
  hash: string;             // sha256 du contenu (input + voice + model + version_marker)
  voice: FrenchVoiceSlug;
  bytes: number;
  durationEstimateSec: number;
  generatedAt: string;      // ISO 8601
  format: "mp3";
};

/**
 * Manifest persistant : on le commit (texte, ~30 Ko) pour que les serveurs
 * de demo et de prod sachent quels MP3 sont attendus avant d'avoir le cache.
 */
export type Manifest = {
  version: 1;
  model: string;            // ex: "voxtral-mini-tts-2603"
  generatedAt: string;
  /**
   * Cle = `${saisonSlug}/${episodeSlug}/${segmentId}`
   * Ex: "mots-de-passe/01-collection-postit/intro"
   */
  segments: Record<string, ManifestEntry>;
};
