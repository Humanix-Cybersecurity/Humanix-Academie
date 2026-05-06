// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// AdminSection - Wrapper standard pour une section de page admin.
//
// Style : card avec border 0.5px subtile, fond blanc/slate, padding cohérent.
// Cohérent avec les sections du dashboard refondu.
//
// Usage :
//   <AdminSection
//     title="Activité de la semaine"
//     description="Évolution des complétions"
//     action={<button>Exporter</button>}
//   >
//     <chart />
//   </AdminSection>
// =============================================================================

import type { ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  /** Composant à droite du header de section (bouton, lien, badge) */
  action?: ReactNode;
  children: ReactNode;
  /** Style optionnel : "default" | "muted" (gris) | "highlight" (accent) */
  variant?: "default" | "muted" | "highlight";
  className?: string;
};

const VARIANT_STYLES = {
  default: "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800",
  muted:
    "bg-gray-50/60 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800",
  highlight:
    "bg-white dark:bg-slate-900 border-accent-500/40 ring-1 ring-accent-500/10",
};

export default function AdminSection({
  title,
  description,
  action,
  children,
  variant = "default",
  className = "",
}: Props) {
  return (
    <section
      className={`rounded-xl border ${VARIANT_STYLES[variant]} p-4 sm:p-5 min-w-0 ${className}`}
    >
      {(title || description || action) && (
        <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            {title && (
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
