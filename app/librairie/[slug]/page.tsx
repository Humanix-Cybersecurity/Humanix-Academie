// SPDX-License-Identifier: AGPL-3.0-or-later
// Lecture d'un article librairie — PAGE PUBLIQUE (SEO).
//
// La librairie est la vitrine marketing/SEO de Humanix : aucun gate
// d'authentification, aucun gate DEMO_MODE. Tous les articles publies
// sont accessibles aux visiteurs anonymes et aux crawlers (Google,
// Bing, Qwant, Ecosia).
//
// SEO :
//   - generateMetadata : title + description + OpenGraph + canonical
//   - JSON-LD Article : rich snippet schema.org (auteur, date, lecture)
//   - viewCount incremente en fire-and-forget (force-dynamic conserve)

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import MarkdownView from "@/components/MarkdownView";
import TTSButton from "@/components/TTSButton";
import ShareArticleButton from "@/components/ShareArticleButton";
import { markdownToPlainText } from "@/lib/markdown";

export const dynamic = "force-dynamic";

const PROD_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await db.libraryArticle
    .findUnique({
      where: { slug },
      select: {
        title: true,
        description: true,
        emoji: true,
        category: true,
        authorName: true,
        readTimeMinutes: true,
        isPublished: true,
      },
    })
    .catch(() => null);

  if (!article || !article.isPublished) {
    return {
      title: "Article introuvable — Librairie Humanix",
    };
  }

  const title = `${article.title} | Librairie Humanix`;
  const description = article.description;
  const url = `${PROD_URL}/librairie/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: `/librairie/${slug}` },
    openGraph: {
      title: article.title,
      description,
      url,
      type: "article",
      locale: "fr_FR",
      siteName: "Humanix Académie",
      authors: article.authorName ? [article.authorName] : undefined,
      tags: [article.category],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
  };
}

export default async function ArticleReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await db.libraryArticle.findUnique({ where: { slug } });
  if (!article || !article.isPublished) return notFound();

  // Pas de gate auth — la librairie est publique (vitrine SEO).

  // Increment view count (fire-and-forget)
  db.libraryArticle
    .update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch((error) => {
      console.error("Failed to increment library article view count", {
        articleId: article.id,
        slug: article.slug,
        error,
      });
    });

  const plainText = markdownToPlainText(article.body);

  // Articles "connexes" : même catégorie
  const related = await db.libraryArticle.findMany({
    where: {
      isPublished: true,
      category: article.category,
      id: { not: article.id },
    },
    take: 3,
  });

  // JSON-LD Article schema.org pour rich snippets Google.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: {
      "@type": "Organization",
      name: article.authorName ?? "Humanix Académie",
    },
    publisher: {
      "@type": "Organization",
      name: "Humanix-Cybersecurity",
      url: PROD_URL,
    },
    datePublished: article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${PROD_URL}/librairie/${article.slug}`,
    },
    timeRequired: `PT${article.readTimeMinutes}M`,
    inLanguage: "fr-FR",
    articleSection: article.category,
    isAccessibleForFree: true,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fadeIn">
      {/* JSON-LD schema.org pour rich snippets Google */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/librairie"
        className="text-sm text-gray-500 hover:text-primary-500 mb-4 inline-block"
      >
        ← Retour à la librairie
      </Link>

      <article className="card">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
          <span className="text-6xl">{article.emoji}</span>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-500">
              {article.title}
            </h1>
            <p className="text-gray-600 mt-2">{article.description}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
              <span>⏱ {article.readTimeMinutes} min de lecture</span>
              <span>·</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                {article.category}
              </span>
              {article.authorName && (
                <>
                  <span>·</span>
                  <span>par {article.authorName}</span>
                </>
              )}
            </div>
            <div className="mt-3">
              <TTSButton text={plainText} label="Écouter l'article" />
            </div>
          </div>
        </div>

        <MarkdownView content={article.body} />

        <ShareArticleButton
          slug={article.slug}
          title={article.title}
          description={article.description}
        />
      </article>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-primary-500 mb-4">
            📚 À lire ensuite
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/librairie/${r.slug}`}
                className="card hover:scale-[1.02] hover:shadow-md transition"
              >
                <p className="text-3xl mb-2">{r.emoji}</p>
                <h3 className="font-bold text-primary-500 text-sm mb-1">
                  {r.title}
                </h3>
                <p className="text-xs text-gray-500">
                  ⏱ {r.readTimeMinutes} min
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA conversion : visiteurs anonymes ↔ inscription tenant */}
      <section className="mt-10 rounded-2xl border-2 border-accent-200 dark:border-accent-900/40 bg-gradient-to-br from-accent-50 to-white dark:from-accent-950/30 dark:to-slate-900 p-6 text-center">
        <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
          Tu veux aller plus loin que la lecture ?
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 max-w-xl mx-auto mb-4">
          La plateforme Humanix Académie propose en plus des saisons interactives,
          un mode Enquêteur, du suivi d'équipe, et un dashboard pour ton RSSI.
          Démarrage gratuit, 5 sièges, sans carte bancaire.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link
            href="/rejoindre"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
          >
            Comment commencer →
          </Link>
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Voir les tarifs
          </Link>
        </div>
      </section>
    </div>
  );
}
