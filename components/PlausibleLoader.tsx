"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// PlausibleLoader - charge dynamiquement le script Plausible Analytics.
//
// Sprint 5b (juin 2026). Charge le script Plausible UNIQUEMENT si
// l'utilisateur a explicitement consenti via le CookieBanner.
//
// Conformite RGPD / ePrivacy CNIL :
//   - Aucun appel reseau vers plausible.io tant que consent !== "granted"
//   - Le script est ajoute via <Script /> Next.js avec strategy "afterInteractive"
//     pour ne pas bloquer le rendu initial.
//   - Si l'user refuse apres avoir accepte, le script reste charge mais cesse
//     de tracker (Plausible n'a pas d'API "stop", on ne peut pas le decharger
//     proprement — on documente la limitation et on respecte au plus pres :
//     pas de re-chargement, pas d'evenements custom).
//   - Quand l'user passe de "denied" a "granted", la page doit etre rechargee
//     pour declencher le mount du script. On ne force pas le reload — c'est
//     l'utilisateur qui choisit quand mettre a jour son choix.
//
// Plausible specifique :
//   - URL du script : https://plausible.io/js/pa-H77ZrSKEaIRqPl6sfJflM.js
//     (ID propre au domaine humanix-cybersecurity.fr / academie)
//   - Init via window.plausible() apres chargement
//   - Mode "extended" (pa-XXX.js, pas le standard plausible.js) =
//     comportement enrichi avec page transitions auto + cibles custom
// =============================================================================

import { useEffect, useState } from "react";
import Script from "next/script";
import { readConsent, type ConsentValue } from "./CookieBanner";

const PLAUSIBLE_SRC = "https://plausible.io/js/pa-H77ZrSKEaIRqPl6sfJflM.js";

/**
 * Si une instance Plausible self-host est configuree via
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN (cf. PlausibleScript.tsx), on n'active PAS
 * le loader cloud pour eviter le double tracking. Cote self-host, le
 * regime CNIL recommandation 2020-091 (mesure d'audience exemptee) peut
 * s'appliquer si la config est conforme — c'est a l'admin self-host de
 * decider, on ne lui impose pas notre flow consent.
 */
const HAS_SELFHOST =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function PlausibleLoader() {
  const [consent, setConsent] = useState<ConsentValue>(null);

  useEffect(() => {
    // 1. Lire l'etat initial depuis localStorage (cote client uniquement)
    setConsent(readConsent());

    // 2. Ecouter les changements (banniere -> accept / deny)
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<"granted" | "denied">).detail;
      setConsent(detail);
    };
    window.addEventListener("humanix-consent-changed", onChange);
    return () =>
      window.removeEventListener("humanix-consent-changed", onChange);
  }, []);

  // Pas de chargement si self-host actif (le PlausibleScript prend le relais)
  if (HAS_SELFHOST) return null;
  // Pas de chargement tant que consent !== "granted"
  if (consent !== "granted") return null;

  return (
    <>
      <Script
        src={PLAUSIBLE_SRC}
        strategy="afterInteractive"
        // afterInteractive : Next.js charge le script apres que la page
        // soit interactive (pas de blocage du first paint).
      />
      <Script id="plausible-init" strategy="afterInteractive">
        {`
          window.plausible = window.plausible || function () {
            (window.plausible.q = window.plausible.q || []).push(arguments);
          };
          window.plausible.init = window.plausible.init || function (i) {
            window.plausible.o = i || {};
          };
          window.plausible.init();
        `}
      </Script>
    </>
  );
}
