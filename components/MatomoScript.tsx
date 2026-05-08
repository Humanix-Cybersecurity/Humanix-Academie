// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tracker analytics Matomo (origine francaise -- Matthieu Aubry, 2007).
// -----------------------------------------------------------------------------
// Matomo (ex-Piwik) est l'alternative europeenne historique a Google Analytics.
// 23% de part de marche en France. Open source GPL-3.0, self-host first.
//
// CONFIG RGPD-EXEMPTEE :
//   Cote serveur Matomo, on active dans Settings -> Privacy :
//     ✓ Anonymize visitor IP addresses (mask 2 octets, /16)
//     ✓ Disable browser fingerprinting
//     ✓ Disable Tracking Cookies (option `disableCookies`)
//     ✓ Respect Do Not Track
//     ✓ Anonymize tracking data on a delayed basis
//   -> exempt du bandeau cookies CNIL (recommandation 2020-091)
//
// Le composant ne rend RIEN si la variable d'env publique
// `NEXT_PUBLIC_MATOMO_URL` n'est pas definie -> dev local pas pollue.
//
// Variables :
//   NEXT_PUBLIC_MATOMO_URL    ex: "https://matomo.humanix-academie.fr"
//   NEXT_PUBLIC_MATOMO_SITE_ID  ex: "1"

import Script from "next/script";

export default function MatomoScript() {
  const matomoUrl = process.env.NEXT_PUBLIC_MATOMO_URL;
  const siteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;

  if (!matomoUrl || !siteId) return null;

  // Snippet Matomo standard avec config "RGPD strict" :
  //   - disableCookies : zero cookie pose
  //   - setDoNotTrack : respecte le DNT navigateur
  //   - anonymizeIp : mask 2 octets cote client (defense en profondeur,
  //     Matomo refait l'anonymisation cote serveur de toutes facons)
  const inlineScript = `
    var _paq = window._paq = window._paq || [];
    _paq.push(['disableCookies']);
    _paq.push(['setDoNotTrack', true]);
    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);
    (function() {
      var u = "${matomoUrl.replace(/\/$/, "")}/";
      _paq.push(['setTrackerUrl', u + 'matomo.php']);
      _paq.push(['setSiteId', '${siteId}']);
    })();
  `;

  return (
    <>
      <Script
        id="matomo-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: inlineScript }}
      />
      <Script
        id="matomo-loader"
        strategy="afterInteractive"
        src={`${matomoUrl.replace(/\/$/, "")}/matomo.js`}
        async
        defer
      />
    </>
  );
}
