// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget : les outils qui accompagnent le parcours de mise en conformite.
//
// TOUT ce qui est liste ici porte sur les traitements de L'ENTREPRISE CLIENTE.
// Rien sur les donnees que Humanix detient -- celles-la vivent sous /admin/dpo
// (« Vos donnees chez Humanix »). C'est la raison d'etre de ce composant :
// l'ancien DpoResources melangeait les deux familles dans une meme grille.

import Link from "next/link";

type Outil = {
  href: string;
  emoji: string;
  title: string;
  description: string;
  externe?: boolean;
};

const OUTILS: Outil[] = [
  {
    href: "/admin/conformite-rgpd/aipd",
    emoji: "📝",
    title: "Générateur AIPD",
    description:
      "Trame d'analyse d'impact (article 35) pour un de vos traitements à risque, exportable en Markdown",
  },
  {
    href: "/apprendre/dpo-quotidien/01-aipd",
    emoji: "📚",
    title: "Mener une AIPD",
    description: "Avec le PIA Tool de la CNIL, sans passer par un cabinet",
  },
  {
    href: "/apprendre/dpo-quotidien/02-controle-cnil",
    emoji: "📚",
    title: "Un contrôle CNIL arrive",
    description: "7 réflexes du contrôle inopiné et ce que dit l'article 83",
  },
  {
    href: "/apprendre/dpo-quotidien/03-transferts-hors-ue",
    emoji: "📚",
    title: "Transférer hors UE",
    description: "DPF post-Schrems, analyse de transfert, CCT, BCR",
  },
  {
    href: "/apprendre/dpo-quotidien/04-profilage-decision-auto",
    emoji: "📚",
    title: "Profilage et décision automatisée",
    description: "Article 22 RGPD et le volet « risque élevé » de l'AI Act",
  },
  {
    href: "https://www.cnil.fr/fr/RGPD-par-ou-commencer",
    emoji: "🏛",
    title: "RGPD : par où commencer (CNIL)",
    description:
      "La source officielle. Quand la CNIL fait mieux que nous, on y renvoie",
    externe: true,
  },
];

export default function OutilsConformite() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {OUTILS.map((o) => {
        const contenu = (
          <div className="flex items-start gap-3">
            <span className="shrink-0 text-2xl" aria-hidden="true">
              {o.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-primary-500 dark:text-accent-300">
                {o.title}
                {o.externe && (
                  <span
                    className="ml-1 text-xs font-normal text-gray-400"
                    aria-label="(site externe)"
                  >
                    ↗
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {o.description}
              </p>
            </div>
          </div>
        );
        const classes =
          "block rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900";
        return o.externe ? (
          <a
            key={o.href}
            href={o.href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
          >
            {contenu}
          </a>
        ) : (
          <Link key={o.href} href={o.href} className={classes}>
            {contenu}
          </Link>
        );
      })}
    </div>
  );
}
