// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Carousel des paliers tarifaires pour /tarifs.
//
// COMPORTEMENT :
//   - 4 cards alignees sur une même ligne (CE, Starter, Pro, Enterprise)
//   - La card "selectionnee" est au centre, en pleine opacite, leger ring
//   - Les cards adjacentes (distance 1) sont transparentes (opacity 0.45)
//   - Les cards eloignees (distance 2+) sont quasi invisibles (opacity 0.1)
//     et visuellement reservees aux fleches gauche/droite
//   - Click sur une card transparente -> elle devient la centrale
//   - Click sur fleche gauche/droite -> decrement/increment de l'index
//   - Au demarrage : Starter selectionne (index 1 dans l'ordre canonique
//     CE / Starter / Pro / Enterprise)
//
// ACCESSIBILITE :
//   - <ul role="listbox"> avec aria-activedescendant pour le tier focused
//   - Boutons fleches avec aria-label
//   - Touche Left/Right keyboard pour naviguer
//
// LAYOUT :
//   - Mobile (< md) : stack vertical normal (le carousel n'a pas de sens
//     sur petit ecran). On affiche les 4 cards les unes sous les autres,
//     avec Starter mise en avant via un ring colore.
//   - >= md : carousel horizontal avec translation CSS.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PricingTier } from "@/lib/pricing";

type BillingCycle = "monthly" | "annual";

