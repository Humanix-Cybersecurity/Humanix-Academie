"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// CookieBanner - bandeau de consentement explicite (RGPD + ePrivacy CNIL).
//
// Sprint 5 (juin 2026). Pourquoi cette banniere :
//   - On integre Plausible Analytics. Plausible se positionne "cookieless"
//     mais en France la CNIL a une lecture stricte : tout traceur (au sens
//     technique large) necessite consentement, sauf liste limitative
//     d'outils exemptes (Plausible n'y figure pas a ce jour).
//   - Par prudence, on demande consentement explicite avant chargement du
//     script analytics.
//
// Modele de consentement :
//   - 2 boutons : "Tout accepter" / "Tout refuser" (parite stricte cote
//     visibilite + couleur de degats - exigence CNIL recommandation 2020-091).
//   - Pas de bouton "Continuer sans consentir" deguise.
//   - Pas de pre-cochage. Statut "non consenti" jusqu'a action explicite.
//   - Stockage du choix dans localStorage (pas dans un cookie tiers - la
//     decision elle-meme n'est pas un traceur).
//   - Choix re-modifiable depuis /confidentialite (lien dans le footer).
//
// Le CookieBanner s'affiche uniquement si :
//   - un traceur necessitant consentement est configure (Plausible cloud via
//     NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT) - sinon il n'y a rien a consentir
//   - ET localStorage 'humanix-cookie-consent' n'a aucune valeur
//   - ET on n'est pas sur les pages legales (cgu, cgv, mentions, confidentialite,
//     cookies) - eviter de masquer le contenu pendant que l'utilisateur lit.
//
// Pourquoi conditionnel : Humanix Academie est AGPL v3. Un fork qui n'utilise
// pas Plausible cloud (mais Matomo ou Plausible self-host en mode CNIL-exempt,
// ou rien) ne doit pas afficher de banniere de consentement inutile.
//
// Le composant <PlausibleLoader /> (separe) ecoute les changements de consent
// et charge le script Plausible UNIQUEMENT si consent === "granted".
// =============================================================================

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  POPUP_PRIORITY,
  usePopupSlot,
} from "@/components/popup-coordinator";

const STORAGE_KEY = "humanix-cookie-consent";

/**
 * Indique si un traceur soumis a consentement est configure cote operateur.
 * Aujourd'hui : uniquement Plausible cloud (le self-host et Matomo sont
 * consideres exemptes par defaut sous regime CNIL recommandation 2020-091
 * - c'est a l'operateur de verifier que sa config respecte bien les criteres
 * d'exemption : anonymisation IP, pas de cross-site, conservation limitee).
 */
const NEEDS_CONSENT =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT;

export type ConsentValue = "granted" | "denied" | null;

/**
 * Recupere le consentement courant depuis localStorage. Renvoie null si
 * jamais defini (l'utilisateur n'a pas encore vu / interagit avec la
 * banniere).
 */
export function readConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
    return null;
  } catch {
    // localStorage peut throw en mode prive Safari ou si quota plein
    return null;
  }
}

/**
 * Pose le consentement et notifie les autres composants via un event
 * window personnalise. PlausibleLoader ecoute cet event pour charger
 * ou ne pas charger le script.
 */
function writeConsent(value: "granted" | "denied"): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* quota plein / mode prive - on ignore, l'user reverra la banniere */
  }
  window.dispatchEvent(
    new CustomEvent("humanix-consent-changed", { detail: value }),
  );
}

// Pages legales ou la banniere ne doit pas masquer le contenu
const LEGAL_PATHS = new Set([
  "/cgu",
  "/cgv",
  "/mentions-legales",
  "/confidentialite",
  "/cookies",
  "/accessibilite",
]);

export default function CookieBanner() {
  const pathname = usePathname() ?? "/";
  // mounted : evite le flash de la banniere pendant l'hydration SSR (le
  // localStorage n'est lisible que cote client, on ne montre la banniere
  // qu'apres le 1er render client).
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Pas de traceur soumis a consentement => pas de banniere (cas des forks
    // OSS qui n'utilisent pas Plausible cloud).
    if (!NEEDS_CONSENT) {
      setVisible(false);
      return;
    }
    if (LEGAL_PATHS.has(pathname)) {
      // Page legale = on n'affiche pas la banniere par-dessus le contenu
      setVisible(false);
      return;
    }
    setVisible(readConsent() === null);
  }, [pathname]);

  // Reservation d'un slot dans le coordinator (priorite 100 - legal,
  // toujours en premier). Si une autre popup essaie d'apparaitre pendant
  // que la cookie est visible, elle attendra.
  const allowed = usePopupSlot({
    id: "cookie",
    priority: POPUP_PRIORITY.cookie,
    ready: mounted && visible,
  });

  if (!mounted || !visible || !allowed) return null;

  const accept = () => {
    writeConsent("granted");
    setVisible(false);
  };
  const deny = () => {
    writeConsent("denied");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-5 bg-white dark:bg-slate-900 border-t-2 border-accent-500/30 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)] animate-slide-up"
    >
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="flex-1 min-w-0">
          <p
            id="cookie-banner-title"
            className="font-display text-base font-extrabold text-primary-500 dark:text-accent-300 mb-1.5 flex items-center gap-2"
          >
            <span aria-hidden="true">🍪</span>
            On respecte votre choix
          </p>
          <p
            id="cookie-banner-desc"
            className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed"
          >
            Pour comprendre quelles pages vous aident, on utilise{" "}
            <strong>Plausible Analytics</strong> (souverain UE, RGPD-by-design,
            sans cookies tiers, sans profilage). Vos données ne sortent pas
            d'Europe. Vous pouvez accepter ou refuser - votre choix est
            modifiable a tout moment depuis{" "}
            <Link
              href="/confidentialite"
              className="text-accent-700 dark:text-accent-300 underline-offset-4 hover:underline font-semibold"
            >
              /confidentialité
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0 lg:w-auto">
          <button
            type="button"
            onClick={deny}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 text-sm font-bold hover:border-gray-400 dark:hover:border-slate-500 transition"
          >
            Tout refuser
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition shadow-sm"
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}
