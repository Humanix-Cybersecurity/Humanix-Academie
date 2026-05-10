// SPDX-License-Identifier: AGPL-3.0-or-later
// Palette des saisons (6 ambiances douces cyclees par index) + citations
// chaleureuses affichees en bas du hub apprenant.

export const SAISON_PALETTES: Array<{
  bg: string; // gradient de fond de la card
  ring: string; // border de la card (subtle)
  badge: string; // bg pour le badge progression %
}> = [
  {
    bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40",
    ring: "border-cyan-200 dark:border-cyan-900/40",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  },
  {
    bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
    ring: "border-emerald-200 dark:border-emerald-900/40",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  {
    bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
    ring: "border-amber-200 dark:border-amber-900/40",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  {
    bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
    ring: "border-purple-200 dark:border-purple-900/40",
    badge:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  },
  {
    bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
    ring: "border-rose-200 dark:border-rose-900/40",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  },
  {
    bg: "from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40",
    ring: "border-indigo-200 dark:border-indigo-900/40",
    badge:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  },
];

export type SaisonPalette = (typeof SAISON_PALETTES)[number];

export const CITATIONS = [
  "La maitrise cyber, ce n'est pas un sommet - c'est un chemin. Cinq minutes par semaine suffisent.",
  "Tu n'as pas a être expert. Tu as juste a être averti une seconde avant le clic.",
  "Le meilleur reflexe cyber, c'est de prendre 30 secondes avant d'agir. Tu en es déjà capable.",
  "Apprendre la cyber, c'est apprendre a se faire confiance. Hex t'accompagne, pas le contraire.",
  "Chaque module fait baisser le risque pour toi, ton équipe, ta famille. Sans drame.",
];
