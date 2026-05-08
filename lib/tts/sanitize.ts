// SPDX-License-Identifier: AGPL-3.0-or-later
// Sanitisation canonique du texte avant TTS Voxtral.
//
// IMPORTANCE : cette fonction DOIT etre idempotente et utilisee de facon
// IDENTIQUE entre :
//   - le batch de pre-rendu (`scripts/tts-cache-build.ts`)
//   - le serveur de synthese runtime (`lib/tts/server-client.ts`)
//   - le client (optionnel : evite un round-trip si le hash matche le manifest)
//
// Si les trois ne produisent pas la meme sortie pour une meme entree, les
// hashes divergent et le cache rate -- ce qui ne casse rien (Voxtral
// regenere) mais coute des appels API inutiles.

/**
 * Nettoie un texte pour Voxtral. Idempotent : f(f(x)) === f(x).
 *
 * Operations :
 *   - retire le markdown courant (headers, listes, gras, italique, code, liens)
 *   - retire les emojis et caracteres unicode hors plage parlable
 *   - normalise les whitespaces (multi-espaces, retours ligne -> 1 espace)
 *   - garde la ponctuation FR (. , ; : ! ? « » ' ()) pour le rythme prosodique
 */
export function sanitizeForTTS(input: string): string {
  if (!input) return "";
  let s = input;

  // Liens markdown : [texte](url) -> texte
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Bold/italic : **texte** ou _texte_ -> texte
  s = s.replace(/\*\*(.+?)\*\*/g, "$1");
  s = s.replace(/(^|\W)\*(.+?)\*(\W|$)/g, "$1$2$3");
  s = s.replace(/(^|\W)_(.+?)_(\W|$)/g, "$1$2$3");
  // Backticks de code inline : `x` -> x
  s = s.replace(/`([^`]+)`/g, "$1");
  // Titres markdown
  s = s.replace(/^#{1,6}\s+/gm, "");
  // Listes : - / * / 1. en debut de ligne
  s = s.replace(/^\s*[-*]\s+/gm, "");
  s = s.replace(/^\s*\d+\.\s+/gm, "");
  // Blockquotes
  s = s.replace(/^\s*>\s?/gm, "");
  // HTML simple (au cas ou)
  s = s.replace(/<[^>]+>/g, " ");

  // Emojis et symboles unicode parasites (plage etendue, agressive)
  // On garde lettres latines/accentuees + ponctuation francaise + chiffres + espaces.
  s = s.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}]/gu,
    "",
  );
  // Caracteres invisibles (zero-width, BOM, joiners)
  s = s.replace(/[​-‍⁠﻿]/g, "");

  // Retours ligne -> espace
  s = s.replace(/\s*\n\s*/g, " ");
  // Espaces multiples
  s = s.replace(/\s{2,}/g, " ");

  return s.trim();
}
