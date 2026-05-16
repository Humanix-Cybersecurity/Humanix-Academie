// SPDX-License-Identifier: AGPL-3.0-or-later
// Carrousel horizontal scroll-snap pour les saisons sur /apprendre.
//
// Pourquoi ce composant ?
// La grille 2 colonnes empilait verticalement 8-12 saisons (et jusqu'a
// 13 cards premium en DEMO_MODE). La page faisait 1500+ px de haut sur
// desktop — le Mode Enqueteur passait sous le fold. Avec un carrousel :
//   - Une seule rangee de cards (hauteur uniforme via flex stretch)
//   - Swipe natif sur mobile (UX iOS/Android familiere)
//   - Fleches < > sur desktop pour scroller sans trackpad/scrollbar
//   - Drag/wheel + clavier sur desktop
//   - Snap natif CSS (les cards s'alignent toutes seules au relachement)
//
// Pourquoi client component (use client) ?
// On a besoin de :
//   - useRef pour mesurer le scrollLeft / scrollWidth du conteneur
//   - useState pour cacher/disabled les fleches aux extremites
//   - addEventListener('scroll', ...) pour reagir au scroll utilisateur
// Tout le reste (le rendu des cards enfants, les queries) reste server.
// Les children RSC traversent un Client Component sans probleme.
//
// Accessibilite :
//   - role="region" + aria-roledescription="carousel" + aria-label parlant
//   - tabIndex=0 sur le conteneur pour clavier (arrow keys natives)
//   - Boutons fleches : aria-label + disabled aux extremites
//   - Boutons caches sur mobile (md:flex only) car swipe natif suffit
//   - scrollbar native VISIBLE (pas hidden) pour double signaler le scroll

"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // canScrollLeft/Right pilote l'etat disabled des fleches.
  // On part de false a gauche (scroll a 0) et true a droite (suppose qu'il
  // y a plus a scroller — corrige a la 1ere mesure dans useEffect).
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Met a jour la visibilite des fleches selon la position de scroll.
  // 8px de marge pour eviter le "presque mais pas tout a fait" qui
  // garde les fleches actives alors qu'on est visuellement au bout.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 8);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // Si la fenetre redimensionne, le scrollWidth/clientWidth changent.
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  /**
   * Scroll programmatique d'une "page" dans la direction donnee.
   * Une "page" = largeur visible du conteneur - un peu de chevauchement
   * (50px) pour que l'user voit toujours la card de transition. C'est
   * plus naturel qu'un scroll exact d'une card.
   */
  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const page = Math.max(280, el.clientWidth - 50);
    el.scrollBy({ left: dir * page, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-4 sm:mx-0">
      {/* Gradient fade a droite : indique visuellement "y'a plus a voir".
          Pointer-events-none pour ne pas bloquer les clics sur les cards. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white via-white/80 dark:from-slate-950 dark:via-slate-950/80 to-transparent transition-opacity duration-300 ${
          canScrollRight ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Gradient fade a gauche : apparait uniquement quand on a deja
          scrolle un peu, pour indiquer qu'on peut revenir en arriere. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white via-white/80 dark:from-slate-950 dark:via-slate-950/80 to-transparent transition-opacity duration-300 ${
          canScrollLeft ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Fleches de navigation desktop. Cachees sur mobile (md:flex) car
          le swipe natif est plus naturel sur ecran tactile. */}
      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        disabled={!canScrollLeft}
        aria-label="Saisons précédentes"
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 text-primary-500 dark:text-accent-300 text-xl font-bold transition-all hover:scale-110 hover:bg-primary-50 dark:hover:bg-slate-700 disabled:opacity-0 disabled:pointer-events-none disabled:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        onClick={() => scrollByPage(1)}
        disabled={!canScrollRight}
        aria-label="Saisons suivantes"
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 text-primary-500 dark:text-accent-300 text-xl font-bold transition-all hover:scale-110 hover:bg-primary-50 dark:hover:bg-slate-700 disabled:opacity-0 disabled:pointer-events-none disabled:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <span aria-hidden="true">›</span>
      </button>

      <div
        ref={scrollerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
        className="overflow-x-auto overflow-y-visible snap-x snap-mandatory scroll-smooth py-2 pb-4 px-4 sm:px-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.gray.300)_transparent] dark:[scrollbar-color:theme(colors.slate.700)_transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded-2xl"
      >
        {/* items-stretch + [&>article]:h-full sur le <li> forcent toutes
            les cards a avoir la meme hauteur (la plus haute du lot).
            Sans ca, effet "escalier" du au contenu de longueur variable. */}
        <ul className="flex items-stretch gap-4 sm:gap-5 w-max">
          {Children.map(children, (child, i) => (
            <li
              key={i}
              // Largeur : 82vw mobile (effet "peek" sur la card suivante,
              // typique des carrousels iOS) + 320px desktop.
              // [&>article]:h-full → l'<article> enfant remplit la hauteur
              //   du <li>, qui prend la hauteur uniforme du <ul> stretch.
              // [&>article]:flex [&>article]:flex-col → garantit que les
              //   cards se comportent en flex column pour pousser le CTA
              //   en bas via mt-auto cote SaisonCard / LockedPremiumCard.
              className="snap-start shrink-0 w-[82vw] max-w-[320px] sm:w-[320px] [&>article]:h-full [&>article]:flex [&>article]:flex-col"
            >
              {child}
            </li>
          ))}
        </ul>
      </div>
      {showHint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic text-center sm:text-left sm:ml-1 select-none md:hidden">
          <span aria-hidden="true">← </span>
          Glisse pour explorer
          <span aria-hidden="true"> →</span>
        </p>
      )}
    </div>
  );
}
