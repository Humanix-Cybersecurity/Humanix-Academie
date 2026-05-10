// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique "Bibliotheque d'experts" - annuaire des contributeurs marketplace.
// Argumentaire commercial : c'est ICI qu'on prouve que la marketplace n'est pas
// genereee en interne mais signee par de vrais professionnels français.

import Link from "next/link";
import { listPublicExperts } from "@/lib/experts";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata = {
  title: "Bibliothèque d'experts | Humanix Académie",
  description:
    "Découvrez les experts cyber français qui contribuent à la marketplace Humanix : RSSI, consultants, gendarmes, formateurs.",
};

export const dynamic = "force-dynamic";

export default async function ExpertsPage() {
  const experts = await listPublicExperts();

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ================================================================
          1. HERO - bibliotheque vivante, signature humaine
          ================================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Bibliotheque vivante · communaute marketplace
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            De vraies <span className="text-accent-500">signatures</span>,
            <br />
            de vraies histoires.
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Pas de catalogue genere en interne. Chaque module porte le nom d'un
            professionnel français qui en assume la signature : RSSI,
            consultants en sécurité, gendarmes cyber, formateurs specialises.
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Manifeste */}
      <div className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-6 sm:p-8 mb-10 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
          Notre engagement editorial
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
          Pourquoi des modules signes ?
        </h2>
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 leading-relaxed">
          La cybersecurite humaine ne se forme pas avec des slides recycles.
          Elle se forme avec des histoires vraies, racontees par des gens qui
          en ont vu passer. En valorisant nos experts contributeurs, on
          construit un catalogue qui grandit avec la communaute française -
          plutot qu'un produit cle-en-main fige. Chaque expert est librement
          contactable. Chaque module rappelle qui l'a ecrit.
        </p>
      </div>

      {/* Liste des experts */}
      {experts.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            La bibliothèque d'experts grandit. Si vous êtes RSSI, consultant,
            gendarme cyber ou formateur,{" "}
            <Link
              href="/contact?sujet=expert"
              className="text-accent-500 underline font-medium"
            >
              écrivez-nous
            </Link>{" "}
            pour rejoindre la communauté.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {experts.map((e) => (
            <Link
              key={e.id}
              href={`/experts/${e.slug}`}
              className="card hover:shadow-lg hover:scale-[1.01] transition-all flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                {e.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.avatarUrl}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border-2 border-accent-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
                    {initials(e.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-primary-500 truncate">
                    {e.name}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {e.headline}
                  </p>
                </div>
              </div>

              {e.organization && (
                <p className="text-xs text-gray-500 mb-2">
                  <span aria-hidden="true">🏢</span> {e.organization}
                </p>
              )}

              {e.expertiseTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {e.expertiseTags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-bold uppercase bg-accent-50 text-accent-700 px-1.5 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-500">
                <span>
                  <strong className="text-primary-500">{e.modulesCount}</strong>{" "}
                  module{e.modulesCount > 1 ? "s" : ""}
                </span>
                {e.totalInstalls > 0 && (
                  <span>
                    <strong className="text-primary-500">
                      {e.totalInstalls}
                    </strong>{" "}
                    installation{e.totalInstalls > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* CTA contributeur */}
      <section className="rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white text-center p-8 sm:p-12 mt-12 shadow-xl relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-12 -right-8 text-[180px] opacity-10 select-none pointer-events-none rotate-12"
        >
          ✍️
        </div>
        <p className="text-xs uppercase tracking-[0.25em] font-bold opacity-80 mb-2 relative">
          Tu es expert cyber ?
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-3 relative leading-tight">
          La bibliotheque a besoin de ta voix.
        </h2>
        <p className="opacity-90 mb-6 max-w-xl mx-auto leading-relaxed relative">
          Publie 1 module dans la marketplace, et fais partie d'une
          bibliotheque vivante consultee par des milliers d'apprenants
          francais - particuliers, equipes, organisations. Visibilite,
          lien LinkedIn, badge auteur sur chaque module installe.
        </p>
        <Link
          href="/contact?sujet=expert"
          className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg inline-block relative"
        >
          Postuler comme contributeur expert
        </Link>
      </section>

      {/* ================================================================
          CITATION FINALE - signature cosy "Hex veille"
          ================================================================ */}
      <section className="text-center pt-10 pb-4">
        <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          « Une cybersecurite qui parle au monde reel s'ecrit avec ceux qui
          le vivent. Pas avec un copywriter qui n'a jamais vu un faux RIB
          atterrir dans un mail un mardi a 17h. »
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
