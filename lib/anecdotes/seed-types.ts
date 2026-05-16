// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Types partages entre le catalogue commercial (content-pro/lib/anecdotes/seed-data.ts)
// et le catalogue demo (lib/anecdotes/seed-data-demo.ts).
//
// Ce fichier vit dans le repo public OSS — les forks AGPLv3 peuvent
// implementer leur propre catalogue d'anecdotes en respectant ce contrat.

import type { AnecdoteCategory } from "@prisma/client";

export type SeedAnecdote = {
  slug: string;
  title: string;
  summary: string;
  lesson: string;
  miniAction: string;
  sourceUrl: string;
  sourceLabel: string;
  category: AnecdoteCategory;
  /** Format ISO YYYY-MM-DD */
  incidentDate: string;
};
