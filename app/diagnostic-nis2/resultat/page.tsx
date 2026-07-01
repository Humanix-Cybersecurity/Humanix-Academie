// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /diagnostic-nis2/resultat - resultat du diagnostic ReCyF.
//
// Lit profil + reponses encodes dans `?d=BASE64` (cf. lib/nis2/recyf-encoding),
// construit le plan d'accompagnement objectif par objectif (lib/nis2/recyf-
// scoring) et l'affiche. Stateless : l'URL est partageable et reproduit le
// meme resultat.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { decodeRecyf } from "@/lib/nis2/recyf-encoding";
import {
  buildRecyfPlan,
  RECYF_VERDICT_LABEL,
} from "@/lib/nis2/recyf-scoring";
import { RECYF_META } from "@/lib/nis2/recyf";
import Nis2PlanView from "@/components/nis2/Nis2PlanView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon diagnostic NIS2 / ReCyF - Humanix Académie",
  description:
    "Résultat du diagnostic ReCyF : situation par objectif de sécurité et plan d'action personnalisé.",
  alternates: { canonical: "/diagnostic-nis2/resultat" },
  robots: { index: false, follow: false },
};

const VERDICT_INTRO: Record<string, string> = {
  robuste:
    "Excellent. Vos pratiques couvrent l'essentiel des objectifs. Consolidez ce qui est en place et documentez votre démarche.",
  en_marche:
    "Vous êtes sur la bonne voie. Plusieurs objectifs sont déjà en place ; le plan ci-dessous montre les quelques chantiers à mener.",
  fragile:
    "Des écarts à combler sur des objectifs importants. Pas de panique : le plan ci-dessous priorise par où commencer, étape par étape.",
  alerte:
    "Il y a du chemin, et c'est normal de commencer quelque part. Le plan ci-dessous vous donne les premiers leviers à activer dès cette semaine.",
};

function GroupBar({
  label,
  emoji,
  score,
}: {
  label: string;
  emoji: string;
  score: number;
}) {
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-200">
          <span aria-hidden="true">{emoji} </span>
          {label}
        </span>
        <span className="tabular-nums text-gray-500 dark:text-gray-400">
          {score}%
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden"
        role="img"
        aria-label={`${label} : ${score} sur 100`}
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default async function DiagnosticResultPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  if (!d) redirect("/diagnostic-nis2");

  const decoded = decodeRecyf(d);
  if (!decoded) redirect("/diagnostic-nis2");

  const plan = buildRecyfPlan(decoded.answers, decoded.profil);
  const verdictInfo = RECYF_VERDICT_LABEL[plan.verdict];
  const profilLabel =
    decoded.profil === "EE" ? "Entité essentielle" : "Entité importante";

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
          Diagnostic ReCyF · {decoded.companyName ?? profilLabel}
        </p>
        <h1
          className="font-display text-5xl sm:text-7xl font-extrabold mb-2 tabular-nums"
          style={{ color: verdictInfo.color }}
        >
          {plan.globalScore}
          <span className="text-3xl sm:text-4xl opacity-70">/100</span>
        </h1>
        <p
          className="text-xl sm:text-2xl font-bold mb-3"
          style={{ color: verdictInfo.color }}
        >
          {verdictInfo.label}
        </p>
        <p className="text-base text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed">
          {VERDICT_INTRO[plan.verdict]}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {profilLabel} · {plan.objectifsCount} objectifs évalués ·{" "}
          {plan.priorityCount} à engager · {plan.solidCount} en place
        </p>
      </section>

      {/* Scores par thematique */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 mb-10">
        <h2 className="font-display text-lg font-bold text-primary-500 dark:text-accent-300 mb-4">
          Votre situation par thématique
        </h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {plan.groupScores.map((g) => (
            <GroupBar
              key={g.groupe}
              label={g.label}
              emoji={g.emoji}
              score={g.score}
            />
          ))}
        </div>
      </section>

      {/* PLAN D'ACTION NARRATIF */}
      <section className="mb-10">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-2">
            <span aria-hidden="true">🗺️ </span>Votre plan d&apos;action
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
            Objectif par objectif, dans l&apos;ordre des priorités : ce que
            l&apos;objectif attend, pourquoi ça compte, un levier à activer
            cette semaine, et le chantier de fond. On précise aussi ce qui
            revient à votre prestataire IT. Commencez par les objectifs marqués
            «&nbsp;Priorité&nbsp;».
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
          Pack NIS2 prêt à signer (politique, procédure d&apos;incident, registre
          des actions) pour documenter votre démarche.
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
            Comprendre ReCyF
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
        Basé sur le {RECYF_META.nom} ({RECYF_META.sigle}), version{" "}
        {RECYF_META.version} ({RECYF_META.statut.toLowerCase()},{" "}
        {RECYF_META.editeur}). Auto-évaluation indicative qui vous accompagne
        vers la conformité sans la garantir. Elle ne remplace pas un audit
        formel par un prestataire qualifié (PASSI) ni un conseil juridique.
      </p>
    </main>
  );
}
