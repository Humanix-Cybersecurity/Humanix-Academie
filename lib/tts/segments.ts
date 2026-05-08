// SPDX-License-Identifier: AGPL-3.0-or-later
// Extraction des segments audio a generer pour un episode.
//
// PRINCIPES :
//   1. Un episode = plusieurs "segments" audio independants (intro, feedback
//      par choix, debrief, quiz). On les genere et on les met en cache
//      separement pour permettre une lecture granulaire cote UI.
//   2. La voix par defaut est choisie selon le contexte pedagogique
//      (cf. mapping `defaultVoiceFor`).
//   3. Le texte est PROPRE en entree de Voxtral : pas de markdown, pas
//      d'emoji, pas de retour ligne aleatoire. La fonction `sanitizeForTTS`
//      s'en charge.

import type { EpisodeContent } from "../episodes";
import { sanitizeForTTS } from "./sanitize";
import { AudioSegment, FrenchVoiceSlug, SegmentKind } from "./types";

// Re-export pour compat retro avec d'eventuels imports de sanitizeForTTS
// depuis lib/tts/segments (avant l'extraction dans lib/tts/sanitize).
export { sanitizeForTTS };

/**
 * Voix par defaut selon le type de segment.
 *
 * NOTE : pour rester aligne avec le defaut serveur (`fr_marie_neutral` sans
 * override) ET pouvoir hit le cache batch depuis TTSButton qui n'envoie pas
 * de voice, on utilise `fr_marie_neutral` partout pour les segments
 * exposes via TTSButton (intro = scenario, debrief). Les segments riches
 * (feedback expressif, quiz curieux) gardent leur voix differenciee --
 * ils seront servis a terme via une UI dediee qui passera la voice
 * explicitement.
 */
export function defaultVoiceFor(kind: SegmentKind): FrenchVoiceSlug {
  switch (kind) {
    case "intro": return "fr_marie_neutral";
    case "feedback_good": return "fr_marie_happy";
    case "feedback_bad": return "fr_marie_sad";
    case "feedback_neutral": return "fr_marie_neutral";
    case "debrief": return "fr_marie_neutral";
    case "quiz_question": return "fr_marie_curious";
    case "quiz_explanation": return "fr_marie_neutral";
  }
}

/**
 * Extrait les segments audio attendus pour un episode.
 * Retourne un tableau ordonne (l'ordre n'est pas critique pour la generation,
 * mais il l'est pour le rendu UI -- l'intro doit etre le premier `id`).
 */
export function extractSegments(episode: EpisodeContent): AudioSegment[] {
  const out: AudioSegment[] = [];
  const meta = episode.meta;

  // 1. Intro : scenario uniquement (pas de titre prepended), pour matcher
  //    exactement ce que TTSButton envoie depuis EpisodePlayer
  //    (`<TTSButton text={props.scenario} />`). Le hash batch == hash runtime
  //    -> cache hit immediat des le premier click "Ecouter le scenario".
  const introText = sanitizeForTTS(meta.scenario || "");
  if (introText) {
    out.push({
      id: "intro",
      kind: "intro",
      voice: defaultVoiceFor("intro"),
      text: introText,
    });
  }

  // 2. Feedback par choix (id deduit du choice.id, ex "feedback_a")
  for (const choice of meta.choices || []) {
    const fbText = sanitizeForTTS(choice.feedback);
    if (!fbText) continue;
    const kind: SegmentKind =
      choice.outcome === "good" ? "feedback_good"
      : choice.outcome === "bad" ? "feedback_bad"
      : "feedback_neutral";
    out.push({
      id: `feedback_${choice.id}`,
      kind,
      voice: defaultVoiceFor(kind),
      text: fbText,
    });
  }

  // 3. Debrief
  const debriefText = sanitizeForTTS(meta.debrief || "");
  if (debriefText) {
    out.push({
      id: "debrief",
      kind: "debrief",
      voice: defaultVoiceFor("debrief"),
      text: debriefText,
    });
  }

  // 4. Quiz : pour chaque question, on genere question + explanation
  //    On NE genere PAS les choix du quiz (l'UI les affiche en texte ; les lire
  //    en audio rendrait l'exercice trivialement biaisable).
  for (let qIdx = 0; qIdx < (meta.quiz || []).length; qIdx++) {
    const q = meta.quiz![qIdx];
    const qText = sanitizeForTTS(q.question);
    if (qText) {
      out.push({
        id: `quiz_${qIdx}_question`,
        kind: "quiz_question",
        voice: defaultVoiceFor("quiz_question"),
        text: qText,
      });
    }
    const expText = sanitizeForTTS(q.explanation);
    if (expText) {
      out.push({
        id: `quiz_${qIdx}_explanation`,
        kind: "quiz_explanation",
        voice: defaultVoiceFor("quiz_explanation"),
        text: expText,
      });
    }
  }

  return out;
}
