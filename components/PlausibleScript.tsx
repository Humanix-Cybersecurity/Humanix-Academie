// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tracker analytics Plausible (self-host RGPD-by-design).
// -----------------------------------------------------------------------------
// Plausible NE pose AUCUN cookie. Il hashe `<IP><UA><domaine><sel-quotidien>`
// pour identifier une session sans persistance cross-day, et le sel tourne
// chaque nuit -> impossible de tracker un visiteur sur plusieurs jours.
//
// Resultat : exempt du bandeau cookies CNIL, pas de DPA a signer, pas de
// registre de traitement RGPD (le tracker est consigne dans le scope
// "mesure d'audience exemptee" CNIL recommandation 2020-091).
//
// Le composant ne rend RIEN si la variable d'env publique
// `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` n'est pas definie -> utile pour le dev local
// (pas de pollution stats avec ton trafic perso).
//
// Variables :
//   NEXT_PUBLIC_PLAUSIBLE_DOMAIN     ex: "humanix-academie.fr"
//   NEXT_PUBLIC_PLAUSIBLE_API_HOST   ex: "https://plausible.humanix-academie.fr"
//                                    (laisser vide pour Plausible.io cloud)

import Script from "next/script";

export default function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const apiHost = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST;

  if (!domain) return null;

  // URL du script :
  //   - Si NEXT_PUBLIC_PLAUSIBLE_API_HOST est defini (self-host) -> on tape ce host
  //   - Sinon (cloud Plausible.io) -> //plausible.io/js/script.js
  const scriptSrc = apiHost
    ? `${apiHost.replace(/\/$/, "")}/js/script.js`
    : "https://plausible.io/js/script.js";

  return (
    <Script
      defer
      strategy="afterInteractive"
      data-domain={domain}
      src={scriptSrc}
    />
  );
}
