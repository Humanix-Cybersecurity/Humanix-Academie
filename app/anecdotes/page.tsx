// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique des anecdotes : archive + formulaire d'inscription.
// SEO friendly. Server component pour requete Prisma.

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import AnecdoteSubscribeForm from "@/components/AnecdoteSubscribeForm";
import HexBackdrop from "@/components/HexBackdrop";

const ANEC_TITLE = "La Cyber-Anecdote du Lundi | Humanix Académie";
const ANEC_DESC =
  "Chaque lundi, 1 incident cyber réel + 1 leçon + 1 mini-action concrète. La newsletter cybersécurité française pour tous (particuliers, équipes, organisations). Gratuit, désinscription en 1 clic, RGPD-compliant.";

export const metadata: Metadata = {
  title: ANEC_TITLE,
  description: ANEC_DESC,
  alternates: { canonical: "/anecdotes" },
  openGraph: {
    title: ANEC_TITLE,
    description: ANEC_DESC,
    type: "website",
    url: "/anecdotes",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cyber-Anecdote du Lundi — 1 incident, 1 leçon",
    description: ANEC_DESC,
    images: ["/logo-humanix-academie-512.png"],
  },
};

const CATEGORY_BADGES: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  RANSOMWARE: {
    label: "Rançongiciel",
    emoji: "🔒",
    color: "bg-red-100 text-red-700",
  },
  PHISHING: {
    label: "Phishing",
    emoji: "🎣",
    color: "bg-orange-100 text-orange-700",
  },
  FRAUDE: {
    label: "Fraude",
    emoji: "💸",
    color: "bg-purple-100 text-purple-700",
  },
  DATA_LEAK: {
    label: "Fuite",
    emoji: "📤",
    color: "bg-blue-100 text-blue-700",
  },
  SUPPLY_CHAIN: {
    label: "Supply chain",
    emoji: "🔗",
    color: "bg-teal-100 text-teal-700",
  },
  HACKTIVISME: {
    label: "Hacktivisme",
    emoji: "🚩",
    color: "bg-amber-100 text-amber-700",
  },
  IA_ABUS: {
    label: "Abus IA",
    emoji: "🤖",
    color: "bg-violet-100 text-violet-700",
  },
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
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <header
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            📅 Cyber-Anecdote du Lundi · 5 min de lecture
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Une histoire vraie,{" "}
            <span className="text-accent-500">tous les lundis.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Chaque lundi matin, dans ta boite mail :{" "}
            <strong>1 incident cyber reel</strong>,{" "}
            <strong>1 lecon en 3 lignes</strong>, et{" "}
            <strong>1 mini-action</strong> a faire dans la semaine. Sans peur,
            sans hyperbole - juste l'experience qui se transmet.
          </p>
        </header>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-10">

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
                La première anecdote arrive très bientôt. Inscrivez-vous
                ci-dessus pour la recevoir !
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {anecdotes.map((a) => {
                const badge =
                  CATEGORY_BADGES[a.category] ?? CATEGORY_BADGES.AUTRE;
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

        {/* ================================================================
            CITATION FINALE - signature cosy "Hex veille"
            ================================================================ */}
        <section className="text-center pt-10 pb-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Une histoire vraie raconte plus qu'un manuel entier. Chaque
            lundi, on partage celle qui a marque la semaine - pour qu'a la
            tienne, l'histoire ne se repete pas. »
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
