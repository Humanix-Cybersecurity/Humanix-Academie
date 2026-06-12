// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /diagnostic-nis2 - diagnostic public NIS2 en 30 questions (Pack NIS2 v2).
//
// Page publique, sans auth. L'utilisateur (RSSI / DSI / dirigeant) repond
// a 30 questions OUI / NON / Je ne sais pas reparties sur 11 articles
// NIS2. A la soumission, redirection vers /diagnostic-nis2/resultat
// avec le score per-article + verdict + top 3 priorites.
//
// Pas de persistance BDD (stateless) - RGPD-friendly, pas de cookie,
// pas de session. L'email est optionnel et sert uniquement a recevoir
// le PDF par mail si l'utilisateur le demande (V2 prochain commit).

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import { NIS2_QUESTIONS } from "@/lib/nis2/questions";
import { NIS2_ARTICLES_ORDER, NIS2_ARTICLES } from "@/lib/nis2/articles";
import { submitDiagnosticNis2 } from "./actions";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title:
    "Diagnostic NIS2 gratuit en 30 questions - Humanix Académie",
  description:
    "Évalue ta conformité NIS2 article par article en 10 minutes. 30 questions concrètes, score per-article + top 3 priorités. Gratuit, sans inscription.",
  alternates: { canonical: "/diagnostic-nis2" },
  openGraph: {
    title:
      "Diagnostic NIS2 gratuit - où en es-tu vraiment ?",
    description:
      "30 questions concrètes mappées article par article (21.2.a → 23). Score per-article + top 3 chantiers prioritaires. En 10 minutes.",
    type: "website",
    locale: "fr_FR",
  },
};

// Groupement des questions par article pour rendre visuellement
// chaque section comme un bloc thematique.
function questionsByArticle() {
  const grouped: Record<string, typeof NIS2_QUESTIONS> = {};
  for (const q of NIS2_QUESTIONS) {
    grouped[q.article] ??= [];
    grouped[q.article].push(q);
  }
  return grouped;
}

export default function DiagnosticNis2Page() {
  const grouped = questionsByArticle();

  return (
    <main
      id="main-content"
      className="overflow-x-hidden animate-fadeIn"
    >
      {/* HERO */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-4xl mx-auto px-4 pt-12 pb-10 sm:pt-16 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Diagnostic gratuit · 10 minutes · sans inscription
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-4">
            Où en es-tu vraiment sur NIS2 ?
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed mb-6">
            30 questions concrètes mappées article par article de la
            directive. Tu reçois un score par article + tes 3 chantiers
            prioritaires. Aucun jargon, juste du terrain.
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-xs">
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-bold">
              <span aria-hidden="true">🇫🇷 </span>Aligné loi du 31 octobre 2024
            </span>
            <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 font-bold">
              <span aria-hidden="true">📋 </span>11 articles couverts (21.2.a → 23)
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold">
              <span aria-hidden="true">🔓 </span>RGPD-friendly (rien stocké)
            </span>
          </div>
        </section>
      </HexBackdrop>

      {/* FORM */}
      <form
        action={submitDiagnosticNis2}
        className="max-w-3xl mx-auto px-4 py-10 space-y-8"
      >
        {/* Identite optionnelle */}
        <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <h2 className="font-display text-xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            Identifier ton organisation (optionnel)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 italic">
            Renseigne juste si tu veux recevoir le rapport PDF par mail.
            Sinon le résultat s&apos;affichera directement à l&apos;écran.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="diag-email"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
              >
                Email pro
              </label>
              <input
                id="diag-email"
                name="email"
                type="email"
                placeholder="rssi@entreprise.fr"
                className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="diag-company"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
              >
                Nom de ton organisation
              </label>
              <input
                id="diag-company"
                name="companyName"
                type="text"
                placeholder="Acme SAS"
                className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
        </section>

        {/* 30 QUESTIONS GROUPEES PAR ARTICLE */}
        {NIS2_ARTICLES_ORDER.map((articleId) => {
          const meta = NIS2_ARTICLES[articleId];
          const qs = grouped[articleId] ?? [];
          return (
            <section
              key={articleId}
              aria-labelledby={`art-${articleId}`}
              className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
            >
              <header className="mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mb-1">
                  Article NIS2 · {articleId}
                </p>
                <h2
                  id={`art-${articleId}`}
                  className="font-display text-lg font-bold text-primary-500 dark:text-accent-300"
                >
                  {meta.title}
                </h2>
              </header>

              <div className="space-y-5">
                {qs.map((q) => (
                  <fieldset key={q.id} className="space-y-2">
                    <legend
                      id={`q-${q.id}-legend`}
                      className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug"
                    >
                      {q.text}
                    </legend>
                    {q.hint && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1">
                        💡 {q.hint}
                      </p>
                    )}
                    <div
                      className="flex flex-wrap gap-2"
                      role="radiogroup"
                      aria-labelledby={`q-${q.id}-legend`}
                    >
                      {(["oui", "non", "ne_sait_pas"] as const).map((val) => {
                        // Le symbole est decoratif : on l'expose en
                        // aria-hidden et on garde le mot pour le lecteur
                        // d'ecran.
                        const display = {
                          oui: { symbol: "✓", label: "Oui" },
                          non: { symbol: "✗", label: "Non" },
                          ne_sait_pas: { symbol: "?", label: "Je ne sais pas" },
                        };
                        return (
                          <label
                            key={val}
                            className="cursor-pointer text-sm px-3 py-1.5 rounded-full border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 has-[input:checked]:border-accent-500 has-[input:checked]:bg-accent-50 dark:has-[input:checked]:bg-accent-950/40 has-[input:checked]:text-accent-800 dark:has-[input:checked]:text-accent-200 has-[input:checked]:font-bold transition-colors"
                          >
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              value={val}
                              required
                              className="sr-only"
                            />
                            <span aria-hidden="true">
                              {display[val].symbol}{" "}
                            </span>
                            {display[val].label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>
          );
        })}

        {/* SUBMIT */}
        <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950/40 dark:to-accent-950/40 border-2 border-primary-200 dark:border-primary-900/40 p-6 text-center">
          <h2 className="font-display text-xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            Tu as répondu aux 30 questions ?
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-5">
            Tu vas voir ton score par article + tes 3 chantiers
            prioritaires NIS2.
          </p>
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-3 rounded-xl text-lg shadow-md transition-colors"
          >
            📊 Voir mon diagnostic →
          </button>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
            Aucune donnée n&apos;est stockée. Le résultat est généré dans
            ton navigateur et l&apos;URL ne contient aucune information
            personnelle.
          </p>
        </div>

        {/* MARKETING FOOTER */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-300 pt-6">
          <p>
            <Link
              href="/comparatif"
              className="text-accent-600 dark:text-accent-300 underline hover:no-underline"
            >
              Comparatif honnête
            </Link>{" "}
            ·{" "}
            <Link
              href="/securite"
              className="text-accent-600 dark:text-accent-300 underline hover:no-underline"
            >
              Trust Center
            </Link>{" "}
            ·{" "}
            <Link
              href="/tarifs"
              className="text-accent-600 dark:text-accent-300 underline hover:no-underline"
            >
              Tarifs
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
