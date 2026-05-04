// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// StatusBadge — Badge sémantique compact (succès / info / warning / danger).
//
// Cohérent avec le système de couleurs du dashboard refondu (LEVEL_META).
// Usage typique : afficher l'état d'une campagne, d'un module, d'un audit.
//
// Usage :
//   <StatusBadge level="success">Compliant</StatusBadge>
//   <StatusBadge level="warning" icon="⚠️">À surveiller</StatusBadge>
//   <StatusBadge level="danger" pill>Critique</StatusBadge>
// =============================================================================

import type { ReactNode } from "react";

type Level = "neutral" | "info" | "success" | "warning" | "danger";

type Props = {
  level?: Level;
  children: ReactNode;
  icon?: string;
  /** Pill (rounded-full) au lieu de rounded-md */
  pill?: boolean;
  /** Taille du badge */
  size?: "sm" | "md";
};

const LEVEL_STYLES: Record<Level, string> = {
  neutral: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const SIZE_STYLES = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
};

export default function StatusBadge({
  level = "neutral",
  children,
  icon,
  pill,
  size = "sm",
}: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wide ${SIZE_STYLES[size]} ${LEVEL_STYLES[level]} ${pill ? "rounded-full" : "rounded-md"}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
