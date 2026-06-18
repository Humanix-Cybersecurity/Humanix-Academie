// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Le parcours NIS2 en 6 etapes (composant serveur, pur affichage).
// Rendu sous forme de liste ordonnee pour l'accessibilite : un lecteur
// d'ecran annonce "etape 1 sur 6", etc. Les 3 premieres etapes sont
// actionnables (liens), les 3 dernieres decrivent ce qu'on obtient.

import Link from "next/link";

type Step = {
  emoji: string;
  titre: string;
  question: string;
  href?: string;
  /** Etape mise en avant (le coeur de l'accompagnement) */
  highlight?: boolean;
};

const STEPS: Step[] = [
  {
    emoji: "💡",
    titre: "Comprendre",
    question: "C'est quoi NIS2, vraiment ?",
    href: "/nis2/comprendre",
  },
  {
    emoji: "🧭",
    titre: "Suis-je concerné ?",
    question: "3 questions, une réponse claire.",
    href: "/nis2/concerne",
  },
  {
    emoji: "📋",
    titre: "Où j'en suis ?",
    question: "Le diagnostic et vos 3 priorités.",
    href: "/diagnostic-nis2",
  },
  {
    emoji: "🗺️",
    titre: "Mon plan",
    question: "Personnalisé, pas une liste à cocher.",
    highlight: true,
  },
  {
    emoji: "🎓",
    titre: "Je me forme",
    question: "La formation, c'est le levier.",
  },
  {
    emoji: "📄",
    titre: "Je documente",
    question: "Votre preuve de diligence, prête.",
  },
];

export default function ParcoursSteps() {
  return (
    <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 list-none p-0 m-0">
      {STEPS.map((s, i) => {
        const inner = (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl leading-none" aria-hidden="true">
                {s.emoji}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  s.highlight
                    ? "text-accent-600 dark:text-accent-300"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                Étape {i + 1}
                {s.highlight ? " · le cœur" : ""}
              </span>
            </div>
            <p
              className={`font-bold ${
                s.highlight
                  ? "text-accent-700 dark:text-accent-200"
                  : "text-primary-600 dark:text-accent-200"
              }`}
            >
              {s.titre}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
              {s.question}
            </p>
            {s.href && (
              <span
                aria-hidden="true"
                className="text-sm text-accent-600 dark:text-accent-300 font-medium mt-2 inline-block"
              >
                Commencer →
              </span>
            )}
          </>
        );

        const cls = `block h-full rounded-2xl border-2 p-4 transition-colors ${
          s.highlight
            ? "border-accent-300 dark:border-accent-700 bg-accent-50/60 dark:bg-accent-950/30"
            : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        } ${s.href ? "hover:border-accent-400 dark:hover:border-accent-600" : ""}`;

        return (
          <li key={s.titre}>
            {s.href ? (
              <Link href={s.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
