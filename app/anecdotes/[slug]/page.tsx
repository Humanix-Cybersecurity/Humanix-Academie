// Page detail d'une anecdote (web view du email).
// SEO friendly. Affichee aussi via le lien "voir sur le web" dans l'email.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import AnecdoteSubscribeForm from "@/components/AnecdoteSubscribeForm";

const CATEGORY_BADGES: Record<string, { label: string; emoji: string; color: string }> = {
  RANSOMWARE: { label: "Rançongiciel", emoji: "🔒", color: "bg-red-100 text-red-700" },
  PHISHING: { label: "Phishing", emoji: "🎣", color: "bg-orange-100 text-orange-700" },
  FRAUDE: { label: "Fraude", emoji: "💸", color: "bg-purple-100 text-purple-700" },
  DATA_LEAK: { label: "Fuite", emoji: "📤", color: "bg-blue-100 text-blue-700" },
  SUPPLY_CHAIN: { label: "Supply chain", emoji: "🔗", color: "bg-teal-100 text-teal-700" },
  HACKTIVISME: { label: "Hacktivisme", emoji: "🚩", color: "bg-amber-100 text-amber-700" },
  IA_ABUS: { label: "Abus IA", emoji: "🤖", color: "bg-violet-100 text-violet-700" },
  AUTRE: { label: "Cyber", emoji: "🛡", color: "bg-gray-100 text-gray-700" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await db.weeklyAnecdote.findUnique({ where: { slug } });
  if (!a) return { title: "Anecdote introuvable" };
  return {
    title: `${a.title} | Cyber-Anecdote du Lundi`,
    description: a.summary.slice(0, 160),
    alternates: { canonical: `/anecdotes/${a.slug}` },
    openGraph: {
      title: a.title,
      description: a.summary.slice(0, 160),
      type: "article",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function AnecdoteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await db.weeklyAnecdote.findUnique({ where: { slug } });
  if (!a || !a.isActive) notFound();

  const badge = CATEGORY_BADGES[a.category] ?? CATEGORY_BADGES.AUTRE;
  const dateFr = a.incidentDate.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-gradient-to-b from-primary-500/5 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-accent-500 font-bold mb-3">
            <Link href="/anecdotes" className="hover:underline">
              ← Toutes les anecdotes
            </Link>
          </p>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`text-xs font-bold px-2 py-1 rounded ${badge.color}`}>
              {badge.emoji} {badge.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Incident du {dateFr}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
            {a.title}
          </h1>
        </header>

        {/* Summary */}
        <section
          className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-5 rounded-xl mb-8"
          aria-labelledby="summary-title"
        >
          <h2
            id="summary-title"
            className="text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-200 mb-2"
          >
            📰 Ce qui s'est passé
          </h2>
          <p className="text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line">
            {a.summary}
          </p>
        </section>

        {/* Lesson */}
        <section className="mb-8" aria-labelledby="lesson-title">
          <h2
            id="lesson-title"
            className="text-xs uppercase tracking-wider font-bold text-accent-500 mb-2"
          >
            💡 La leçon
          </h2>
          <p className="text-gray-800 dark:text-gray-100 leading-relaxed text-lg whitespace-pre-line">
            {a.lesson}
          </p>
        </section>

        {/* Action */}
        <section
          className="bg-accent-50 dark:bg-accent-900/20 border-2 border-accent-500 p-6 rounded-2xl mb-8"
          aria-labelledby="action-title"
        >
          <h2
            id="action-title"
            className="text-xs uppercase tracking-wider font-bold text-accent-700 dark:text-accent-300 mb-2"
          >
            🎯 Votre mini-action de la semaine
          </h2>
          <p className="text-gray-900 dark:text-gray-100 leading-relaxed text-lg whitespace-pre-line">
            {a.miniAction}
          </p>
        </section>

        {/* Source */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-12">
          <strong>Source :</strong>{" "}
          <a
            href={a.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:underline"
          >
            {a.sourceLabel}
          </a>
        </p>

        {/* CTA Subscribe */}
        <aside
          className="rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-6 sm:p-8"
          aria-labelledby="subscribe-cta-title"
        >
          <h2 id="subscribe-cta-title" className="text-xl font-bold mb-2">
            Une anecdote par semaine, pas plus
          </h2>
          <p className="opacity-90 mb-4 text-sm">
            Abonnez-vous gratuitement à la Cyber-Anecdote du Lundi.
          </p>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4">
            <AnecdoteSubscribeForm source="anecdote-detail" variant="inline" />
          </div>
        </aside>
      </article>
    </div>
  );
}
