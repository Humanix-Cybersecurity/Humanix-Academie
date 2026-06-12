// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Types partages entre la librairie commerciale (content-pro/lib/library-seed.ts)
// et la librairie demo (lib/library-seed-demo.ts).
//
// Ce fichier vit dans le repo public OSS - les forks AGPLv3 peuvent
// implementer leur propre catalogue d'articles en respectant ce contrat.

export type LibraryArticleSeed = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  audience: "pro" | "tous" | "famille";
  readTimeMinutes: number;
  authorName: string;
  /** Markdown plain (paragraphes + puces + liens). Pas de HTML brut. */
  body: string;
};
