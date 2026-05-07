// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/business - Dashboard Impact Business (angle financier dirigeant).
//
// REFONTE MAI 2026 : aligné sur le design system Linear (PageHeader, Section,
// StatusBadge). Plus de wrapper local max-w-7xl (le layout admin s'en charge).
// =============================================================================

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeBusinessImpact, VERDICT_LABEL } from "@/lib/business-impact";
import {
  buildAllExplanations,
  METHODOLOGY_LIMITATIONS,
} from "@/lib/business-impact-methodology";
import BusinessImpactView from "@/components/BusinessImpactView";
import CodirMode from "@/components/CodirMode";
import LiveAttackMap from "@/components/LiveAttackMap";
import { CyberMeteoCard } from "@/components/CyberMeteoBadge";
import { getCyberMeteo } from "@/lib/cyber-meteo";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import BusinessMethodology from "@/components/admin/BusinessMethodology";

export const dynamic = "force-dynamic";

// Mapping verdict business-impact -> couleur CodirMode (4 niveaux)
const VERDICT_TO_CODIR_COLOR = {
  excellent: "green",
  bon: "amber",
  a_surveiller: "orange",
  a_risque: "red",
} as const;

// Mapping verdict -> couleurs hero (cohérent avec LEVEL_META du dashboard)
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

