// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /nis2 - l'espace NIS2, point d'entree public pour les dirigeants.
//
// Esprit : on ne propose pas un outil de cases a cocher (type GRC). On
// accompagne un chef d'entreprise qui se pose des questions : comprendre,
// savoir s'il est concerne, ou il en est, et par quoi commencer - grace a
// la formation. Le parcours enchaine ces etapes.
//
// Posture : on accompagne VERS la conformite, on ne la garantit pas, on ne
// donne pas de conseil juridique. C'est dit explicitement.

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import ParcoursSteps from "@/components/nis2/ParcoursSteps";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Espace NIS2 pour dirigeants - comprendre et se mettre en conformité | Humanix Académie",
  description:
    "NIS2 expliqué en clair pour les dirigeants : suis-je concerné, où j'en suis, et un plan d'action personnalisé pour avancer grâce à la formation. Sans jargon, sans cases à cocher.",
  alternates: { canonical: "/nis2" },
  openGraph: {
    title: "NIS2, en clair pour les dirigeants",
    description:
      "Comprendre, savoir où vous en êtes, et avancer pas à pas vers la conformité NIS2. Diagnostic gratuit + plan personnalisé relié à la formation.",
    type: "website",
    locale: "fr_FR",
  },
};

function ValueCard({
  emoji,
  titre,
  children,
}: {
  emoji: string;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="text-3xl mb-2" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-bold text-primary-600 dark:text-accent-200 mb-1">
        {titre}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        {children}
      </p>
    </div>
  );
}

export default function Nis2EspacePage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* HERO */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-4xl mx-auto px-4 pt-12 pb-10 sm:pt-16 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Espace NIS2
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-4">
            NIS2, en clair pour les dirigeants
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed mb-6">
            Comprendre, savoir où vous en êtes, et avancer pas à pas. Sans
            jargon, sans cases à cocher : un accompagnement qui parle votre
            langage et s'appuie sur la formation de vos équipes.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/diagnostic-nis2"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors"
            >
              <span aria-hidden="true">📋 </span>Faire le diagnostic (10 min)
            </Link>
            <Link
              href="/nis2/comprendre"
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              <span aria-hidden="true">💡 </span>Comprendre en 3 min
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-xs mt-6">
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-bold">
              <span aria-hidden="true">🇫🇷 </span>Aligné ReCyF (ANSSI)
            </span>
            <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 font-bold">
              <span aria-hidden="true">🔓 </span>Gratuit, sans inscription
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold">
              <span aria-hidden="true">🤝 </span>On accompagne, on ne juge pas
            </span>
          </div>
        </section>
      </HexBackdrop>

      {/* PARCOURS */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-500 dark:text-accent-300 mb-2">
            Votre parcours, étape par étape
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Chaque étape répond à une vraie question que vous vous posez. Vous
            avancez à votre rythme, et rien n'est jamais perdu.
          </p>
        </div>
        <ParcoursSteps />
      </section>

      {/* Reference ReCyF */}
      <section className="max-w-4xl mx-auto px-4 pb-4">
        <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-900/40 bg-primary-50/50 dark:bg-primary-950/20 p-5 text-center">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            <span aria-hidden="true">🇫🇷 </span>En France, le référentiel
            officiel, c&apos;est le{" "}
            <strong>Référentiel Cyber France (ReCyF)</strong> de l&apos;ANSSI :
            20 objectifs de sécurité. Notre diagnostic suit cette structure pour
            parler le même langage que l&apos;autorité.{" "}
            <Link
              href="/nis2/comprendre"
              className="text-accent-600 dark:text-accent-300 underline hover:no-underline font-medium"
            >
              Comprendre ReCyF →
            </Link>
          </p>
        </div>
      </section>

      {/* L'ESPRIT - anti cases a cocher */}
      <section className="bg-gray-50 dark:bg-slate-900/40 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-500 dark:text-accent-300 mb-2">
              Un accompagnement, pas une usine à cases
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Un outil de conformité vous dit ce qui vous manque. Nous, on vous
              aide à le combler.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <ValueCard emoji="🗣️" titre="On parle votre langage">
              Pas d'acronymes ni d'articles récités. On explique ce que la
              directive attend et, surtout, pourquoi ça compte pour votre
              entreprise.
            </ValueCard>
            <ValueCard emoji="🗺️" titre="Un plan, pas une liste">
              Après le diagnostic, vous recevez un plan personnalisé : un levier
              à activer cette semaine, le chantier de fond, et l'ordre des
              priorités.
            </ValueCard>
            <ValueCard emoji="🎓" titre="La formation comme levier">
              La plupart des exigences se règlent en formant les équipes. C'est
              notre métier, et ça fait monter votre niveau tout seul.
            </ValueCard>
          </div>
          <div className="mt-6 rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 p-5 flex items-start gap-3">
            <span aria-hidden="true" className="text-2xl leading-none">
              🤝
            </span>
            <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
              <span className="font-bold">Et on reste honnêtes.</span> Certaines
              mesures sont techniques (sauvegardes, double authentification,
              correctifs) et sortent de notre périmètre. Sur celles-là, on ne
              fait pas semblant : on vous dit précisément quoi demander à votre
              prestataire informatique.
            </p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-4xl mx-auto px-4 py-14">
        <div className="rounded-3xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950/40 dark:to-accent-950/40 border-2 border-primary-200 dark:border-primary-900/40 p-6 sm:p-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            Par où commencer ?
          </h2>
          <p className="text-gray-700 dark:text-gray-200 max-w-xl mx-auto mb-6 leading-relaxed">
            Si vous ne savez même pas si NIS2 vous concerne, commencez par là. Si
            vous le savez déjà, lancez le diagnostic et repartez avec votre plan.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/nis2/concerne"
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              <span aria-hidden="true">🧭 </span>Suis-je concerné ?
            </Link>
            <Link
              href="/diagnostic-nis2"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors"
            >
              <span aria-hidden="true">📋 </span>Faire le diagnostic →
            </Link>
          </div>
        </div>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic mt-8 max-w-2xl mx-auto leading-relaxed">
          Cet espace est un outil pédagogique et d'auto-évaluation. Il vous
          accompagne vers la conformité NIS2 mais ne la garantit pas, et ne
          remplace ni un conseil juridique ni un audit formel par un prestataire
          qualifié (PASSI). NIS2 : directive (UE) 2022/2555 ; en France, l'ANSSI
          en précise les mesures via le Référentiel Cyber France (ReCyF), un
          document de travail susceptible d'évoluer.
        </p>
      </section>
    </main>
  );
}
