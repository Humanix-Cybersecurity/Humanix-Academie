// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /famille/enfants - « L'école de Hex » : hub des mondes enfants (9-12 ans).
//
// Public, AUCUN compte, AUCUNE donnée collectée (enfants = mineurs). La
// progression (étoiles) vit en localStorage, jamais en base. Contenu gratuit
// (AGPL), défini dans lib/enfants/parcours.ts.
// =============================================================================

import type { Metadata } from "next";
import Link from "next/link";
import { MONDES } from "@/lib/enfants/parcours";
import { COULEURS } from "@/lib/enfants/theme";
import MondeBadge from "@/components/enfants/MondeBadge";
import ProgressGlobal from "@/components/enfants/ProgressGlobal";

export const metadata: Metadata = {
  title: "L'école de Hex - la cybersécurité pour les 9-12 ans | Humanix",
  description:
    "Des petites BD et des mini-jeux gratuits pour apprendre aux enfants (9-12 ans) à repérer les pièges d'internet. Sans compte, sans publicité, aucune donnée enregistrée.",
  alternates: { canonical: "/famille/enfants" },
};

export default function EcoleDeHexPage() {
  return (
    <main id="main-content" className="bg-gradient-to-b from-sky-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        {/* Hero */}
        <header className="text-center mb-10">
          <div className="text-7xl mb-3" aria-hidden="true">
            🦊
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
            L&apos;école de Hex
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-200 max-w-xl mx-auto">
            Apprends à te protéger sur internet en t&apos;amusant. Des petites
            histoires et des jeux pour devenir un vrai détective du Net 🕵️
          </p>
          <p className="mt-3 inline-block rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm font-bold px-4 py-1.5">
            Pour les 9-12 ans · gratuit · rien à installer
          </p>
          <ProgressGlobal
            slugs={MONDES.filter((m) => m.disponible).map((m) => m.slug)}
          />
        </header>

        {/* Grille des mondes */}
        <div className="grid sm:grid-cols-2 gap-5">
          {MONDES.map((m) => {
            const c = COULEURS[m.couleur];
            const total = m.activites.length;
            if (!m.disponible) {
              return (
                <div
                  key={m.slug}
                  className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/60 p-6 text-center opacity-80"
                >
                  <div className="text-5xl mb-2 grayscale" aria-hidden="true">
                    {m.emoji}
                  </div>
                  <h2 className="font-display text-xl font-extrabold text-gray-500 dark:text-gray-400">
                    {m.titre}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">{m.sousTitre}</p>
                  <span className="mt-3 inline-block rounded-full bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-xs font-bold px-3 py-1">
                    Bientôt ✨
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={m.slug}
                href={`/famille/enfants/${m.slug}`}
                className="group rounded-3xl border-2 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <div
                  className={`bg-gradient-to-br ${c.grad} p-6 text-center`}
                >
                  <div className="text-6xl" aria-hidden="true">
                    {m.emoji}
                  </div>
                </div>
                <div className="p-5 text-center">
                  <h2 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">
                    {m.titre}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {m.sousTitre}
                  </p>
                  <div className="mt-3 min-h-[1.5rem]">
                    <MondeBadge slug={m.slug} total={total} />
                  </div>
                  <span
                    className={`mt-3 inline-block rounded-full ${c.btn} text-white text-sm font-bold px-5 py-2`}
                  >
                    Jouer ▶
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Note pour les parents */}
        <section className="mt-12 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-5 text-sm text-gray-600 dark:text-gray-300">
          <p className="font-bold text-gray-800 dark:text-gray-100 mb-1">
            👪 Un mot pour les parents
          </p>
          <p>
            « L&apos;école de Hex » est <strong>gratuite</strong> et conçue pour
            être jouée seul·e ou avec vous. <strong>Aucun compte</strong> n&apos;est
            demandé et <strong>aucune donnée n&apos;est enregistrée</strong> : la
            progression reste sur l&apos;appareil. Pas de publicité, pas de lien
            sortant pendant les jeux.{" "}
            <Link href="/famille" className="underline">
              Découvrir l&apos;espace Cyber Famille →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
