// SPDX-License-Identifier: AGPL-3.0-or-later
// Callout poster mensuel : telechargement PDF A3 du mois en cours.

export default function PosterCallout() {
  const month = new Date().getMonth() + 1;
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long" });
  return (
    <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span
          className="shrink-0 w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-2xl"
          aria-hidden="true"
        >
          🖼️
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-amber-800 dark:text-amber-200">
            Poster du mois pour votre open-space
          </h3>
          <p className="text-sm text-amber-800/80 dark:text-amber-200/80 mt-1 leading-relaxed">
            PDF A3 imprimable, personnalisé à votre nom et à votre service le
            plus à risque. Affichez-le dans la salle de pause - votre équipe
            l'attendra chaque mois.
          </p>
        </div>
        <a
          href={`/api/admin/poster-mensuel/${month}/download`}
          download
          className="shrink-0 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-2 px-4 rounded-lg transition whitespace-nowrap"
        >
          <span aria-hidden="true">📥</span>
          <span>Télécharger ({monthLabel})</span>
        </a>
      </div>
    </article>
  );
}
