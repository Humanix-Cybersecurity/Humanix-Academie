// SPDX-License-Identifier: AGPL-3.0-or-later
// Hero du dashboard business : Score collectif + Cout attendu 12m + ROI.

import { VERDICT_LABEL } from "@/lib/business-impact";

const VERDICT_HERO_STYLES = {
  excellent:
    "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10",
  bon: "border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-900/10",
  a_surveiller:
    "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10",
  a_risque:
    "border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10",
} as const;

const VERDICT_TEXT_STYLES = {
  excellent: "text-emerald-700 dark:text-emerald-300",
  bon: "text-teal-700 dark:text-teal-300",
  a_surveiller: "text-amber-700 dark:text-amber-300",
  a_risque: "text-rose-700 dark:text-rose-300",
} as const;

type Props = {
  collectiveScore: number;
  scoreVerdict: keyof typeof VERDICT_HERO_STYLES;
  totalSeats: number;
  expectedAnnualLoss: number;
  incidentProbability12m: number;
  estimatedIncidentCost: number;
  roiMultiplier: number;
  estimatedAnnualSaving: number;
  humanixAnnualCost: number;
};

export default function BusinessHero({
  collectiveScore,
  scoreVerdict,
  totalSeats,
  expectedAnnualLoss,
  incidentProbability12m,
  estimatedIncidentCost,
  roiMultiplier,
  estimatedAnnualSaving,
  humanixAnnualCost,
}: Props) {
  const verdict = VERDICT_LABEL[scoreVerdict];

  return (
    <section
      aria-label="Vue financière d'ensemble"
      className={`rounded-2xl border-2 ${VERDICT_HERO_STYLES[scoreVerdict]} p-5 sm:p-7`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
        <HeroBlock
          label="Score collectif"
          valueClassName="text-gray-900 dark:text-gray-100"
        >
          <p className="text-5xl sm:text-6xl font-extrabold leading-none tabular-nums">
            {collectiveScore}
            <span className="text-2xl text-gray-400">/100</span>
          </p>
          <p
            className={`text-base font-bold mt-2 ${VERDICT_TEXT_STYLES[scoreVerdict]}`}
          >
            {verdict.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            Moyenne pondérée des {totalSeats} collaborateurs
          </p>
        </HeroBlock>

        <HeroBlock label="Coût attendu sur 12 mois" border>
          <p className="text-3xl sm:text-4xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            {expectedAnnualLoss.toLocaleString("fr-FR")} €
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
            Probabilité incident&nbsp;:{" "}
            <strong className="text-gray-900 dark:text-gray-200">
              {Math.round(incidentProbability12m * 100)}%
            </strong>
            <br />
            Coût moyen incident PME&nbsp;:{" "}
            <strong className="text-gray-900 dark:text-gray-200">
              {estimatedIncidentCost.toLocaleString("fr-FR")} €
            </strong>
          </p>
        </HeroBlock>

        <HeroBlock label="ROI Humanix">
          <p className="text-4xl sm:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            ×{roiMultiplier}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
            Économie estimée&nbsp;:{" "}
            <strong className="text-gray-900 dark:text-gray-200">
              {estimatedAnnualSaving.toLocaleString("fr-FR")} €/an
            </strong>
            <br />
            Coût Humanix&nbsp;: {humanixAnnualCost.toLocaleString("fr-FR")} €/an
          </p>
        </HeroBlock>
      </div>
    </section>
  );
}

function HeroBlock({
  label,
  children,
  border,
  valueClassName,
}: {
  label: string;
  children: React.ReactNode;
  border?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={`min-w-0 ${border ? "sm:px-6 sm:border-l sm:border-r border-white/40 dark:border-slate-700/40" : ""} ${valueClassName ?? ""}`}
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-400 font-bold mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}
