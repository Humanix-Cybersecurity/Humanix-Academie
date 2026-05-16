// SPDX-License-Identifier: AGPL-3.0-or-later
//
// LockedPremiumCard — carte grisee, verrouillee, affichee UNIQUEMENT
// en mode DEMO pour montrer aux visiteurs le contenu disponible dans la
// formule commerciale, sans en exposer le mode d'emploi.
//
// Design :
//   - Emoji + titre en grayscale + opacity-60 pour signaler "non accessible"
//   - Cadenas en overlay haut-droit
//   - Bandeau bas : badge "Formule Standard" + CTA "Découvrir l'offre"
//   - Survol : leger lift + agrandissement du cadenas (incitation visuelle)
//
// Le composant fait le moins de choix possible : c'est l'appelant qui
// fournit titre, emoji, sous-titre (audience / categorie / difficulte).

import Link from "next/link";

type Props = {
  /** Emoji principal de la carte (Saison, article, enquete, module). */
  emoji: string;
  /** Titre de l'item. */
  title: string;
  /** Sous-titre court : ex "Audience : RH", "6 épisodes", "Difficulté ★★★". */
  subtitle?: string;
  /**
   * Libelle du badge de tier en bas. Par defaut : "Formule Pro".
   * Aligne sur la grille officielle (Community / Starter / Pro / Enterprise) :
   * le catalogue premium est inclus des le Starter payant (19 €/mois,
   * 6-15 sieges) et evidemment en Pro (3 €/user/mois) + Enterprise.
   * On peut passer "Formule Enterprise" si l'item est gate plus haut.
   */
  tier?: string;
  /**
   * Cible du CTA. Par defaut /tarifs. Peut etre /rejoindre, /signup, etc.
   */
  ctaHref?: string;
  /** Texte du CTA. Par defaut "Découvrir l'offre". */
  ctaLabel?: string;
};

export default function LockedPremiumCard({
  emoji,
  title,
  subtitle,
  tier = "Formule Pro",
  ctaHref = "/tarifs",
  ctaLabel = "Découvrir l'offre",
}: Props) {
  return (
    <article
      aria-label={`${title} — disponible en ${tier}`}
      className="group relative flex flex-col rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-5 transition-all hover:border-primary-300 dark:hover:border-accent-400 hover:shadow-sm"
    >
      {/* Cadenas overlay haut-droit */}
      <span
        aria-hidden="true"
        className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-lg text-gray-400 dark:text-gray-500 group-hover:scale-110 group-hover:text-primary-500 dark:group-hover:text-accent-300 transition-transform"
        title="Contenu disponible en formule payante"
      >
        🔒
      </span>

      {/* Corps grise */}
      <div className="opacity-60 grayscale group-hover:opacity-80 group-hover:grayscale-[60%] transition-all">
        <div className="text-4xl mb-3" aria-hidden="true">
          {emoji}
        </div>
        <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 leading-snug pr-10">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Bandeau bas : tier + CTA */}
      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold uppercase tracking-wider">
          <span aria-hidden="true">✦</span>
          {tier}
        </span>
        <Link
          href={ctaHref}
          className="text-xs font-semibold text-primary-600 dark:text-accent-300 hover:underline whitespace-nowrap"
        >
          {ctaLabel} →
        </Link>
      </div>
    </article>
  );
}

/**
 * Bandeau d'introduction a placer AVANT la grille d'apercus premium.
 * Explique au visiteur ce qu'il regarde : "ce que vous gagnez en passant
 * en formule Standard".
 */
export function PremiumPreviewIntro({
  totalCount,
  label,
}: {
  totalCount: number;
  /** Ex: "saisons", "articles", "enquêtes", "modules marketplace". */
  label: string;
}) {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/10 p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden="true">
          ✦
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
            +{totalCount} {label} dès la formule payante
          </h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-100/80 leading-relaxed">
            Vous êtes sur une démo publique. Le contenu ci-dessous est verrouillé —
            il s'active dès l'abonnement à partir de{" "}
            <strong className="font-bold">3 €/utilisateur/mois</strong> (Pro), ou{" "}
            <strong className="font-bold">19 €/mois forfait</strong> jusqu'à 15 sièges
            (Starter). Pas de CB : le plan Starter est gratuit à vie jusqu'à 5 sièges.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              href="/tarifs"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
            >
              Voir les tarifs →
            </Link>
            <Link
              href="/rejoindre"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-semibold hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
            >
              Comment commencer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
