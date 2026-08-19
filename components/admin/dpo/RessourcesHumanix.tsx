// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget : ce qu'un client peut consulter, exiger ou transmettre AU SUJET DE
// HUMANIX comme sous-traitant.
//
// Ancien nom : DpoResources. Il melangeait deux familles sans rapport --
// generateur AIPD et modules pedagogiques (= la conformite de l'entreprise
// cliente) d'un cote, engagements Humanix de l'autre. La premiere famille est
// partie dans components/admin/conformite-rgpd/OutilsConformite.tsx.
//
// Regle pour toute future entree ici : si la ressource decrit ce que HUMANIX
// fait des donnees confiees, sa place est ici. Si elle aide le client a
// traiter SES propres donnees, sa place est dans OutilsConformite.

import Link from "next/link";

type Ressource = {
  href: string;
  emoji: string;
  title: string;
  description: string;
};

const RESSOURCES: Ressource[] = [
  {
    href: "/dpo",
    emoji: "🌐",
    title: "Nos 6 promesses DPO",
    description:
      "Page publique, traçable, à transmettre à votre direction ou à votre client",
  },
  {
    href: "/securite#dpa",
    emoji: "📄",
    title: "Contrat de sous-traitance (DPA)",
    description:
      "L'accord article 28 qui encadre ce que nous faisons pour vous",
  },
  {
    href: "/confidentialite",
    emoji: "🔒",
    title: "Politique de confidentialité",
    description:
      "Finalités, bases légales, durées et sous-traitants ultérieurs de Humanix",
  },
  {
    href: "/securite",
    emoji: "🛡",
    title: "Centre de confiance",
    description:
      "Hébergement, chiffrement, mesures techniques et organisationnelles",
  },
  {
    href: "/admin/audit",
    emoji: "📋",
    title: "Journal d'audit complet",
    description: "Toutes les actions tracées sur votre tenant, exportables",
  },
  {
    href: "/admin/api-keys",
    emoji: "🔑",
    title: "Export DPO par API",
    description:
      "Compteurs, file d'effacement et activité au format JSON, pour votre outil GRC",
  },
];

export default function RessourcesHumanix() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {RESSOURCES.map((r) => (
        <Link
          key={r.href}
          href={r.href}
          className="block rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-start gap-3">
            <span className="shrink-0 text-2xl" aria-hidden="true">
              {r.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-primary-500 dark:text-accent-300">
                {r.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {r.description}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
