// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /exposition - Tier GRATUIT du module Exposition Numérique.
//
// Public, sans compte, ÉPHÉMÈRE : aucun check n'est persisté, zéro PII.
//   - Check mot de passe : 100% côté client (k-anonymity HIBP, le mdp ne
//     quitte jamais le navigateur).
//   - Check email : matching souverain contre l'observatoire des fuites FR,
//     précédé d'une vérification de propriété (OTP, anti-doxxing).
//   - Score d'exposition agrégé + plan de remédiation.
//
// Souveraineté : aucune dépendance cloud US pour la donnée sensible (le seul
// appel HIBP est en k-anon, sans donnée exploitable).

import type { Metadata } from "next";
import Link from "next/link";
import ExpositionChecker from "./ExpositionChecker";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Suis-je exposé ? - Vérifier mon exposition numérique | Humanix Académie",
  description:
    "Vérifie gratuitement si ton mot de passe a fuité (sans jamais l'envoyer) et si ton organisation est concernée par une fuite connue. Souverain, éphémère, zéro donnée conservée.",
  alternates: { canonical: "/exposition" },
  openGraph: {
    title: "Suis-je exposé ? Vérifie ton exposition numérique",
    description:
      "Check mot de passe en k-anonymity + observatoire des fuites souverain. Gratuit, anonyme, rien n'est conservé.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function ExpositionPage() {
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
          Exposition numérique · gratuit
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Suis-je exposé ?
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
          Vérifie si ton mot de passe a déjà fuité et si ton organisation est
          concernée par une fuite connue. <strong>Rien n'est conservé</strong> :
          tout se passe en mémoire, et ton mot de passe ne quitte jamais ton
          navigateur.
        </p>
      </header>

      {/* Bandeau confiance / privacy - RGAA : role complémentaire textuel */}
      <section
        aria-label="Garanties de confidentialité"
        className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 mb-8 text-sm text-emerald-900 dark:text-emerald-100"
      >
        <ul className="space-y-1.5">
          <li>🔒 <strong>Mot de passe en k-anonymity</strong> : seul un fragment d'empreinte est envoyé, jamais le mot de passe.</li>
          <li>🇫🇷 <strong>Observatoire souverain</strong> : fuites hébergées en France, aucune dépendance cloud US.</li>
          <li>🗑️ <strong>Zéro conservation</strong> : aucun email, aucun résultat n'est stocké.</li>
          <li>🛡️ <strong>Anti-doxxing</strong> : on vérifie que c'est bien ton email avant d'afficher quoi que ce soit.</li>
        </ul>
      </section>

      <ExpositionChecker />

      {/* Hub vers la suite */}
      <section className="mt-10 pt-8 border-t border-gray-200 dark:border-slate-700">
        <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
          Aller plus loin
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            href="/apprendre"
            className="card hover:shadow-lg transition-shadow border-gray-200 dark:border-slate-700"
          >
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">
              📚 Saison « Exposition numérique »
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Des micro-modules pour comprendre et réduire ton exposition.
            </p>
          </Link>
          <Link
            href="/observatoire-fuites"
            className="card hover:shadow-lg transition-shadow border-gray-200 dark:border-slate-700"
          >
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">
              📰 Observatoire des fuites
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              La base souveraine des fuites françaises récentes.
            </p>
          </Link>
        </div>
      </section>

      <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-8">
        Outil pédagogique. Le check email s'appuie sur l'observatoire des fuites
        souverain : il indique si l'<strong>organisation</strong> derrière ton
        domaine apparaît dans des fuites publiques connues, pas si ton adresse
        exacte a fuité. Pour un mot de passe, le check est exact.
      </p>
    </main>
  );
}
