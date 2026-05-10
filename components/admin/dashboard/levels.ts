// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers de niveau (couleur + label) partages entre widgets.

export type Level = "excellent" | "ok" | "warning" | "danger";

export function levelFromScore(score: number): Level {
  if (score >= 80) return "excellent";
  if (score >= 60) return "ok";
  if (score >= 40) return "warning";
  return "danger";
}

export const LEVEL_META: Record<
  Level,
  {
    label: string;
    text: string;
    bg: string;
    bar: string;
    hex: string;
  }
> = {
  excellent: {
    label: "Excellent",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    bar: "bg-emerald-500",
    hex: "#10b981",
  },
  ok: {
    label: "Correct",
    text: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    bar: "bg-teal-500",
    hex: "#14b8a6",
  },
  warning: {
    label: "À surveiller",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    bar: "bg-amber-500",
    hex: "#f59e0b",
  },
  danger: {
    label: "Critique",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    bar: "bg-rose-500",
    hex: "#f43f5e",
  },
};
