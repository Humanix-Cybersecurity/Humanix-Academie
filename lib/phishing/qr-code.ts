// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Quishing (QR code phishing) - generation cote serveur.
//
// Concept : l'admin cree une campagne quishing, le systeme genere des
// affiches PDF/PNG avec un QR code unique par destinataire. L'admin
// imprime + colle sur le terrain (cafetaria, parking, panneau RH, etc.).
// Quand un employe scanne, il atterrit sur la landing pedagogique
// /phishing/[token] -> registry du clic + lecon visuelle.
//
// Pas d'envoi numerique : c'est intentionnel. Le quishing est un test
// physique. Le seul envoi numerique du systeme est l'email/SMS, deja
// implementes ailleurs.
//
// L'URL encodee dans le QR pointe vers la landing pedagogique du tenant.
// Le token est unique par recipient pour pouvoir tracker qui a scanne
// (analytics anonymes, pas de surveillance).

export type QuishingTemplate =
  | "QR_FAKE_AMENDE"
  | "QR_FAKE_WIFI"
  | "QR_FAKE_MENU"
  | "QR_FAKE_RH";

export type QuishingTemplateMeta = {
  id: QuishingTemplate;
  name: string;
  emoji: string;
  /** Description du contexte d'attaque + affiche-piege a imprimer */
  context: string;
  /** Texte d'affiche-piege (a imprimer au-dessus du QR) */
  posterCallout: string;
  /** Markers pedagogiques affiches dans la landing apres scan */
  pedagogicalMarkers: string[];
  /** Difficulte indicative (1=naif/grossier, 5=tres credible) */
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export const QUISHING_TEMPLATES: Record<QuishingTemplate, QuishingTemplateMeta> =
  {
    QR_FAKE_AMENDE: {
      id: "QR_FAKE_AMENDE",
      name: "Fausse amende ANTAI",
      emoji: "🚗",
      context:
        "Imprimer comme un avis de stationnement et le glisser sous l'essuie-glace, ou coller sur l'horodateur. La cible scanne pensant payer une amende officielle.",
      posterCallout: `AVIS D'AMENDE FORFAITAIRE
Stationnement irregulier
Reference : 24-FR-${Math.floor(Math.random() * 900000 + 100000)}
Montant : 35 EUR (majore 75 EUR sous 45j)
Scannez pour payer en ligne :`,
      pedagogicalMarkers: [
        "L'ANTAI ne distribue JAMAIS d'avis avec QR code papier sous-essuie-glace",
        "Une vraie amende est envoyee par courrier postal officiel (CERT, signe)",
        "Pour payer une amende reelle : taper antai.gouv.fr a la main, jamais via QR",
        "Le QR derriere etait un FAUX site qui aurait collecte ta CB",
      ],
      difficulty: 4,
    },

    QR_FAKE_WIFI: {
      id: "QR_FAKE_WIFI",
      name: "Faux WiFi gratuit",
      emoji: "📶",
      context:
        "Imprimer comme une affiche 'WiFi visiteurs gratuit' et coller dans une salle de reunion, accueil, cafeteria. La cible scanne pour se connecter au reseau.",
      posterCallout: `WIFI GRATUIT - VISITEURS
Reseau : Humanix-Guest
Mot de passe automatique
Scannez pour vous connecter :`,
      pedagogicalMarkers: [
        "Un WiFi legitime ne demande JAMAIS un QR code pour transmettre le mot de passe",
        "Le QR aurait ouvert une page demandant ton login d'entreprise (collect credentials)",
        "Pour un vrai WiFi visiteurs : demande le mot de passe a l'accueil de vive voix",
        "Si tu dois te connecter en exterieur : utilise le partage de connexion 4G/5G de ton telephone",
      ],
      difficulty: 3,
    },

    QR_FAKE_MENU: {
      id: "QR_FAKE_MENU",
      name: "Faux menu restaurant",
      emoji: "🍽️",
      context:
        "Imprimer comme une fiche 'menu du jour - scanner pour voir' et coller sur les tables d'une cafeteria d'entreprise, restaurant. La cible scanne et est invitee a 'payer pour reserver une table'.",
      posterCallout: `MENU DU JOUR
Decouvrez nos suggestions
Reservez votre table en 2 clics
Scannez le QR pour voir le menu :`,
      pedagogicalMarkers: [
        "Aucun restaurant ne demande de payer pour 'reserver une table' via QR sur la table",
        "Le QR menait vers une page de paiement frauduleuse qui aurait collecte ta CB",
        "Pour reserver : appel ou site officiel du restaurant (taper l'URL a la main)",
        "Si l'etablissement utilise vraiment un QR menu, il pointe vers une carte digitale, jamais un paiement",
      ],
      difficulty: 3,
    },

    QR_FAKE_RH: {
      id: "QR_FAKE_RH",
      name: "Faux affichage RH/CSE",
      emoji: "📋",
      context:
        "Imprimer comme une affiche RH ('mise a jour avantages CSE' ou 'evaluation annuelle') et coller dans les couloirs de l'entreprise, machine a cafe, panneau syndical.",
      posterCallout: `MISE A JOUR AVANTAGES CSE
Validation requise avant fin du mois
Connectez-vous avec vos identifiants
Scannez pour acceder au portail :`,
      pedagogicalMarkers: [
        "La RH/CSE ne communique JAMAIS via QR code sur affiche papier - toujours par email officiel ou intranet connu",
        "Le QR menait a un faux portail SSO qui aurait vole ton login d'entreprise",
        "Pour acceder a tes avantages CSE : passer par le portail intranet officiel (URL connue, pas via QR)",
        "Toute affiche RH/CSE legitime utilise des canaux internes traces (intranet, email signe)",
      ],
      difficulty: 5, // tres credible car contexte interne
    },
  };

/**
 * Resout le `posterCallout` d'un template avec des variables de campagne
 * injectees. Pour le moment seul QR_FAKE_WIFI accepte une personnalisation
 * (le nom du Wi-Fi affiche).
 *
 * Le SSID a deja ete VALIDE en amont (cf. lib/quishing/ssid-validation.ts) :
 * whitelist stricte, max 32 chars. On le considere donc safe a injecter
 * dans le posterCallout sans risque XSS/injection.
 *
 * @param ctx.wifiSsid Si fourni et template = QR_FAKE_WIFI, remplace
 *   "Humanix-Guest" par ce SSID dans le callout. Sinon le callout par
 *   defaut est retourne.
 */
export function resolvePosterCallout(
  templateId: QuishingTemplate,
  ctx: { wifiSsid?: string | null } = {},
): string {
  const baseCallout = QUISHING_TEMPLATES[templateId].posterCallout;
  if (templateId === "QR_FAKE_WIFI" && ctx.wifiSsid) {
    // Le callout WIFI contient "Reseau : Humanix-Guest". On substitue
    // par le SSID custom. Le SSID a ete valide en amont (alphanumerique
    // strict + espace/tiret/underscore/point), donc pas de risque de
    // template-injection (pas de syntaxe `${...}` dans la chaine).
    return baseCallout.replace(/Humanix-Guest/, ctx.wifiSsid);
  }
  return baseCallout;
}

/**
 * Genere un QR code en data URL PNG (offline, souverain : utilise la
 * lib npm `qrcode` qui implemente Reed-Solomon localement, aucun appel
 * reseau).
 *
 * Le format `dataURL:image/png` est directement insertable dans un
 * <img src=...> ou dans un <Image src=...> de @react-pdf/renderer
 * pour la generation PDF.
 *
 * NOTE : la fonction est async parce que la lib qrcode utilise
 * canvas/encoding asynchrone. Caller en server component ou server
 * action.
 */
export async function buildQrCodeDataUrl(
  targetUrl: string,
  sizePx = 400,
): Promise<string> {
  // Import dynamique pour eviter de bundler la lib cote client si la
  // page importe accidentellement ce module (ex: types).
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(targetUrl, {
    width: sizePx,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Construit l'URL de la landing pedagogique pour une cible donnee.
 * Le token est unique par destinataire (cf. PhishingResult.trackToken,
 * format `phx_<32 hex>`).
 */
export function buildQuishingLandingUrl(
  appBaseUrl: string,
  trackToken: string,
): string {
  const base = appBaseUrl.replace(/\/$/, "");
  return `${base}/phishing/${trackToken}`;
}

/**
 * Prefixe utilise pour le token NIVEAU CAMPAGNE des affiches quishing.
 * La landing /phishing/[token] route differemment selon le prefixe :
 *   - phx_<hex>      : trackToken par destinataire (email/SMS/quishing v1)
 *   - qhc_<cuidId>   : token de campagne quishing (1 seul QR partage,
 *                       1 seul poster PDF a dupliquer physiquement)
 *
 * Cf. lib/quishing/poster-pdf.tsx et app/phishing/[token]/page.tsx.
 */
export const QUISHING_CAMPAIGN_TOKEN_PREFIX = "qhc_";

/**
 * Construit le token campagne a encoder dans le QR d'un poster quishing.
 * Format : `qhc_<campaignId>` — deterministe, pas besoin de stocker en
 * BDD. La landing reverse-parse pour resoudre la campagne.
 */
export function buildQuishingCampaignToken(campaignId: string): string {
  return `${QUISHING_CAMPAIGN_TOKEN_PREFIX}${campaignId}`;
}

/**
 * Helper inverse : extrait le campaignId si le token a le prefixe
 * quishing-campagne, sinon null (= c'est un trackToken classique).
 */
export function parseQuishingCampaignToken(token: string): string | null {
  if (!token.startsWith(QUISHING_CAMPAIGN_TOKEN_PREFIX)) return null;
  const id = token.slice(QUISHING_CAMPAIGN_TOKEN_PREFIX.length);
  return id.length > 0 ? id : null;
}

/**
 * Construit l'URL de landing pour le QR commun d'un poster quishing.
 */
export function buildQuishingCampaignLandingUrl(
  appBaseUrl: string,
  campaignId: string,
): string {
  const base = appBaseUrl.replace(/\/$/, "");
  return `${base}/phishing/${buildQuishingCampaignToken(campaignId)}`;
}
