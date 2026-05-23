// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Banner visible quand un user agit sur un tenant DIFFERENT de son home
// (via TenantMembership ou bypass SUPERADMIN).
//
// Defense en profondeur visuelle : evite qu'un SUPERADMIN modifie par
// erreur le mauvais tenant en pensant etre dans son home.
//
// Server component (pas de "use client") — rendu une seule fois au mount
// de la page, mis a jour automatiquement au changement de route via
// React Server Components.
//
// Ajoute 2026-05-23 (Sprint 2 multi-tenant membership).

export default function CrossTenantBanner({
  activeTenantName,
}: {
  activeTenantName: string;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800/60 px-4 sm:px-6 lg:px-8 py-2.5"
    >
      <div className="max-w-screen-2xl mx-auto flex items-center gap-2 text-sm">
        <span aria-hidden="true" className="text-base">
          ⚠️
        </span>
        <p className="text-amber-900 dark:text-amber-100">
          <strong className="font-bold">Mode cross-tenant :</strong> tu agis
          dans le tenant{" "}
          <span className="font-bold text-amber-950 dark:text-amber-50 bg-amber-200/60 dark:bg-amber-800/60 px-1.5 py-0.5 rounded">
            {activeTenantName}
          </span>
          , pas dans ton tenant home. Toutes tes actions sont auditees avec
          ton identite et leur impact sur ce tenant.
        </p>
      </div>
    </div>
  );
}
