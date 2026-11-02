// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Bandeau pour les admins NATIFS d'un espace administre par son parent
// (gestion deleguee, Tenant.parentManaged) : ils doivent savoir qui d'autre
// peut agir chez eux. Le pendant du bandeau cross-tenant, qui s'adresse lui
// a l'administrateur du parent quand il agit dans l'espace enfant.
//
// Server component, sans interaction.

export default function GestionDelegueeBandeau({
  parentName,
}: {
  parentName: string;
}) {
  return (
    <div
      role="note"
      className="bg-sky-50 dark:bg-sky-900/30 border-b border-sky-200 dark:border-sky-800/60 px-4 sm:px-6 lg:px-8 py-2.5"
    >
      <div className="max-w-screen-2xl mx-auto flex items-center gap-2 text-sm">
        <span aria-hidden="true" className="text-base">
          🤝
        </span>
        <p className="text-sky-900 dark:text-sky-100">
          <strong className="font-bold">Gestion déléguée :</strong> cet espace
          est aussi administré par{" "}
          <span className="font-bold text-sky-950 dark:text-sky-50 bg-sky-200/60 dark:bg-sky-800/60 px-1.5 py-0.5 rounded">
            {parentName}
          </span>
          , qui peut gérer les personnes, les groupes et les modules. Chacune de
          ses actions est journalisée avec l&apos;identité de son auteur.
        </p>
      </div>
    </div>
  );
}
