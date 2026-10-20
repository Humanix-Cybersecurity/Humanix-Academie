// SPDX-License-Identifier: AGPL-3.0-or-later
// Un emoji saisi dans un formulaire, ramene a un seul caractere visible.
//
// POURQUOI CE FICHIER EXISTE (#968)
//
//   Les actions tronquaient l'emoji avec `.slice(0, 4)`, qui compte des
//   unites UTF-16, pas des caracteres visibles. Les emojis composes par
//   jonction (ZWJ) en font cinq ou plus : « technicien » 🧑‍🔧 = 🧑 + U+200D
//   + 🔧. Coupe a quatre unites, il se termine par une demi-paire de
//   substitution ; Prisma refuse alors la requete (« unexpected end of hex
//   escape ») et la page affiche l'erreur React 441 sans explication.
//
//   On garde donc le PREMIER GRAPHEME, c'est-a-dire un caractere tel que
//   l'oeil le voit, drapeaux, teints de peau et sequences ZWJ compris, et on
//   plafonne sa longueur par securite.

const LONGUEUR_MAX_UNITES = 16;

const segmenteur = new Intl.Segmenter("fr", { granularity: "grapheme" });

/**
 * Renvoie le premier caractere visible de `valeur`, ou `defaut` si la
 * saisie est vide, mal formee (demi-paire de substitution) ou absurdement
 * longue pour un emoji.
 */
export function premierGrapheme(valeur: unknown, defaut: string): string {
  if (typeof valeur !== "string") return defaut;
  const propre = valeur.trim();
  if (!propre || !propre.isWellFormed()) return defaut;
  const premier =
    segmenteur.segment(propre)[Symbol.iterator]().next().value?.segment ?? "";
  if (!premier || premier.length > LONGUEUR_MAX_UNITES) return defaut;
  return premier;
}
