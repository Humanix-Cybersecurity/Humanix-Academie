// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget : grille de ressources DPO (modules + outils) statique.

import Link from "next/link";

type Resource = {
  href: string;
  emoji: string;
  title: string;
  description: string;
};

const RESOURCES: Resource[] = [
  {
    href: "/admin/dpo/aipd",
    emoji: "📝",
    title: "Generateur AIPD",
    description: "Modèle d'analyse d'impact pre-rempli, exportable en Markdown",
  },
  {
    href: "/apprendre/dpo-quotidien/01-aipd",
    emoji: "📚",
    title: "Module AIPD",
    description: "Mener une AIPD avec le PIA Tool CNIL, sans cabinet",
  },
  {
    href: "/apprendre/dpo-quotidien/02-controle-cnil",
    emoji: "📚",
    title: "Module Controle CNIL",
    description: "7 reflexes du controle inopine + sanctions article 83",
  },
  {
    href: "/apprendre/dpo-quotidien/03-transferts-hors-ue",
    emoji: "📚",
    title: "Module Transferts hors UE",
    description: "DPF post-Schrems, TIA, CCT, BCR",
  },
  {
    href: "/apprendre/dpo-quotidien/04-profilage-decision-auto",
    emoji: "📚",
    title: "Module Profilage et IA",
    description: "Article 22 RGPD + AI Act risque eleve",
  },
  {
    href: "/dpo",
    emoji: "🌐",
    title: "Page publique /dpo",
    description: "6 promesses tracables a partager avec la direction",
  },
];

export default function DpoResources() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {RESOURCES.map((r) => (
        <Link
          key={r.href}
          href={r.href}
          className="block rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden="true">
              {r.emoji}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-primary-500 dark:text-accent-300 text-sm leading-tight">
                {r.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                {r.description}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
