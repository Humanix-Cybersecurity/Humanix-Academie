// SPDX-License-Identifier: AGPL-3.0-or-later
// Page resultat publique de l'audit flash.
// On affiche : score, verdict, top 3 risques, recommandation Humanix, NIS2,
// + bouton telechargement PDF + CTA contact.
//
// L'URL est devinable (cuid), donc le contenu est volontairement neutre :
// pas de données sensibles affichees au-dela de ce que le prospect a déjà saisi.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  buildAuditResult,
  AuditAnswers,
  CompanySize,
  Sector,
  SIZE_LABELS,
  SECTOR_LABELS,
} from "@/lib/audit-flash/scoring";
import { buildSignedPdfUrl } from "@/lib/audit-flash/signed-urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre résultat d'audit cyber | Humanix Académie",
  description: "Découvrez votre score, vos risques et votre plan d'action.",
  robots: { index: false, follow: false },
};

const VERDICT_TONES: Record<
  string,
  { bg: string; ring: string; text: string }
> = {
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    ring: "ring-green-500",
    text: "text-green-700 dark:text-green-300",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    ring: "ring-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    ring: "ring-orange-500",
    text: "text-orange-700 dark:text-orange-300",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    ring: "ring-red-500",
    text: "text-red-700 dark:text-red-300",
  },
};

const SEVERITY_BADGES: Record<string, string> = {
  critique: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  important:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  moyen: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default async function AuditResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await db.auditFlashSubmission.findUnique({
    where: { id },
  });
  if (!submission) notFound();

  // On recalcule cote serveur pour rester source de verite
  const result = buildAuditResult(
    submission.answers as AuditAnswers,
    submission.size as CompanySize,
    submission.sector as Sector,
  );
  const tone = VERDICT_TONES[result.verdict.color];

  return (
    <div className="bg-gradient-to-b from-primary-500/5 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Bandeau identite */}
        <div className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          Audit pour <strong>{submission.companyName}</strong> ·{" "}
          {SIZE_LABELS[submission.size as CompanySize]} ·{" "}
          {SECTOR_LABELS[submission.sector as Sector]}
        </div>

        {/* Hero score */}
        <section
          className={`rounded-3xl p-8 sm:p-12 mb-8 ring-2 ${tone.ring} ${tone.bg}`}
          aria-labelledby="result-title"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className={`relative w-32 h-32 rounded-full bg-white dark:bg-slate-800 flex flex-col items-center justify-center ring-4 ${tone.ring} shadow-lg`}
              aria-label={`Score : ${result.score} sur 100`}
            >
              <span className="text-5xl font-extrabold text-primary-500 dark:text-accent-300">
                {result.score}
              </span>
              <span className="text-xs text-gray-500 -mt-1">/ 100</span>
            </div>
            <div className="text-center sm:text-left flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-bold mb-1">
                Verdict
              </p>
              <h1
                id="result-title"
                className={`text-3xl sm:text-4xl font-extrabold mb-3 ${tone.text}`}
              >
                {result.verdict.label}
              </h1>
              <p className="text-gray-700 dark:text-gray-200">
                {result.verdict.summary}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href={buildSignedPdfUrl(submission.id)}
              className="btn-primary inline-flex items-center justify-center gap-2"
              aria-label="Télécharger le rapport PDF"
            >
              📄 Télécharger mon rapport PDF
            </a>
            <a
              href="mailto:contact@humanix-cybersecurity.fr?subject=Suite%20%C3%A0%20mon%20audit%20cyber%20Humanix"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-primary-500 text-primary-500 dark:text-accent-300 dark:border-accent-300 hover:bg-primary-500 hover:text-white dark:hover:bg-accent-300 dark:hover:text-slate-900 transition"
            >
              💬 Échanger avec un expert
            </a>
          </div>
        </section>

        {/* NIS2 alerte */}
        {result.nis2Concerned && (
          <section
            className="mb-8 p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500"
            aria-labelledby="nis2-title"
          >
            <h2
              id="nis2-title"
              className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-2"
            >
              ⚠ Attention NIS2 : votre entreprise est probablement concernée
            </h2>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              La directive NIS2 impose des obligations de cybersécurité et de
              notification d'incident sous 24h. Compte tenu de votre taille
              et/ou secteur, vous êtes a priori dans le périmètre. Sanctions
              potentielles : jusqu'à 10 M€ ou 2 % du CA mondial.
            </p>
          </section>
        )}

        {/* Top risques */}
        <section className="mb-10" aria-labelledby="risks-title">
          <h2
            id="risks-title"
            className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-4"
          >
            Vos {result.topRisks.length} risques prioritaires
          </h2>
          {result.topRisks.length === 0 ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6">
              <p className="text-green-800 dark:text-green-200">
                🎉 Aucun risque majeur détecté ! Continuez à maintenir votre
                niveau de vigilance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {result.topRisks.map((risk) => (
                <article
                  key={risk.category}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700"
                >
                  <header className="flex items-center gap-3 mb-3 flex-wrap">
                    <span
                      className={`text-xs font-bold uppercase px-2 py-1 rounded ${SEVERITY_BADGES[risk.severity]}`}
                    >
                      {risk.severity}
                    </span>
                    <h3 className="text-lg font-bold text-primary-500 dark:text-accent-300">
                      <span aria-hidden="true">{risk.emoji}</span>{" "}
                      {risk.categoryLabel}
                    </h3>
                  </header>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-3">
                    {risk.failedQuestions.slice(0, 3).map((q) => (
                      <li key={q.id}>• {q.text}</li>
                    ))}
                  </ul>
                  <div className="text-sm text-primary-700 dark:text-accent-200 italic border-t border-gray-100 dark:border-slate-700 pt-3">
                    💡 <strong>Action recommandée :</strong>{" "}
                    {risk.recommendation}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Recommandation Humanix */}
        <section
          className="mb-10 rounded-3xl p-8 bg-primary-500 text-white"
          aria-labelledby="reco-title"
        >
          <p className="text-sm opacity-80 mb-1">
            Notre recommandation pour vous
          </p>
          <h2
            id="reco-title"
            className="text-3xl sm:text-4xl font-extrabold mb-2"
          >
            Humanix {result.recommendedPlan.name}
          </h2>
          <p className="text-xl text-accent-200 font-bold mb-4">
            {result.recommendedPlan.monthlyPrice} ·{" "}
            <span className="opacity-80">
              {result.recommendedPlan.annualEstimate}
            </span>
          </p>
          <p className="opacity-90 mb-6">{result.recommendedPlan.rationale}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={result.recommendedPlan.ctaUrl}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-primary-500 font-bold hover:bg-gray-100"
            >
              Voir l'offre détaillée →
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-white/40 hover:border-white/80 text-white"
            >
              Tester la plateforme en démo
            </Link>
          </div>
        </section>

        {/* Footer reassurance */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Une question sur ce rapport ?{" "}
          <a
            href="mailto:contact@humanix-cybersecurity.fr"
            className="underline hover:text-primary-500"
          >
            contact@humanix-cybersecurity.fr
          </a>
          {" · "}
          Données traitées en France · Effacement sur demande à{" "}
          <a
            href="mailto:rgpd@humanix-cybersecurity.fr"
            className="underline hover:text-primary-500"
          >
            rgpd@humanix-cybersecurity.fr
          </a>
          .
        </p>
      </div>
    </div>
  );
}
