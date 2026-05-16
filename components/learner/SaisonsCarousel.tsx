// SPDX-License-Identifier: AGPL-3.0-or-later
// Carrousel horizontal scroll-snap pour les saisons sur /apprendre.
//
// Pourquoi ce composant ?
// La grille 2 colonnes empilait verticalement jusqu'a 8-12 saisons (et
// jusqu'a 13 cards premium en DEMO_MODE). La page faisait 1500+ px de
// haut sur desktop — l'utilisateur loupait le Mode Enqueteur en bas et
// n'avait pas l'impression que la page "finissait". Avec un carrousel :
//   - Une seule rangee de cards (hauteur fixe ~380 px)
//   - Swipe natif sur mobile (UX iOS/Android familiere)
//   - Drag/wheel + clavier sur desktop
//   - Snap natif CSS (les cards s'alignent toutes seules au relachement)
//
// Server component (zero state, zero hook). On profite de
// `scroll-snap-type` pur CSS qui marche partout sauf IE11.
//
// Accessibilite :
//   - role="region" + aria-roledescription="carousel" + aria-label parlant
//   - tabIndex=0 sur le conteneur pour que le clavier puisse focuser et
//     scroller avec arrow keys
//   - scrollbar native VISIBLE (pas hidden) pour signaler le scroll possible
//   - Les liens internes des cards restent Tab-naviguables ; quand on
//     focus un lien hors viewport, le conteneur scrolle automatiquement
//     grace au comportement natif scroll-into-view.

import { Children, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Label aria-label du carrousel. */
  ariaLabel: string;
  /**
   * Affiche l'indication "← Glisse pour explorer →" en dessous.
   * Default true. Utile sur mobile, redondant si on a deja un titre clair.
   */
  showHint?: boolean;
};

export default function SaisonsCarousel({
  children,
  ariaLabel,
  showHint = true,
}: Props) {
  return (
    <div className="relative -mx-4 sm:mx-0">
      {/* Gradient fade a droite : indique visuellement "y'a plus a voir".
          On ne met PAS de fade a gauche par defaut (visuellement plus
          calme), il apparaitra naturellement via la scrollbar quand
          l'user a deja scrolle. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white via-white/80 dark:from-slate-950 dark:via-slate-950/80 to-transparent"
      />
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
        className="overflow-x-auto overflow-y-visible snap-x snap-mandatory scroll-smooth py-2 pb-4 px-4 sm:px-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.gray.300)_transparent] dark:[scrollbar-color:theme(colors.slate.700)_transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded-2xl"
      >
        {/* items-stretch + [&>*]:h-full sur le <li> forcent toutes les
            cards a avoir la meme hauteur (la plus haute du lot). Sans ca,
            on a un effet "escalier" car les cards ont des contenus de
            longueur variable (titres / descriptions / badges). */}
        <ul className="flex items-stretch gap-4 sm:gap-5 w-max">
          {Children.map(children, (child, i) => (
            <li
              key={i}
              // Largeur : 82vw mobile (effet "peek" sur la card suivante,
              // typique des carrousels iOS) + 320px desktop pour garder
              // la densite visuelle.
              // [&>*]:h-full → l'<article> enfant remplit la hauteur du
              //   <li>, qui prend la hauteur uniforme du <ul> stretch.
              // [&>article]:flex [&>article]:flex-col → assure que les
              //   cards qui ne sont pas deja flex se comportent comme
              //   tel pour que le contenu interne puisse pousser le CTA
              //   en bas via mt-auto.
              className="snap-start shrink-0 w-[82vw] max-w-[320px] sm:w-[320px] [&>article]:h-full [&>article]:flex [&>article]:flex-col"
            >
              {child}
            </li>
          ))}
        </ul>
      </div>
      {showHint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic text-center sm:text-left sm:ml-1 select-none">
          <span aria-hidden="true">← </span>
          Glisse pour explorer
          <span aria-hidden="true"> →</span>
        </p>
      )}
    </div>
  );
}
