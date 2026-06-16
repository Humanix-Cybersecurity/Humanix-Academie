// SPDX-License-Identifier: AGPL-3.0-or-later
// Palettes des mondes enfants. Classes Tailwind en littéral (scannées au build).
import type { Monde } from "@/lib/enfants/types";

type Couleur = Monde["couleur"];

export const COULEURS: Record<
  Couleur,
  { grad: string; soft: string; ring: string; text: string; btn: string; dot: string }
> = {
  sky: {
    grad: "from-sky-400 to-cyan-400",
    soft: "bg-sky-50 dark:bg-sky-950/30",
    ring: "border-sky-200 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-300",
    btn: "bg-sky-500 hover:bg-sky-600",
    dot: "bg-sky-500",
  },
  emerald: {
    grad: "from-emerald-400 to-teal-400",
    soft: "bg-emerald-50 dark:bg-emerald-950/30",
    ring: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    btn: "bg-emerald-500 hover:bg-emerald-600",
    dot: "bg-emerald-500",
  },
  violet: {
    grad: "from-violet-400 to-fuchsia-400",
    soft: "bg-violet-50 dark:bg-violet-950/30",
    ring: "border-violet-200 dark:border-violet-800",
    text: "text-violet-700 dark:text-violet-300",
    btn: "bg-violet-500 hover:bg-violet-600",
    dot: "bg-violet-500",
  },
  amber: {
    grad: "from-amber-400 to-orange-400",
    soft: "bg-amber-50 dark:bg-amber-950/30",
    ring: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    btn: "bg-amber-500 hover:bg-amber-600",
    dot: "bg-amber-500",
  },
  rose: {
    grad: "from-rose-400 to-pink-400",
    soft: "bg-rose-50 dark:bg-rose-950/30",
    ring: "border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-300",
    btn: "bg-rose-500 hover:bg-rose-600",
    dot: "bg-rose-500",
  },
  cyan: {
    grad: "from-cyan-400 to-blue-400",
    soft: "bg-cyan-50 dark:bg-cyan-950/30",
    ring: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-700 dark:text-cyan-300",
    btn: "bg-cyan-500 hover:bg-cyan-600",
    dot: "bg-cyan-500",
  },
};
