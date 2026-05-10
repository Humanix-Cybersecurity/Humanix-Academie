"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// PlausibleLoader - charge dynamiquement le script Plausible Analytics CLOUD.
//
// Sprint 5b (juin 2026). Charge le script Plausible UNIQUEMENT si :
//   1. NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT est defini (URL complete du script)
//   2. ET l'utilisateur a explicitement consenti via le CookieBanner
//   3. ET aucune instance self-host n'est configuree (cf. HAS_SELFHOST)
//
// Pourquoi configurable via env :
//   Humanix Academie est publie sous AGPL v3. Hardcoder un script ID
//   (pa-XXX.js) qui pointe vers le compte Plausible d'un operateur particulier
//   serait abusif pour les self-hosters : leur instance enverrait des stats
//   au compte de l'operateur original. Chacun met SON propre ID via env
//   (ou utilise Matomo / un Plausible self-host / pas d'analytics du tout).
//
// Conformite RGPD / ePrivacy CNIL :
//   - Aucun appel reseau vers le script tant que consent !== "granted"
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
// Configuration :
//   - NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT
//       URL complete du script Plausible cloud, par exemple :
//       "https://plausible.io/js/pa-XXXXXXXXXXXXXXXX.js"
//       (ID fourni par Plausible lors de l'inscription du domaine).
//       Vide / non defini = pas de loader cloud (par defaut OSS).
//   - Mode "extended" (pa-XXX.js, pas le standard plausible.js) =
//     comportement enrichi avec page transitions auto + cibles custom
// =============================================================================

import { useEffect, useState } from "react";
import Script from "next/script";
import { readConsent, type ConsentValue } from "./CookieBanner";

/**
 * URL complete du script Plausible cloud, fournie par l'operateur via
 * env var. Si vide, le loader ne fait rien (cas par defaut OSS / fork).
 */
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT ?? "";

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

  // Pas de URL configuree = on ne fait rien (cas par defaut pour les forks
  // OSS qui n'ont pas mis NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT).
  if (!PLAUSIBLE_SRC) return null;
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