export default async function AdminBusinessPage() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth déjà appliquée).
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const [impact, tenant, meteo] = await Promise.all([
    computeBusinessImpact(tenantId),
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    getCyberMeteo(),
  ]);
  const verdict = VERDICT_LABEL[impact.scoreVerdict];
  const tenantName = tenant?.name ?? "Votre organisation";
  const explanations = buildAllExplanations(impact);

  return (
    <>
      <AdminPageHeader
        title="Impact business"
        description="Combien la cyber vous fait gagner - concret, en euros. Ce que votre assureur et votre COMEX veulent voir."
        actions={
          <CodirMode
            collectiveScore={impact.collectiveScore}
            scoreVerdictLabel={verdict.label}
            scoreVerdictColor={VERDICT_TO_CODIR_COLOR[impact.scoreVerdict]}
            expectedAnnualLoss={impact.expectedAnnualLoss}
            incidentProbabilityPct={Math.round(
              impact.incidentProbability12m * 100,
            )}
            estimatedAnnualSaving={impact.estimatedAnnualSaving}
            roiMultiplier={impact.roiMultiplier}
            totalSeats={impact.totalSeats}
            topActions={impact.topActions}
            tenantName={tenantName}
          />
        }
      />

      <div className="space-y-6 min-w-0">
        {/* HERO - Score + coût attendu + ROI */}
        <section
          aria-label="Vue financière d'ensemble"
          className={`rounded-2xl border-2 ${VERDICT_HERO_STYLES[impact.scoreVerdict]} p-5 sm:p-7`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            <HeroBlock
              label="Score collectif"
              valueClassName="text-gray-900 dark:text-gray-100"
            >
              <p className="text-5xl sm:text-6xl font-extrabold leading-none tabular-nums">
                {impact.collectiveScore}
                <span className="text-2xl text-gray-400">/100</span>
              </p>
              <p
                className={`text-base font-bold mt-2 ${VERDICT_TEXT_STYLES[impact.scoreVerdict]}`}
              >
                {verdict.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Moyenne pondérée des {impact.totalSeats} collaborateurs
              </p>
            </HeroBlock>

            <HeroBlock label="Coût attendu sur 12 mois" border>
              <p className="text-3xl sm:text-4xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                {impact.expectedAnnualLoss.toLocaleString("fr-FR")} €
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                Probabilité incident&nbsp;:{" "}
                <strong className="text-gray-900 dark:text-gray-200">
                  {Math.round(impact.incidentProbability12m * 100)}%
                </strong>
                <br />
                Coût moyen incident PME&nbsp;:{" "}
                <strong className="text-gray-900 dark:text-gray-200">
                  {impact.estimatedIncidentCost.toLocaleString("fr-FR")} €
                </strong>
              </p>
            </HeroBlock>

            <HeroBlock label="ROI Humanix">
              <p className="text-4xl sm:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ×{impact.roiMultiplier}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                Économie estimée&nbsp;:{" "}
                <strong className="text-gray-900 dark:text-gray-200">
                  {impact.estimatedAnnualSaving.toLocaleString("fr-FR")} €/an
                </strong>
                <br />
                Coût Humanix&nbsp;:{" "}
                {impact.humanixAnnualCost.toLocaleString("fr-FR")} €/an
              </p>
            </HeroBlock>
          </div>
        </section>

        {/* Méthodologie & sources - placé tout de suite après le hero pour
            que le DG / DAF puisse cliquer et comprendre d'où viennent les
            chiffres avant d'aller plus loin. C'est ce qui transforme un
            "joli dashboard" en "outil de pilotage adopté par le COMEX". */}
        <BusinessMethodology
          explanations={explanations}
          limitations={METHODOLOGY_LIMITATIONS}
        />

        {/* Détail business impact (composant existant) */}
        <BusinessImpactView impact={impact} />

        {/* Cyber-météo + Live attack map en grille */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CyberMeteoCard meteo={meteo} />
          <LiveAttackMap />
        </div>

        {/* Plan d'action chiffré */}
        <AdminSection
          title="Plan d'action pour gagner des points"
          description="Actions recommandées par ordre d'impact / facilité."
        >
          <ol className="space-y-2 list-none">
            {impact.topActions.map((a, i) => (
              <li
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-50/60 dark:bg-slate-800/40 rounded-lg border border-gray-100 dark:border-slate-800"
              >
                <span className="shrink-0 w-7 h-7 rounded-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center text-sm tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {a.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Difficulté&nbsp;:{" "}
                    <span
                      className={
                        a.difficulty === "easy"
                          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : a.difficulty === "medium"
                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                            : "text-rose-600 dark:text-rose-400 font-semibold"
                      }
                    >
                      {a.difficulty === "easy"
                        ? "facile"
                        : a.difficulty === "medium"
                          ? "moyenne"
                          : "élevée"}
                    </span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{a.potentialPoints}
                  </p>
                  <p className="text-[10px] uppercase text-gray-400 tracking-wide">
                    pts/score
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </AdminSection>

        {/* Poster mensuel */}
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
                PDF A3 imprimable, personnalisé à votre nom et à votre service
                le plus à risque. Affichez-le dans la salle de pause - votre
                équipe l'attendra chaque mois.
              </p>
            </div>
            <a
              href={`/api/admin/poster-mensuel/${new Date().getMonth() + 1}/download`}
              download
              className="shrink-0 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-2 px-4 rounded-lg transition whitespace-nowrap"
            >
              <span aria-hidden="true">📥</span>
              <span>
                Télécharger (
                {new Date().toLocaleDateString("fr-FR", { month: "long" })})
              </span>
            </a>
          </div>
        </article>

        {/* CTA COMEX */}
        <article className="rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-5 sm:p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span aria-hidden="true">📤</span>
            <span>Convaincre votre COMEX</span>
          </h3>
          <p className="text-sm opacity-90 mb-4">
            Partagez ce dashboard avec votre dirigeant ou votre direction
            financière.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/admin/conformity-report"
              download
              className="inline-flex items-center gap-1.5 bg-white text-primary-500 font-bold text-sm py-2 px-4 rounded-lg hover:scale-105 active:scale-95 transition shadow-sm"
            >
              <span aria-hidden="true">📄</span>
              <span>Exporter rapport COMEX (PDF)</span>
            </a>
            <Link
              href="/admin/utilisateurs"
              className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/40 text-white font-bold text-sm py-2 px-4 rounded-lg hover:bg-white/20 transition"
            >
              <span aria-hidden="true">✉️</span>
              <span>Relancer les inactifs</span>
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}

// =============================================================================
// Sous-composant local : bloc du hero
// =============================================================================

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
