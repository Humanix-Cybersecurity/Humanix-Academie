// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /exposition/stats - statistiques communautaires ANONYMISÉES.
// Agrégats non-identifiants uniquement (ExposureCheckMetric). K-anonymat des
// stats : masquées tant que l'effectif total est insuffisant (anti-ré-identif).

import type { Metadata } from "next";
import Link from "next/link";
import { getExposureStats } from "@/lib/exposure/metrics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistiques d'exposition de la communauté | Humanix Académie",
  description:
    "Chiffres agrégés et anonymisés des vérifications d'exposition. Aucune donnée personnelle, jamais.",
  robots: { index: true, follow: true },
};

const TYPE_LABELS: Record<string, string> = {
  password: "Mots de passe testés",
  email_domain: "Domaines email vérifiés",
  phone: "Numéros vérifiés",
};

export default async function ExpositionStatsPage() {
  const stats = await getExposureStats();

  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
          Communauté · anonymisé
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          L'exposition de la communauté en chiffres
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
          Ces chiffres sont des <strong>agrégats anonymisés</strong> : aucun
          email, aucun mot de passe, aucune donnée identifiante n'est conservée.
          Juste des compteurs.
        </p>
      </header>

      {!stats.enoughData ? (
        <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-6 text-center">
          <p className="text-gray-700 dark:text-gray-200 font-semibold">
            Pas encore assez de données
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Pour protéger l'anonymat (k-anonymat des statistiques), on n'affiche
            les ratios qu'à partir d'un volume suffisant de vérifications. Reviens
            bientôt - ou{" "}
            <Link href="/exposition" className="underline text-accent-600 dark:text-accent-300">
              fais ta propre vérification
            </Link>
            .
          </p>
        </section>
      ) : (
        <section aria-label="Statistiques agrégées" className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sur <strong>{stats.totalChecks.toLocaleString("fr-FR")}</strong>{" "}
            vérifications cumulées.
          </p>
          {(["password", "email_domain", "phone"] as const).map((type) => {
            const t = stats.byType[type];
            const sub = t.exposed + t.clean;
            if (sub === 0) return null;
            return (
              <div
                key={type}
                className="rounded-xl border border-gray-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
                  <h2 className="font-bold text-gray-800 dark:text-gray-100">
                    {TYPE_LABELS[type]}
                  </h2>
                  <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
                    <strong className="text-rose-600 dark:text-rose-400">
                      {t.exposedPct}%
                    </strong>{" "}
                    exposés
                  </span>
                </div>
                {/* Barre : RGAA -> role img + label textuel (l'info n'est pas
                    portée par la seule couleur, le % est écrit ci-dessus) */}
                <div
                  className="h-3 rounded-full bg-emerald-200 dark:bg-emerald-900/40 overflow-hidden"
                  role="img"
                  aria-label={`${t.exposedPct}% exposés sur ${sub.toLocaleString("fr-FR")} vérifications`}
                >
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{ width: `${Math.max(2, t.exposedPct)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tabular-nums">
                  {t.exposed.toLocaleString("fr-FR")} exposés ·{" "}
                  {t.clean.toLocaleString("fr-FR")} sains
                </p>
              </div>
            );
          })}
        </section>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-8">
        Méthode : seuls des compteurs par jour, type de check et résultat
        (exposé / sain) sont enregistrés. Granularité jour, aucun horodatage
        fin, aucune IP, aucune cible. Souverain, hébergé en France.
      </p>

      <div className="mt-6">
        <Link href="/exposition" className="btn-primary">
          ← Faire ma vérification
        </Link>
      </div>
    </main>
  );
}
