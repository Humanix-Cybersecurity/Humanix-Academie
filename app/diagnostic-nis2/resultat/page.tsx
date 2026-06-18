// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /diagnostic-nis2/resultat - page de resultat du diagnostic NIS2.
//
// Lit les reponses encodees dans le query param `?d=BASE64` (cf.
// app/diagnostic-nis2/actions.ts pour l'encodage), calcule le score
// per-article + verdict, puis construit le PLAN d'accompagnement narratif
// (lib/nis2/plan) : pour chaque article, ce que la directive attend,
// pourquoi, un levier rapide, le chantier de fond, et comment avancer.
//
// Pas de persistance BDD : la page est "stateless" - l'URL elle-meme est
// partageable (bookmarkee, envoyee au CODIR) et reproduit le meme resultat.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { decodeAnswers } from "../encoding";
import { computeNis2Diagnostic, VERDICT_LABEL } from "@/lib/nis2/scoring";
import { buildNis2Plan } from "@/lib/nis2/plan";
import Nis2PlanView from "@/components/nis2/Nis2PlanView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon diagnostic NIS2 - Humanix Académie",
  description:
    "Résultat du diagnostic NIS2 : score par article, verdict, et votre plan d'action personnalisé pour avancer.",
  alternates: { canonical: "/diagnostic-nis2/resultat" },
  robots: { index: false, follow: false }, // page de résultat personnel, pas indexable
};

// Texte du verdict : ton calme et orienté action (jamais alarmiste).
const VERDICT_INTRO: Record<string, string> = {
  robuste:
    "Excellent. Vos mesures couvrent l'essentiel de la directive. Consolidez ce qui est en marche et documentez vos pratiques.",
  en_marche:
    "Vous êtes sur la bonne voie. Plusieurs chantiers sont déjà en place ; le plan ci-dessous vous montre les quelques manques à combler.",
  fragile:
    "Des écarts à combler sur des points importants. Pas de panique : le plan ci-dessous priorise par où commencer, étape par étape.",
  alerte:
    "Il y a du chemin, et c'est normal de commencer quelque part. Le plan ci-dessous vous donne les premiers leviers à activer dès cette semaine.",
};

export default async function DiagnosticResultPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  if (!d) redirect("/diagnostic-nis2");

  const decoded = decodeAnswers(d);
  if (!decoded) redirect("/diagnostic-nis2");

  const diagnostic = computeNis2Diagnostic(decoded.answers);
  const verdictInfo = VERDICT_LABEL[diagnostic.verdict];
  const plan = buildNis2Plan(diagnostic);

  return (
    <main
      id="main-content"
      className="max-w-4xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn"
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm">
        <Link
          href="/diagnostic-nis2"
          className="text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline"
        >
          ← Refaire le diagnostic
        </Link>
        <Link
          href="/nis2"
          className="text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline"
        >
          Espace NIS2
        </Link>
      </div>

      {/* Score global + verdict */}
      <section
        className="rounded-3xl border-2 p-6 sm:p-10 text-center mb-8 shadow-md"
        style={{
          borderColor: verdictInfo.color,
          background: `linear-gradient(135deg, ${verdictInfo.color}15 0%, transparent 100%)`,
        }}
      >
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-2 opacity-70">
          Diagnostic NIS2 · {decoded.companyName ?? "Votre organisation"}
        </p>
        <h1
          className="font-display text-5xl sm:text-7xl font-extrabold mb-2 tabular-nums"
          style={{ color: verdictInfo.color }}
        >
          {diagnostic.globalScore}
          <span className="text-3xl sm:text-4xl opacity-70">/100</span>
        </h1>
        <p
          className="text-xl sm:text-2xl font-bold mb-3"
          style={{ color: verdictInfo.color }}
        >
          {verdictInfo.label}
        </p>
        <p className="text-base text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed">
          {VERDICT_INTRO[diagnostic.verdict]}
        </p>
      </section>

      {/* Resume chiffre du plan */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-8">
        Votre plan : <strong>{plan.priorityCount}</strong> chantier
        {plan.priorityCount > 1 ? "s" : ""} prioritaire
        {plan.priorityCount > 1 ? "s" : ""}
        {plan.solidCount > 0 && (
          <>
            {" "}
            · <strong>{plan.solidCount}</strong> point
            {plan.solidCount > 1 ? "s" : ""} déjà solide
            {plan.solidCount > 1 ? "s" : ""}
          </>
        )}
        .
      </p>

      {/* PLAN D'ACTION NARRATIF */}
      <section className="mb-10">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-2">
            <span aria-hidden="true">🗺️ </span>Votre plan d'action
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
            Article par article, dans l'ordre des priorités : ce que la
            directive attend, pourquoi ça compte, un levier à activer cette
            semaine, et le chantier de fond. On précise aussi ce qui revient à
            votre prestataire IT.
          </p>
        </div>
        <Nis2PlanView plan={plan} />
      </section>

      {/* CTA */}
      <section className="rounded-3xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950/40 dark:to-accent-950/40 border-2 border-primary-200 dark:border-primary-900/40 p-6 sm:p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-3">
          Avancer concrètement, sans vous éparpiller
        </h2>
        <p className="text-gray-700 dark:text-gray-200 max-w-xl mx-auto mb-5 leading-relaxed">
          La plupart de ces leviers passent par la formation des équipes. Humanix
          Académie vous fournit les parcours, les campagnes de phishing et un
          Pack NIS2 prêt à signer (politique, procédure d'incident, registre des
          actions) pour documenter votre démarche.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors"
          >
            Voir les offres →
          </Link>
          <Link
            href="/nis2/comprendre"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Comprendre NIS2
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            En parler à un humain
          </Link>
        </div>
      </section>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic mt-8 max-w-2xl mx-auto leading-relaxed">
        Ce diagnostic est un outil d&apos;auto-évaluation qui vous accompagne
        vers la conformité, sans la garantir. Il ne remplace pas un audit formel
        par un cabinet qualifié (PASSI) ni un conseil juridique. Pour un audit
        opposable à l&apos;ANSSI, faites appel à un prestataire qualifié.
      </p>
    </main>
  );
}
