// SPDX-License-Identifier: AGPL-3.0-or-later
// Page 404 cosy. Next.js l'affiche automatiquement pour toute route non
// trouvee. On evite la 404 par defaut (laide), on propose des chemins de
// rebond clairs vers les pages qui comptent.

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata = {
  title: "Page introuvable - Humanix Académie",
  description:
    "Cette page n'existe pas (ou plus). Voici quelques chemins pour retrouver le tien.",
};

const REBONDS = [
  {
    emoji: "🎯",
    label: "Apprendre",
    description: "Reprendre un module pédagogique",
    href: "/apprendre",
  },
  {
    emoji: "🎮",
    label: "Démo",
    description: "Tester la plateforme en 2 minutes",
    href: "/demo",
  },
  {
    emoji: "💶",
    label: "Tarifs",
    description: "Self-host gratuit ou cloud à partir de 0 €/mois",
    href: "/tarifs",
  },
  {
    emoji: "📜",
    label: "Manifeste",
    description: "Pourquoi Humanix existe",
    href: "/manifeste",
  },
  {
    emoji: "📂",
    label: "Ressources gratuites",
    description: "Cyber-météo, observatoire fuites, audit flash, anecdotes",
    href: "/ressources",
  },
  {
    emoji: "💬",
    label: "Contact",
    description: "Une question, un retour, une idée",
    href: "/contact",
  },
];

export default function NotFound() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Erreur 404 · page introuvable
          </p>
          <h1
            className="font-display text-5xl sm:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Cette page <span className="text-accent-500">n'existe pas</span>.
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Soit elle a déménagé, soit elle n'a jamais existé, soit on est en
            train de la construire. Voici quelques chemins pour retrouver le
            tien.
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REBONDS.map((r, idx) => (
            <Link
              key={r.href}
              href={r.href}
              className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:border-accent-300 dark:hover:border-accent-500 hover:shadow-md hover:-translate-y-0.5 transition-all animate-slide-up flex items-start gap-3"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span
                aria-hidden="true"
                className="text-3xl shrink-0 leading-none"
              >
                {r.emoji}
              </span>
              <div className="min-w-0">
                <p className="font-display font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-1">
                  {r.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {r.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Citation finale */}
        <section className="text-center pt-12 pb-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « L'Internet est un labyrinthe. Mais chaque mauvais embranchement
            est l'occasion d'une vraie rencontre. Bienvenue ici. »
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
