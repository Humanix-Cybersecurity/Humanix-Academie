// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /diagnostic-nis2/resultat - page de resultat du diagnostic NIS2.
//
// Lit les reponses encodees dans le query param `?d=BASE64` (cf.
// app/diagnostic-nis2/actions.ts pour l'encodage), calcule le score
// per-article + verdict + top 3 priorites, et rend une page lisible
// pour le RSSI / DSI / dirigeant.
//
// Pas de persistance BDD : la page est "stateless" - l'URL elle-meme
// est partageable (peut etre bookmarkee, envoyee au CODIR), reproduit
// le meme resultat.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { decodeAnswers } from "../encoding";
import {
  computeNis2Diagnostic,
  VERDICT_LABEL,
  type Nis2ArticleScore,
} from "@/lib/nis2/scoring";
import { NIS2_ARTICLES_ORDER } from "@/lib/nis2/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon diagnostic NIS2 - Humanix Académie",
  description:
    "Résultat du diagnostic NIS2 en 30 questions : score per-article, verdict, top 3 priorités.",
  alternates: { canonical: "/diagnostic-nis2/resultat" },
  robots: { index: false, follow: false }, // page de résultat personnel, pas indexable
};

function ScoreBadge({ score }: { score: number }) {
  // Label semantique : on ne se repose pas sur la couleur seule (WCAG 1.4.1).
  // Un daltonien lit "Score 80%, niveau robuste" via le lecteur d'ecran.
  const verdict =
    score >= 80
      ? "robuste"
      : score >= 60
        ? "en marche"
        : score >= 40
          ? "fragile"
          : "alerte";
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-sky-500"
        : score >= 40
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[3rem] h-7 px-2 rounded-full ${color} text-white text-sm font-bold tabular-nums`}
      aria-label={`Score ${score} sur 100, niveau ${verdict}`}
    >
      {score}%
    </span>
  );
}

function ArticleScoreCard({ score }: { score: Nis2ArticleScore }) {
  const yesCount = score.questions.filter((q) => q.answer === "oui").length;
  const total = score.questions.length;

  return (
    <article className="rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mb-0.5">
            Art. NIS2 · {score.article}
          </p>
          <h3 className="font-bold text-sm text-primary-500 dark:text-accent-300 leading-tight">
            {score.meta.title}
          </h3>
        </div>
        <ScoreBadge score={score.score} />
      </header>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {yesCount} / {total} mesures en place
      </p>
    </article>
  );
}

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

  return (
    <main
      id="main-content"
      className="max-w-4xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn"
    >
      <Link
        href="/diagnostic-nis2"
        className="text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline mb-3 inline-block"
      >
        ← Refaire le diagnostic
      </Link>

      {/* Score global + verdict */}
      <section
        className="rounded-3xl border-2 p-6 sm:p-10 text-center mb-10 shadow-md"
        style={{
          borderColor: verdictInfo.color,
          background: `linear-gradient(135deg, ${verdictInfo.color}15 0%, transparent 100%)`,
        }}
      >
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-2 opacity-70">
          Diagnostic NIS2 ·{" "}
          {decoded.companyName ?? "Ton organisation"}
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
          {diagnostic.verdict === "robuste" &&
            "Excellent. Tes mesures couvrent l'essentiel de la directive. Consolide ce qui est en marche et documente."}
          {diagnostic.verdict === "en_marche" &&
            "Sur la bonne voie. Plusieurs chantiers déjà en place, quelques manques à combler dans les 6 prochains mois."}
          {diagnostic.verdict === "fragile" &&
            "Des gaps significatifs sur des articles critiques. Plan d'action urgent recommandé sur les 3 priorités ci-dessous."}
          {diagnostic.verdict === "alerte" &&
            "Posture insuffisante face à NIS2. Sanctions possibles (jusqu'à 10 M€ ou 2 % du CA mondial). Action immédiate."}
        </p>
      </section>

      {/* Top 3 priorites */}
      {diagnostic.topPriorities.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-2">
            🎯 Tes 3 chantiers prioritaires
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-5">
            Articles avec le plus gros écart à combler. Commence par
            ceux-là si tu n&apos;as qu&apos;un trimestre devant toi.
          </p>
          <ol className="space-y-3">
            {diagnostic.topPriorities.map((p, i) => (
              <li
                key={p.article}
                className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900/40 p-5"
              >
                <header className="flex items-start gap-3 mb-2">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-bold shrink-0"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-300 mb-0.5">
                      Article NIS2 · {p.article} · score {p.score}/100
                    </p>
                    <h3 className="font-bold text-amber-900 dark:text-amber-100">
                      {p.meta.title}
                    </h3>
                  </div>
                </header>
                <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed mb-2">
                  {p.meta.description}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 italic">
                  ✨ Saisons Humanix qui couvrent cet article :{" "}
                  <strong>{p.meta.coveredBySaisons.join(", ")}</strong>
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Détail per-article */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-4">
          📋 Détail par article NIS2
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {NIS2_ARTICLES_ORDER.map((articleId) => {
            const score = diagnostic.articleScores.find(
              (a) => a.article === articleId,
            );
            if (!score) return null;
            return <ArticleScoreCard key={articleId} score={score} />;
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-3xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950/40 dark:to-accent-950/40 border-2 border-primary-200 dark:border-primary-900/40 p-6 sm:p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-3">
          Combler ces gaps en moins de 3 mois
        </h2>
        <p className="text-gray-700 dark:text-gray-200 max-w-xl mx-auto mb-5 leading-relaxed">
          Humanix Académie te livre un Pack NIS2 prêt à signer (politique,
          procédure incident 24h/72h, registre formations) + 12 modules
          pédagogiques crise/sauvegardes/NIS2. Démarrage en 24 h.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors"
          >
            Voir les tarifs →
          </Link>
          <Link
            href="/dpo"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Espace DPO / RSSI
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Audit complet sur devis
          </Link>
        </div>
      </section>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic mt-8 max-w-2xl mx-auto">
        Ce diagnostic est un outil d&apos;auto-évaluation. Il ne remplace
        pas un audit formel par un cabinet certifié. Pour un audit
        opposable à l&apos;ANSSI, fais appel à un PASSI.
      </p>
    </main>
  );
}
