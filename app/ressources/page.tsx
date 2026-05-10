// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /ressources - hub des ressources cyber gratuites
//
// Refonte juin 2026 (Sprint 3a) : avant, plusieurs pages publiques
// (/anecdotes /cyber-meteo /observatoire-fuites /audit-flash /librairie)
// vivaient cote a cote dans le menu Solutions sans cohesion. Cette page
// les regroupe sous un meme parapluie editorial : "tout ce qu'on offre
// gratuitement au-dela du produit lui-meme".
//
// Strategie : on garde les pages individuelles (SEO precieux pour chacune)
// mais on cree ce hub pour offrir un point d'entree unique. Les visiteurs
// qui ne connaissent pas une ressource specifique peuvent decouvrir
// l'ecosysteme.
//
// Volontairement compact (~150 lignes) : 4-6 cards, 1 hero, 1 CTA.
// Pas de manifeste, pas de chiffres, juste une porte d'entree claire.
// =============================================================================

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata: Metadata = {
  title: "Ressources cyber gratuites — Humanix Académie",
  description:
    "Cyber-météo, observatoire des fuites, librairie, anecdotes hebdo, audit flash : nos ressources gratuites pour comprendre la cybersécurité au quotidien.",
  alternates: { canonical: "/ressources" },
};

type Resource = {
  href: string;
  title: string;
  emoji: string;
  description: string;
  badge?: string; // ex: "Hebdo", "Temps réel", "Gratuit"
};

const RESOURCES: Resource[] = [
  {
    href: "/cyber-meteo",
    title: "Cyber-météo France",
    emoji: "🌦️",
    description:
      "Niveau d'alerte cyber national, mis à jour toutes les heures depuis le flux CERT-FR officiel.",
    badge: "Temps réel",
  },
  {
    href: "/observatoire-fuites",
    title: "Observatoire des fuites",
    emoji: "🔍",
    description:
      "Cartographie publique des fuites de données françaises de l'année. Sources institutionnelles uniquement.",
    badge: "Public",
  },
  {
    href: "/anecdotes",
    title: "Cyber-Anecdote du Lundi",
    emoji: "📅",
    description:
      "Chaque lundi : 1 incident réel + 1 leçon + 1 action concrète. Newsletter gratuite, désinscription en 1 clic.",
    badge: "Hebdo",
  },
  {
    href: "/audit-flash",
    title: "Audit flash cyber",
    emoji: "⚡",
    description:
      "Quiz de 5 minutes pour avoir une photo claire de la maturité cyber de votre organisation. Sans inscription.",
    badge: "5 min",
  },
  {
    href: "/librairie",
    title: "Librairie",
    emoji: "📚",
    description:
      "Articles, guides et fiches pratiques. Sources françaises, langage clair, sans alarmisme.",
    badge: "Lecture",
  },
  {
    href: "/urgence-cyber",
    title: "Urgence cyber",
    emoji: "🚨",
    description:
      "Hub d'incident : que faire dans les 60 premières minutes. Numéros utiles, étapes critiques.",
    badge: "Crise",
  },
];

export default function RessourcesPage() {
  return (
    <HexBackdrop>
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 relative">
        {/* Hero */}
        <header className="max-w-2xl mb-12">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-2">
            Hub
          </p>
          <h1 className="font-display font-extrabold text-primary-500 dark:text-accent-300 text-4xl sm:text-5xl leading-tight mb-4">
            Ressources cyber gratuites
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Tout ce qu'on partage librement, au-delà du produit : cyber-météo,
            observatoire des fuites, audit flash, anecdotes du lundi… Aucune
            inscription requise pour découvrir.
          </p>
        </header>

        {/* Grille ressources */}
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 list-none">
          {RESOURCES.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="block group h-full rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:border-accent-500 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl shrink-0" aria-hidden="true">
                    {r.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display font-bold text-primary-500 group-hover:text-accent-500 dark:text-accent-300 transition truncate">
                      {r.title}
                    </h2>
                    {r.badge && (
                      <span className="inline-block text-[10px] uppercase tracking-widest font-bold text-accent-500 dark:text-accent-300 bg-accent-50 dark:bg-accent-900/20 px-1.5 py-0.5 rounded mt-1">
                        {r.badge}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {r.description}
                </p>
                <p className="mt-4 text-sm font-medium text-accent-500 group-hover:translate-x-0.5 transition-transform">
                  Découvrir →
                </p>
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA secondaire vers le manifeste */}
        <aside className="mt-12 rounded-2xl border-2 border-accent-200/40 dark:border-accent-900/40 bg-accent-50/40 dark:bg-accent-900/15 p-6 max-w-2xl">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-primary-500 dark:text-accent-300">
              Pourquoi tout ce gratuit&nbsp;?
            </strong>{" "}
            Parce qu'on pense que la cyber utile commence par ce qu'on
            comprend. Le produit payant existe pour les organisations qui
            veulent industrialiser ; les ressources publiques sont pour
            tout le monde.
          </p>
          <Link
            href="/manifeste"
            className="inline-block mt-3 text-sm font-bold text-accent-700 dark:text-accent-300 hover:underline"
          >
            Lire notre manifeste →
          </Link>
        </aside>
      </main>
    </HexBackdrop>
  );
}
