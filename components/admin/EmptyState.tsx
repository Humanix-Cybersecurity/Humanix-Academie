// =============================================================================
// EmptyState — État vide standard (liste sans résultat, aucune donnée, etc.).
//
// Cohérent avec le pattern Linear : icône moyennement gros + titre clair +
// description orientée action + CTA optionnel.
//
// Usage :
//   <EmptyState
//     icon="📭"
//     title="Aucune campagne phishing"
//     description="Créez votre première campagne pour mesurer la vigilance."
//     cta={<a href="/admin/phishing/generer">Lancer une campagne</a>}
//   />
// =============================================================================

import type { ReactNode } from "react";

type Props = {
  icon?: string;
  title: string;
  description?: string;
  cta?: ReactNode;
  /** Compact : padding réduit, icône plus petite (pour les sections embedded) */
  compact?: boolean;
};

export default function EmptyState({
  icon,
  title,
  description,
  cta,
  compact,
}: Props) {
  return (
    <div
      className={`text-center ${compact ? "py-6" : "py-12"} px-4 flex flex-col items-center gap-${compact ? "2" : "3"}`}
      role="status"
    >
      {icon && (
        <div
          className={`${compact ? "text-3xl" : "text-5xl"} opacity-40`}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p
        className={`font-semibold text-gray-900 dark:text-gray-100 ${compact ? "text-sm" : "text-base"}`}
      >
        {title}
      </p>
      {description && (
        <p
          className={`text-gray-500 dark:text-gray-400 max-w-md mx-auto ${compact ? "text-xs" : "text-sm"} leading-relaxed`}
        >
          {description}
        </p>
      )}
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}
