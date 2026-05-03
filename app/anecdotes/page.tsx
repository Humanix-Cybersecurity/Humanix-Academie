// Page publique des anecdotes : archive + formulaire d'inscription.
// SEO friendly. Server component pour requete Prisma.

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import AnecdoteSubscribeForm from "@/components/AnecdoteSubscribeForm";

export const metadata: Metadata = {
  title: "La Cyber-Anecdote du Lundi | HumaniX Académie",
  description:
    "Chaque lundi, 1 incident cyber réel + 1 leçon + 1 mini-action concrète. La newsletter cybersécurité PME française. Gratuit, désinscription en 1 clic.",
  alternates: { canonical: "/anecdotes" },
};

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

export const dynamic = "force-dynamic";

export default async function AnecdotesArchivePage() {
  const anecdotes = await db.weeklyAnecdote.findMany({
    where: { isActive: true, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  return (
    <div className="bg-gradient-to-b from-primary-500/5 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <header className="text-center mb-12">
          <p className="inline-block text-xs font-bold uppercase tracking-wider text-accent-500 bg-accent-50 dark:bg-accent-900/20 px-3 py-1 rounded-full mb-4">
            📅 La newsletter cyber des PME françaises
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            La Cyber-Anecdote du Lundi
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto">
            Chaque lundi matin, dans votre boîte mail :{" "}
            <strong>1 incident cyber réel</strong>,{" "}
            <strong>1 leçon en 3 lignes</strong>, et{" "}
            <strong>1 mini-action</strong> à faire dans la semaine.
          </p>
        </header>

        {/* Form principal */}
        <section
          className="rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-6 sm:p-10 shadow-xl mb-12"
          aria-labelledby="subscribe-title"
        >
          <div className="max-w-xl mx-auto text-center">
            <h2 id="subscribe-title" className="text-2xl font-bold mb-3">
              Recevez la prochaine anecdote ce lundi
            </h2>
            <p className="opacity-90 mb-6 text-sm">
              Gratuit. Pas de carte bancaire. Désinscription en 1 clic. Hébergé
              en France.
            </p>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-left">
              <AnecdoteSubscribeForm source="anecdotes-page" variant="inline" />
            </div>
          </div>
        </section>

        {/* Archives */}
        <section aria-labelledby="archives-title">
          <h2
            id="archives-title"
            className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-6"
          >
            Anecdotes précédentes
          </h2>

          {anecdotes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-gray-200 dark:border-slate-700">
              <p className="text-gray-600 dark:text-gray-300">
                La première anecdote arrive très bientôt. Inscrivez-vous ci-dessus pour la recevoir !
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {anecdotes.map((a) => {
                const badge = CATEGORY_BADGES[a.category] ?? CATEGORY_BADGES.AUTRE;
                return (
                  <article
                    key={a.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${badge.color}`}
                      >
                        {badge.emoji} {badge.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {a.publishedAt?.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-primary-500 dark:text-accent-300 mb-2">
                      <Link
                        href={`/anecdotes/${a.slug}`}
                        className="hover:underline"
                      >
                        {a.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                      {a.summary}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
