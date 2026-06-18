// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Bloc de reference ReCyF (composant serveur) : explique ce qu'est le
// Referentiel Cyber France, liste ses 20 objectifs de securite regroupes
// par thematique, rappelle la proportionnalite EE/EI et le statut de
// document de travail, et renvoie vers la source officielle ANSSI.
//
// Posture : on cite le referentiel officiel et on s'y positionne en
// accompagnement. On ne pretend pas le remplacer ni garantir la conformite.

import {
  RECYF_OBJECTIFS,
  RECYF_GROUPES,
  RECYF_META,
  type RecyfGroupe,
} from "@/lib/nis2/recyf";

const GROUP_ORDER = (Object.keys(RECYF_GROUPES) as RecyfGroupe[]).sort(
  (a, b) => RECYF_GROUPES[a].ordre - RECYF_GROUPES[b].ordre,
);

export default function RecyfReference() {
  return (
    <section aria-labelledby="recyf-ref-title">
      <h2
        id="recyf-ref-title"
        className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-3"
      >
        En France, le référentiel officiel : ReCyF
      </h2>
      <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-3">
        NIS2 fixe des objectifs. En France, c&apos;est l&apos;ANSSI qui les
        traduit en mesures concrètes, dans le{" "}
        <strong>{RECYF_META.nom} ({RECYF_META.sigle})</strong>. Ce référentiel
        organise la sécurité en <strong>20 objectifs de sécurité</strong>,
        regroupés en quatre grands thèmes. Notre diagnostic suit cette
        structure pour vous parler le même langage que l&apos;autorité.
      </p>

      <div className="grid sm:grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl bg-primary-50 dark:bg-primary-950/30 p-3 text-sm text-primary-800 dark:text-primary-100">
          <span aria-hidden="true">⚖️ </span>
          <strong>Proportionnalité.</strong> Objectifs 1 à 15 pour les entités
          importantes et essentielles ; objectifs 16 à 20 pour les entités
          essentielles uniquement.
        </div>
        <div className="rounded-xl bg-accent-50 dark:bg-accent-950/30 p-3 text-sm text-accent-800 dark:text-accent-100">
          <span aria-hidden="true">👤 </span>
          <strong>Le dirigeant est responsable.</strong> ReCyF place la
          gouvernance de la sécurité numérique sous la responsabilité directe
          du dirigeant exécutif.
        </div>
      </div>

      <div className="space-y-4 mb-5">
        {GROUP_ORDER.map((g) => {
          const objs = RECYF_OBJECTIFS.filter((o) => o.groupe === g);
          const meta = RECYF_GROUPES[g];
          return (
            <div
              key={g}
              className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
            >
              <h3 className="font-bold text-primary-600 dark:text-accent-200 mb-2 flex items-center gap-2">
                <span aria-hidden="true">{meta.emoji}</span> {meta.label}
              </h3>
              <ul className="space-y-1.5 list-none p-0 m-0">
                {objs.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-baseline gap-2 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 text-xs font-bold tabular-nums">
                      {o.num}
                    </span>
                    <span className="leading-snug">
                      {o.titre}
                      {o.scope === "EE" && (
                        <span className="ml-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                          essentielles
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <p className="mb-2">
          <span aria-hidden="true">📄 </span>
          <strong>ReCyF est un document de travail</strong> ({RECYF_META.sigle}{" "}
          version {RECYF_META.version}, {RECYF_META.date}). Il peut évoluer
          jusqu&apos;à l&apos;adoption définitive de la transposition. On ne
          parle donc pas de « conformité figée », mais d&apos;une démarche
          d&apos;amélioration continue.
        </p>
        <p>
          Référence officielle :{" "}
          <a
            href={RECYF_META.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-600 dark:text-accent-300 underline hover:no-underline"
          >
            le référentiel et le comparateur sur MesServicesCyber (ANSSI)
            <span aria-hidden="true"> ↗</span>
          </a>
          .
        </p>
      </div>
    </section>
  );
}