export default function PricingCarousel({
  tiers,
  billing,
}: {
  tiers: PricingTier[];
  billing: BillingCycle;
}) {
  // Index par defaut = Starter. On le derive du tier id pour rester robuste
  // si TIERS est reordonne plus tard.
  const defaultIdx = Math.max(
    0,
    tiers.findIndex((t) => t.id === "starter"),
  );
  const [selectedIdx, setSelectedIdx] = useState(defaultIdx);
  const containerRef = useRef<HTMLDivElement>(null);

  // Navigation clavier (fleches gauche / droite)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ne capture pas si l'utilisateur est dans un input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowLeft") {
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedIdx((i) => Math.min(tiers.length - 1, i + 1));
      }
    }
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [tiers.length]);

  function go(delta: number) {
    setSelectedIdx((i) => Math.min(tiers.length - 1, Math.max(0, i + delta)));
  }

  const canGoLeft = selectedIdx > 0;
  const canGoRight = selectedIdx < tiers.length - 1;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="relative outline-none"
      role="region"
      aria-label="Comparaison des paliers"
    >
      {/* === LAYOUT MOBILE : stack vertical === */}
      <div className="md:hidden flex flex-col gap-6">
        {tiers.map((t, idx) => (
          <PricingCard
            key={t.id}
            tier={t}
            billing={billing}
            isSelected={idx === selectedIdx}
            onClick={() => setSelectedIdx(idx)}
            // En mobile pas de transparence, juste un ring colore sur le selected
            opacity={1}
            scale={1}
          />
        ))}
      </div>

      {/* === LAYOUT DESKTOP : carousel horizontal === */}
      <div className="hidden md:block">
        {/* Fleches de navigation */}
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canGoLeft}
          aria-label="Palier précédent"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-lg border border-gray-200 dark:border-slate-700 hover:scale-110 hover:bg-white dark:hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span className="text-xl text-primary-500" aria-hidden>
            ‹
          </span>
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canGoRight}
          aria-label="Palier suivant"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-lg border border-gray-200 dark:border-slate-700 hover:scale-110 hover:bg-white dark:hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span className="text-xl text-primary-500" aria-hidden>
            ›
          </span>
        </button>

        {/* Track : on render TOUTES les cards en flex row, et on translate
            le track pour que la selected soit centree visuellement.
            Chaque card a 33.33% de la largeur (on en voit 3 a la fois).
            Le track contient 4 cards donc fait 133% de large. La translation
            est calculee pour que selectedIdx soit a l'index visuel "1"
            (centre des 3 visibles).
            pt-6 / pb-2 : marge verticale pour que le badge -top-3 des cards
            ne soit pas coupe par le overflow-hidden. */}
        <div className="overflow-hidden px-12 pt-6 pb-2">
          <ul
            role="listbox"
            aria-label="Sélectionnez un palier"
            className="flex gap-4 transition-transform duration-500 ease-out"
            style={{
              // 4 cards, on en voit 3 a la fois, donc chaque card = 33%.
              // Track total = 4 * 33% = 132%. Pour centrer la card selected,
              // on shift de -((selectedIdx - 1) * 33% + ajustement gap).
              transform: `translateX(calc(${(1 - selectedIdx) * 33.333}% - ${(selectedIdx - 1) * 0.5}rem))`,
            }}
          >
            {tiers.map((t, idx) => {
              const distance = idx - selectedIdx;
              const absDist = Math.abs(distance);
              // Selected = pleine opacite + scale 1 + ring
              // Distance 1 = opacity 0.45, scale 0.92
              // Distance 2+ = opacity 0.1 (quasi invisible, accessible via fleche)
              const opacity =
                absDist === 0 ? 1 : absDist === 1 ? 0.45 : 0.1;
              const scale = absDist === 0 ? 1 : 0.92;
              return (
                <li
                  key={t.id}
                  role="option"
                  aria-selected={idx === selectedIdx}
                  className="flex-shrink-0 basis-1/3"
                >
                  <PricingCard
                    tier={t}
                    billing={billing}
                    isSelected={idx === selectedIdx}
                    onClick={() => setSelectedIdx(idx)}
                    opacity={opacity}
                    scale={scale}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        {/* Indicateurs de position (dots) */}
        <div className="flex justify-center gap-2 mt-6" role="tablist">
          {tiers.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={idx === selectedIdx}
              aria-label={`Voir ${t.name}`}
              onClick={() => setSelectedIdx(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === selectedIdx
                  ? "w-8 bg-primary-500"
                  : "w-2 bg-gray-300 hover:bg-gray-400 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PricingCard - sortie d'app/tarifs/page.tsx, accepte des props de carousel
// =============================================================================
function PricingCard({
  tier: t,
  billing,
  isSelected,
  onClick,
  opacity,
  scale,
}: {
  tier: PricingTier;
  billing: BillingCycle;
  isSelected: boolean;
  onClick: () => void;
  opacity: number;
  scale: number;
}) {
  // Badge :
  //  - Open Source pour Community Edition
  //  - Le plus populaire pour le tier highlight (Pro)
  //  - PAS de badge "Forever Free" sur Starter (UX clarifiee mai 2026 :
  //    le free <=5 sieges est explicite dans le prix affiche, le badge
  //    rendait l'offre Starter visuellement deconnectee des autres)
  const badge = t.selfHostOnly
    ? { label: "Open Source", color: "bg-purple-100 text-purple-700" }
    : t.highlight
      ? { label: "⭐ Le plus populaire", color: "bg-accent-500 text-white" }
      : null;

  const activePricing = t.pricing[billing];

  return (
    <article
      onClick={onClick}
      style={{ opacity, transform: `scale(${scale})` }}
      className={`card flex flex-col relative min-w-0 cursor-pointer transition-all duration-300 ${
        isSelected
          ? t.highlight
            ? "border-2 border-accent-500 shadow-2xl ring-2 ring-accent-500/30"
            : "border-2 border-primary-500 shadow-2xl ring-2 ring-primary-500/20"
          : "border border-gray-200 hover:border-gray-300"
      }`}
    >
      {badge && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full whitespace-nowrap ${badge.color}`}
        >
          {badge.label}
        </span>
      )}

      <div className="text-4xl mb-2">{t.emoji}</div>
      <h3 className="text-xl font-bold text-primary-500 mb-1">{t.name}</h3>
      <p className="text-xs text-gray-500 italic mb-3 min-h-[32px]">
        {t.tagline}
      </p>

      <div className="mb-4 pb-4 border-b border-gray-100">
        {activePricing.amount === null ? (
          <p className="text-2xl font-extrabold text-primary-500">Sur devis</p>
        ) : t.freeUnderSeats && activePricing.unit === "forfait" ? (
          // Cas Starter : 2 lignes pour clarifier le sub-tier free <=N sieges,
          // puis le forfait au-dela. Plus lisible qu'une phrase concatenee
          // avec un middot. La ligne "Gratuit" en emerald, le forfait en
          // primary (visuellement = "le prix que tu paies si tu grandis").
          <>
            <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">
              Gratuit jusqu'à {t.freeUnderSeats} utilisateurs
            </p>
            <p className="text-2xl font-extrabold text-primary-500 mt-1">
              Puis {activePricing.amount} €/mois au-delà
            </p>
            {billing === "annual" && t.pricing.annual.saving && (
              <p className="text-xs text-success font-bold mt-1">
                {t.pricing.annual.saving}
              </p>
            )}
            {billing === "monthly" &&
              t.pricing.annual.saving &&
              t.pricing.annual.amount !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  ou {t.pricing.annual.amount} €/mois au-delà en annuel
                </p>
              )}
          </>
        ) : (
          <>
            <p className="text-2xl font-extrabold text-primary-500">
              {activePricing.display}
            </p>
            {billing === "annual" && t.pricing.annual.saving && (
              <p className="text-xs text-success font-bold mt-1">
                {t.pricing.annual.saving}
              </p>
            )}
            {billing === "monthly" && t.pricing.annual.saving && (
              <p className="text-xs text-gray-500 mt-1">
                ou {t.pricing.annual.display} en annuel
              </p>
            )}
          </>
        )}
        <p className="text-xs text-gray-500 mt-2">
          {t.selfHostOnly
            ? "Pas de limite — votre infra"
            : t.seats.max
              ? `${t.seats.min}–${t.seats.max} utilisateurs`
              : `${t.seats.min}+ utilisateurs`}
        </p>
      </div>

      <ul className="space-y-2 text-sm flex-1 mb-5">
        {t.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-success flex-shrink-0 mt-0.5">✓</span>
            <span className="text-gray-700">{f}</span>
          </li>
        ))}
      </ul>

      <CtaButton tier={t} billing={billing} disabled={!isSelected} />
    </article>
  );
}

function CtaButton({
  tier: t,
  billing,
  disabled,
}: {
  tier: PricingTier;
  billing: BillingCycle;
  disabled: boolean;
}) {
  const cls = `${t.highlight ? "btn-primary" : "btn-secondary"} text-sm ${
    disabled ? "pointer-events-none opacity-60" : ""
  }`;

  // Si la card n'est pas selectionnee, on rend le CTA non cliquable
  // (sinon le click sur la card l'amene au centre, mais le click sur le
  // bouton la fait sortir vers /souscrire avant qu'elle soit centree —
  // mauvaise UX). On le grise tant que la card n'est pas centrale.
  const onClickStop = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      // On laisse l'event aller a Link / a, mais on stoppe la propagation
      // pour ne pas re-trigger le onClick de la card.
      e.stopPropagation();
    }
  };

  if (t.cta.type === "github") {
    return (
      <a
        href="https://github.com/humanix-cybersecurity/humanix-ce"
        target="_blank"
        rel="noreferrer"
        onClick={onClickStop}
        className={cls}
        aria-disabled={disabled}
      >
        {t.cta.label} →
      </a>
    );
  }
  if (t.cta.type === "signup-free") {
    // Le palier Starter cree un VRAI tenant ADMIN (5 sieges gratuits)
    // via /signup. /inscription est reserve aux apprenants individuels
    // qui rejoignent le tenant Communaute. Ne PAS confondre :
    //   - /inscription = LEARNER -> tenant humanix-community
    //   - /signup?plan=starter = ADMIN -> nouveau tenant dedie
    return (
      <Link
        href={`/signup?plan=${t.id}`}
        onClick={onClickStop}
        className={cls}
        aria-disabled={disabled}
      >
        {t.cta.label}
      </Link>
    );
  }
  if (t.cta.type === "subscribe") {
    // Switch temporaire : si Payplug est indisponible (validation KYC en
    // cours par exemple), on redirige les CTA paiement vers le formulaire
    // de demande de devis. Le founder repond sous 24h avec une facture
    // proforma + provision le tenant manuellement.
    //
    // Flip via env : NEXT_PUBLIC_PAYPLUG_AVAILABLE=false en prod ->
    // les CTA basculent. Defaut "true" (Payplug ON) si non defini.
    const payplugDown =
      process.env.NEXT_PUBLIC_PAYPLUG_AVAILABLE === "false";
    const href = payplugDown
      ? `/demande-abonnement?plan=${t.id}&billing=${billing}&via=payplug-down`
      : `/souscrire?plan=${t.id}&billing=${billing}`;
    return (
      <Link
        href={href}
        onClick={onClickStop}
        className={cls}
        aria-disabled={disabled}
      >
        {payplugDown ? "Demander un devis" : t.cta.label}
      </Link>
    );
  }
  return (
    <Link
      href={`/demande-abonnement?type=enterprise&plan=${t.id}`}
      onClick={onClickStop}
      className={cls}
      aria-disabled={disabled}
    >
      {t.cta.label}
    </Link>
  );
}
