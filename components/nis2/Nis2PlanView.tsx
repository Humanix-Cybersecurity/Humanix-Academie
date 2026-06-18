// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Affichage du PLAN ReCyF narratif (composant serveur).
// Chaque objectif de securite devient une fiche d'accompagnement : ce que
// l'objectif attend, pourquoi, un levier rapide, le chantier de fond,
// comment Humanix aide (formation), et ce qui releve du prestataire IT.
// C'est ce qui distingue l'espace d'un simple score : on accompagne.

import { RECYF_GROUPES } from "@/lib/nis2/recyf";
import {
  RECYF_STATUS_LABEL,
  type RecyfPlan,
  type RecyfPlanItem,
  type RecyfStatus,
} from "@/lib/nis2/recyf-scoring";

const STATUS_STYLE: Record<RecyfStatus, string> = {
  prioritaire: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  a_renforcer:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  solide:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
};

const CARD_BORDER: Record<RecyfStatus, string> = {
  prioritaire: "border-red-200 dark:border-red-900/40",
  a_renforcer: "border-amber-200 dark:border-amber-900/40",
  solide: "border-emerald-200 dark:border-emerald-900/40",
};

function prettySaison(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PlanCard({ item }: { item: RecyfPlanItem }) {
  const o = item.objectif;
  const groupe = RECYF_GROUPES[o.groupe];
  return (
    <article
      className={`rounded-2xl border-2 bg-white dark:bg-slate-900 p-5 sm:p-6 ${CARD_BORDER[item.status]}`}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mb-0.5">
            <span aria-hidden="true">{groupe.emoji} </span>
            Objectif {o.num} · {groupe.label}
            {o.scope === "EE" ? " · entités essentielles" : ""}
          </p>
          <h3 className="font-display text-lg font-bold text-primary-600 dark:text-accent-200 leading-tight">
            {o.titre}
          </h3>
        </div>
        <span
          className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLE[item.status]}`}
        >
          {RECYF_STATUS_LABEL[item.status]}
        </span>
      </header>

      <div className="mb-3">
        <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
          Ce que l&apos;objectif attend
        </p>
        <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
          {o.attend}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
          Pourquoi ça compte pour vous
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          {o.pourquoi}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
            <span aria-hidden="true">⚡ </span>Cette semaine
          </p>
          <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
            {o.levierRapide}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-slate-800/60 p-3">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
            <span aria-hidden="true">📅 </span>Le chantier de fond
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            {o.chantier}
          </p>
        </div>
      </div>

      {o.humanixAngle && (
        <div className="border-t border-gray-100 dark:border-slate-800 pt-3 mb-3">
          <p className="text-xs uppercase tracking-wider text-accent-600 dark:text-accent-300 font-bold mb-1.5">
            <span aria-hidden="true">🎓 </span>Humanix vous accompagne ici
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-2">
            {o.humanixAngle}
          </p>
          {o.saisons.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
              {o.saisons.map((s) => (
                <li
                  key={s}
                  className="text-xs font-medium text-accent-800 dark:text-accent-200 bg-accent-50 dark:bg-accent-950/40 px-2.5 py-1 rounded-full"
                >
                  {prettySaison(s)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {o.partnerAngle && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3">
          <span aria-hidden="true" className="text-base leading-none mt-0.5">
            🛠️
          </span>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            <span className="font-bold">À confier à votre prestataire IT : </span>
            {o.partnerAngle}
          </p>
        </div>
      )}
    </article>
  );
}

export default function Nis2PlanView({ plan }: { plan: RecyfPlan }) {
  return (
    <div className="space-y-4">
      {plan.items.map((item) => (
        <PlanCard key={item.objectif.id} item={item} />
      ))}
    </div>
  );
}
