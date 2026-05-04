// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique "Bibliotheque d'experts" - annuaire des contributeurs marketplace.
// Argumentaire commercial : c'est ICI qu'on prouve que la marketplace n'est pas
// genereee en interne mais signee par de vrais professionnels francais.

import Link from "next/link";
import { listPublicExperts } from "@/lib/experts";

export const metadata = {
  title: "Bibliothèque d'experts | Humanix Académie",
  description:
    "Découvrez les experts cyber français qui contribuent à la marketplace Humanix : RSSI, consultants, gendarmes, formateurs.",
};

export const dynamic = "force-dynamic";

export default async function ExpertsPage() {
  const experts = await listPublicExperts();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
          Communauté Marketplace
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Une bibliothèque <span className="text-accent-500">vivante</span>,
          <br />
          signée par de vrais experts.
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Pas de catalogue généré en interne. Chaque module porte le nom d'un
          professionnel français qui en assume la signature : RSSI de PME,
          consultants, gendarmes cyber, formateurs spécialisés.
        </p>
      </div>

      {/* Manifeste */}
      <div className="card mb-10 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/30 dark:to-cyan-900/30">
        <h2 className="font-bold text-primary-500 mb-2">
          Pourquoi des modules signés ?
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          La cybersécurité humaine ne se forme pas avec des slides recyclés.
          Elle se forme avec des histoires vraies, racontées par des gens qui en
          ont vu passer. En valorisant nos experts contributeurs, nous
          construisons un catalogue qui grandit avec la communauté française —
          plutôt qu'un produit clé-en-main figé. Chaque expert est librement
          contactable. Chaque module rappelle qui l'a écrit.
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
      <section className="card mt-12 bg-gradient-to-br from-primary-500 to-accent-500 text-white text-center">
        <h2 className="text-2xl font-extrabold mb-3">
          Vous êtes expert cyber ? Rejoignez-nous.
        </h2>
        <p className="opacity-90 mb-6 max-w-xl mx-auto">
          Publiez 1 module dans la marketplace, et faites partie d'une
          bibliothèque vivante consultée par des milliers de PME françaises.
          Visibilité, lien LinkedIn, badge auteur sur chaque module installé.
        </p>
        <Link
          href="/contact?sujet=expert"
          className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg inline-block"
        >
          Postuler comme contributeur expert
        </Link>
      </section>
    </div>
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
