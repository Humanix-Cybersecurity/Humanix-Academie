// =============================================================================
// AdminPageHeader — En-tête standard d'une page console (style Linear).
//
// Pattern de référence : titre h1 sobre + description courte + zone d'actions
// à droite. Cohérent avec le AdminTopBar (qui fournit déjà le breadcrumb).
//
// Usage :
//   <AdminPageHeader
//     title="Impact business"
//     description="Combien la cyber vous fait gagner — concret, en euros."
//     actions={
//       <a href="..." className="...">Action principale</a>
//     }
//   />
// =============================================================================

import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  /** Composant(s) à aligner à droite (boutons, toggles, badges) */
  actions?: ReactNode;
  /** Optionnel : un emoji devant le titre, gardé subtil */
  icon?: string;
};

export default function AdminPageHeader({
  title,
  description,
  actions,
  icon,
}: Props) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight flex items-center gap-2.5">
          {icon && (
            <span aria-hidden="true" className="text-2xl">
              {icon}
            </span>
          )}
          <span className="min-w-0">{title}</span>
        </h1>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
