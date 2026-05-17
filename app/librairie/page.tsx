// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue librairie micro-learning - refonte cosy mai 2026.
//
// VITRINE SEO PUBLIQUE — la librairie est la surface marketing/SEO
// principale de Humanix : 100 % accessible aux visiteurs anonymes et aux
// crawlers (Google, Bing, Qwant, Ecosia). Pas d'auth requise, ni en
// liste, ni en detail. Pas de gating DEMO_MODE non plus : on seed les
// 30 articles complets meme en demo (transparence, conversion).
//
// Brief : "experience, terrain, sensibilisation reelle, pas celle generee
// par la peur - celle qui sent bon la maitrise et la confiance".
//
// Le ton chaleureux et l'invitation a la lecture importent autant que
// le catalogue lui-même.

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata: Metadata = {
  title:
    "Librairie cyber — articles courts pour apprendre la cybersécurité au quotidien",
  description:
    "Articles de 5 à 10 minutes pour comprendre le phishing, les mots de passe, le RGPD, le Wi-Fi public, les sauvegardes, l'IA au bureau, et plus encore. Lecture libre, gratuite, sans inscription.",
  alternates: { canonical: "/librairie" },
  openGraph: {
    title: "Librairie Humanix — la cybersécurité du quotidien, en clair",
    description:
      "30+ articles courts pour décortiquer phishing, RGPD, IA, BYOD, mobile, sauvegardes, fraude. Sources publiques (ANSSI, CNIL, CERT-FR). Aucune inscription requise.",
    type: "website",
    locale: "fr_FR",
  },
};

export const dynamic = "force-dynamic";

// Palette de couleurs cyclees par index pour donner du caractere aux cards
const ARTICLE_PALETTES = [
  {
    bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
    ring: "border-cyan-200 dark:border-cyan-900/40",
    badge:
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  },
  {
    bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
    ring: "border-emerald-200 dark:border-emerald-900/40",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  {
    bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
    ring: "border-amber-200 dark:border-amber-900/40",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  {
    bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
    ring: "border-purple-200 dark:border-purple-900/40",
    badge:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  },
  {
    bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
    ring: "border-rose-200 dark:border-rose-900/40",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  },
  {
    bg: "from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40",
    ring: "border-indigo-200 dark:border-indigo-900/40",
    badge:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  },
];

export default async function LibrairiePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  // Pas d'auth requise — la librairie est publique (vitrine SEO).
  const { category } = await searchParams;

  const articles = await db.libraryArticle.findMany({
    where: {
      isPublished: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
  });

  const allCategories = await db.libraryArticle.findMany({
    where: { isPublished: true },
    select: { category: true },
    distinct: ["category"],
  });

  // Estimation temps total disponible
  const totalMinutes = articles.reduce((s, a) => s + a.readTimeMinutes, 0);

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ============================================================
          1. HERO - invitation a la lecture libre
          ============================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Lecture libre · à ton rythme
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            La librairie.
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Articles courts et autonomes - 5 à 10 minutes par lecture.
            Aucune obligation, juste une invitation à apprendre quand tu en
            as envie.
          </p>
          {articles.length > 0 && (
            <p
              className="text-sm text-gray-500 dark:text-gray-400 italic mt-4 animate-fadeIn tabular-nums"
              style={{ animationDelay: "340ms" }}
            >
              {articles.length}{" "}
              {articles.length > 1 ? "articles disponibles" : "article disponible"}{" "}
              · environ {totalMinutes} minutes de lecture au total
            </p>
          )}
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* ============================================================
            2. FILTRES PAR CATEGORIE
            ============================================================ */}
        {allCategories.length > 0 && (
          <section
            aria-label="Filtres par catégorie"
            className="flex flex-wrap gap-2"
          >
            <Link
              href="/librairie"
              className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                !category
                  ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                  : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:border-accent-500 hover:-translate-y-0.5"
              }`}
            >
              Tous
            </Link>
            {allCategories.map((c) => (
              <Link
                key={c.category}
                href={`/librairie?category=${c.category}`}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                  category === c.category
                    ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:border-accent-500 hover:-translate-y-0.5"
                }`}
              >
                {c.category}
              </Link>
            ))}
          </section>
        )}

        {/* ============================================================
            3. ARTICLES - cards magazine avec gradients soft cycles
            ============================================================ */}
        {articles.length === 0 ? (
          <div className="card text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-900/40">
            <p
              className="text-6xl mb-4 inline-block animate-float"
              aria-hidden="true"
            >
              📖
            </p>
            <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
              {category
                ? `Aucun article dans "${category}" pour le moment`
                : "Les premiers articles arrivent bientôt"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto italic">
              {category
                ? "Reviens nous voir un peu plus tard - ou explore les autres catégories."
                : "On prend le temps d'écrire bien plutôt que beaucoup."}
            </p>
            {category && (
              <Link
                href="/librairie"
                className="btn-secondary mt-6 inline-flex items-center gap-2"
              >
                Voir tous les articles <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((a, idx) => {
              const palette = ARTICLE_PALETTES[idx % ARTICLE_PALETTES.length];
              return (
                <Link
                  key={a.id}
                  href={`/librairie/${a.slug}`}
                  className={`block rounded-3xl border-2 ${palette.ring} bg-gradient-to-br ${palette.bg} p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up h-full relative overflow-hidden`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <article className="flex flex-col h-full relative">
                    <span
                      aria-hidden="true"
                      className="absolute -top-2 -right-4 text-7xl opacity-10 select-none pointer-events-none"
                    >
                      {a.emoji}
                    </span>
                    <div className="text-5xl mb-3 relative" aria-hidden="true">
                      {a.emoji}
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2 leading-tight relative">
                      {a.title}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mb-4 line-clamp-3 leading-relaxed flex-1 relative">
                      {a.description}
                    </p>
                    <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-200/60 dark:border-slate-700/60 tabular-nums relative">
                      <span className="text-gray-500 dark:text-gray-400">
                        ⏱ {a.readTimeMinutes} min
                      </span>
                      <span
                        className={`${palette.badge} px-2 py-0.5 rounded-full font-bold uppercase tracking-widest text-[10px]`}
                      >
                        {a.category}
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        {/* ============================================================
            4. RESPIRATION - citation finale signature
            ============================================================ */}
        <section className="text-center pt-6">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Lire cinq minutes, c'est déjà construire un réflexe. La maîtrise
            cyber se cultive comme un jardin - par petites touches régulières. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}
