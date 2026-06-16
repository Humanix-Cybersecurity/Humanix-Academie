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
  orange: {
    grad: "from-orange-400 to-amber-400",
    soft: "bg-orange-50 dark:bg-orange-950/30",
    ring: "border-orange-200 dark:border-orange-800",
    text: "text-orange-700 dark:text-orange-300",
    btn: "bg-orange-500 hover:bg-orange-600",
    dot: "bg-orange-500",
  },
  lime: {
    grad: "from-lime-400 to-green-400",
    soft: "bg-lime-50 dark:bg-lime-950/30",
    ring: "border-lime-200 dark:border-lime-800",
    text: "text-lime-700 dark:text-lime-300",
    btn: "bg-lime-600 hover:bg-lime-700",
    dot: "bg-lime-500",
  },
  teal: {
    grad: "from-teal-400 to-emerald-400",
    soft: "bg-teal-50 dark:bg-teal-950/30",
    ring: "border-teal-200 dark:border-teal-800",
    text: "text-teal-700 dark:text-teal-300",
    btn: "bg-teal-500 hover:bg-teal-600",
    dot: "bg-teal-500",
  },
  indigo: {
    grad: "from-indigo-400 to-violet-400",
    soft: "bg-indigo-50 dark:bg-indigo-950/30",
    ring: "border-indigo-200 dark:border-indigo-800",
    text: "text-indigo-700 dark:text-indigo-300",
    btn: "bg-indigo-500 hover:bg-indigo-600",
    dot: "bg-indigo-500",
  },
  fuchsia: {
    grad: "from-fuchsia-400 to-pink-400",
    soft: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    ring: "border-fuchsia-200 dark:border-fuchsia-800",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    btn: "bg-fuchsia-500 hover:bg-fuchsia-600",
    dot: "bg-fuchsia-500",
  },
  blue: {
    grad: "from-blue-400 to-indigo-400",
    soft: "bg-blue-50 dark:bg-blue-950/30",
    ring: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    btn: "bg-blue-500 hover:bg-blue-600",
    dot: "bg-blue-500",
  },
};
