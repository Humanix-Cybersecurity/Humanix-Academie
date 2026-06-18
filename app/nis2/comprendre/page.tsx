// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /nis2/comprendre - NIS2 expliquee en 3 minutes, ton calme et accessible.
// Aucune obligation recitee article par article : on donne les 3 idees a
// retenir et on rassure. La pedagogie detaillee vit dans la saison nis2-pme.

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import RecyfReference from "@/components/nis2/RecyfReference";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Comprendre NIS2 en 3 minutes (sans jargon) | Humanix Académie",
  description:
    "NIS2 expliquée simplement aux dirigeants : ce que c'est, qui est concerné, les 3 idées à retenir et par quoi commencer. Pas de jargon, pas d'alarmisme.",
  alternates: { canonical: "/nis2/comprendre" },
  openGraph: {
    title: "Comprendre NIS2 en 3 minutes",
    description:
      "Ce que c'est, qui est concerné, les 3 idées à retenir. Pour les dirigeants, sans jargon.",
    type: "website",
    locale: "fr_FR",
  },
};

function Idee({
  num,
  titre,
  children,
}: {
  num: number;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex gap-4">
      <span
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-accent-500 text-white font-bold"
        aria-hidden="true"
      >
        {num}
      </span>
      <div>
        <h3 className="font-bold text-primary-600 dark:text-accent-200 mb-1">
          {titre}
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          {children}
        </p>
      </div>
    </div>
  );
}

export default function Nis2ComprendrePage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 sm:pt-16 text-center">
          <Link
            href="/nis2"
            className="text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline mb-3 inline-block"
          >
            ← Espace NIS2
          </Link>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-4">
            Comprendre NIS2 en 3 minutes
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed">
            Pas besoin d'être expert. Voici l'essentiel, en français simple.
          </p>
        </section>
      </HexBackdrop>

      <article className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* C'est quoi */}
        <section>
          <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            C'est quoi, au juste ?
          </h2>
          <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
            NIS2 est une directive européenne qui demande aux organisations
            comptant pour la société et l'économie d'élever leur niveau de
            cybersécurité. En France, sa transposition s'accompagne d'un
            référentiel de mesures publié par l'ANSSI, le Référentiel Cyber
            France (ReCyF). L'idée n'est pas de vous piéger : c'est de faire en
            sorte qu'une attaque sur un hôpital, une usine ou un fournisseur
            critique ne paralyse pas tout un pan d'activité.
          </p>
        </section>

        {/* Qui */}
        <section>
          <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            Qui est concerné ?
          </h2>
          <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-3">
            Principalement les organisations d'une certaine taille dans des
            secteurs jugés critiques (énergie, santé, transport, banque, eau,
            numérique, industrie, et d'autres). Et par effet de ricochet, leurs
            fournisseurs et sous-traitants, à qui ces exigences sont
            répercutées par contrat.
          </p>
          <Link
            href="/nis2/concerne"
            className="inline-flex items-center gap-2 text-accent-600 dark:text-accent-300 font-bold hover:underline underline-offset-4"
          >
            Vérifier si vous êtes concerné en 3 questions →
          </Link>
        </section>

        {/* Les 3 idees */}
        <section>
          <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-4">
            Les 3 idées à retenir
          </h2>
          <div className="space-y-3">
            <Idee num={1} titre="La direction s'implique">
              NIS2 fait de la cybersécurité un sujet de dirigeant, pas seulement
              de service informatique. La direction doit comprendre les risques,
              se former, et porter le sujet. C'est nouveau, et c'est structurant.
            </Idee>
            <Idee num={2} titre="Des mesures de bon sens">
              Sauvegardes fiables, double authentification, mises à jour,
              formation des équipes, gestion des incidents, vigilance sur les
              fournisseurs. Rien d'ésotérique : surtout de l'organisation et des
              réflexes, à mettre en place par étapes.
            </Idee>
            <Idee num={3} titre="Prévenir en cas d'incident grave">
              Si un incident important survient, il faut savoir alerter
              l'autorité (l'ANSSI en France) rapidement : une première alerte
              sous 24 heures, une notification sous 72 heures. Le préparer à
              froid évite de courir le jour J.
            </Idee>
          </div>
        </section>

        {/* Le referentiel officiel : ReCyF */}
        <RecyfReference />

        {/* Et si je ne fais rien */}
        <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-6">
          <h2 className="font-display text-xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            Et si je ne fais rien ?
          </h2>
          <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
            Oui, la directive prévoit une supervision et des sanctions
            possibles, qui peuvent engager la responsabilité de la direction.
            Mais le vrai sujet est ailleurs : une cyberattaque non préparée peut
            arrêter votre activité, abîmer votre réputation et coûter bien plus
            cher qu'une mise à niveau progressive. La bonne nouvelle, c'est qu'on
            avance par petits pas, et que chaque pas vous protège déjà.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-3xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950/40 dark:to-accent-950/40 border-2 border-primary-200 dark:border-primary-900/40 p-6 sm:p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            Prêt à voir où vous en êtes ?
          </h2>
          <p className="text-gray-700 dark:text-gray-200 max-w-xl mx-auto mb-5 leading-relaxed">
            Le diagnostic gratuit vous donne un état des lieux article par
            article et, surtout, un plan d'action pour avancer.
          </p>
          <Link
            href="/diagnostic-nis2"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors"
          >
            <span aria-hidden="true">📋 </span>Faire le diagnostic →
          </Link>
        </section>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic max-w-2xl mx-auto leading-relaxed">
          Page pédagogique de vulgarisation. Elle ne constitue pas un avis
          juridique. NIS2 : directive (UE) 2022/2555. En France, l'ANSSI en
          précise les mesures via le Référentiel Cyber France (ReCyF), un
          document de travail susceptible d'évoluer.
        </p>
      </article>
    </main>
  );
}
