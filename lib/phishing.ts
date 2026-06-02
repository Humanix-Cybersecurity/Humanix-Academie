// SPDX-License-Identifier: AGPL-3.0-or-later
// Templates pre-ecrits de phishing simule (cadre ethique strict)
// Ce fichier est SAFE cote client : pas d'import node:* ici.
// Pour generer des tokens / hasher des cles, voir lib/crypto.ts (server-only).

export type PhishingTemplateDef = {
  id: "FAKE_MICROSOFT" | "FAKE_COLISSIMO" | "FAKE_PRESIDENT";
  name: string;
  emoji: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  emailSubject: string;
  emailFrom: string;
  emailHtml: (firstName: string, trackingUrl: string) => string;
  // Marqueurs pedagogiques mis en avant sur la landing post-clic
  markers: string[];
  // Mini-module de remediation auto-assigne quand un user clique sur ce
  // template (cf. /phishing/[token]). Format : "saison-slug/episode-slug".
  // Ces modules font partie de la saison "remediation-flash" : 2-3 min
  // chrono pour ancrer le bon reflexe dans la foulee du clic.
  remediationEpisode: {
    saisonSlug: string;
    episodeSlug: string;
    /** Resume affiche dans l'encart "Module flash X min" sur la landing */
    label: string;
    durationMinutes: number;
  };
};

export const PHISHING_TEMPLATES: PhishingTemplateDef[] = [
  {
    id: "FAKE_MICROSOFT",
    name: "Faux Microsoft 365",
    emoji: "🔐",
    description:
      'Mail "votre mot de passe expire dans 24h". Très commun, taux de clic 30 %+.',
    difficulty: "medium",
    emailSubject:
      "[Action requise] Votre mot de passe Microsoft 365 expire bientôt",
    emailFrom: "no-reply@microsoft-security.com",
    markers: [
      'Domaine expéditeur "microsoft-security.com" (pas microsoft.com officiel)',
      "Sentiment d'urgence (24h pour agir)",
      "Lien direct vers une page de connexion (un vrai service ne fait jamais ça par mail)",
      "Ton générique sans personnalisation profonde",
    ],
    remediationEpisode: {
      saisonSlug: "remediation-flash",
      episodeSlug: "01-microsoft-flash",
      label: "Comment éviter ce faux Microsoft la prochaine fois",
      durationMinutes: 2,
    },
    emailHtml: (firstName, trackingUrl) => `
<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px;">
  <div style="background: #0078d4; padding: 20px; text-align: center;">
    <span style="color: white; font-size: 22px; font-weight: bold;">Microsoft</span>
  </div>
  <div style="padding: 24px; color: #333;">
    <p>Bonjour ${firstName || "Utilisateur"},</p>
    <p>Notre système a détecté que votre mot de passe Microsoft 365 expire dans <strong>24 heures</strong>.</p>
    <p>Pour éviter une interruption d'accès à vos emails et à OneDrive, veuillez le renouveler immédiatement.</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${trackingUrl}" style="background: #0078d4; color: white; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: bold;">Renouveler mon mot de passe</a>
    </p>
    <p style="font-size: 12px; color: #666;">Si vous n'agissez pas dans les 24 heures, votre compte sera temporairement suspendu.</p>
    <hr style="border: none; border-top: 1px solid #eee;"/>
    <p style="font-size: 11px; color: #999;">Microsoft Security Team · Cet email est généré automatiquement, ne pas répondre.</p>
  </div>
</div>`,
  },
  {
    id: "FAKE_COLISSIMO",
    name: "Faux Colissimo",
    emoji: "📦",
    description:
      'Faux SMS / mail "votre colis n\'a pas pu être livré". Taux de clic 20 %.',
    difficulty: "easy",
    emailSubject: "Colissimo : votre colis n'a pas pu être livré",
    emailFrom: "suivi@colissimo-livraison.fr",
    markers: [
      'Domaine "colissimo-livraison.fr" - le vrai est "laposte.fr"',
      "Demande de paiement pour un service normalement gratuit",
      "URL raccourcie ou avec sous-domaine suspect",
      "Pas de référence au numéro de suivi exact",
    ],
    remediationEpisode: {
      saisonSlug: "remediation-flash",
      episodeSlug: "02-livraison-flash",
      label: "Comment éviter ce faux livreur la prochaine fois",
      durationMinutes: 2,
    },
    emailHtml: (firstName, trackingUrl) => `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <div style="background: #fcc003; padding: 16px; text-align: center;">
    <span style="font-size: 22px; font-weight: bold; color: #002d62;">📦 Colissimo</span>
  </div>
  <div style="padding: 24px;">
    <p>Bonjour ${firstName || ""},</p>
    <p>Votre colis n'a pas pu être livré aujourd'hui en raison d'une <strong>adresse incomplète</strong>.</p>
    <p>Pour reprogrammer la livraison, des frais administratifs de <strong>1,99 €</strong> sont requis.</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${trackingUrl}" style="background: #fcc003; color: #002d62; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirmer mon adresse</a>
    </p>
    <p style="font-size: 12px; color: #666;">Sans action sous 48h, votre colis sera renvoyé à l'expéditeur.</p>
  </div>
</div>`,
  },
  {
    id: "FAKE_PRESIDENT",
    name: "Faux PDG (fraude au président)",
    emoji: "💼",
    description:
      'Mail urgent du "PDG" demandant un virement confidentiel. Difficile à détecter.',
    difficulty: "hard",
    emailSubject: "URGENT - Confidentiel - Virement à effectuer",
    emailFrom: "patrick.durand-direction@gmail.com",
    markers: [
      "Email expéditeur en gmail.com (pas le domaine officiel de l'entreprise)",
      "Sentiment d'URGENCE + demande de CONFIDENTIALITÉ pour empêcher la vérification",
      "Aucun moyen de vérifier autre que l'email lui-même",
      "Demande directe d'action financière sans procédure habituelle",
    ],
    remediationEpisode: {
      saisonSlug: "remediation-flash",
      episodeSlug: "03-fraude-president-flash",
      label: "Comment éviter cette fraude au président la prochaine fois",
      durationMinutes: 2,
    },
    emailHtml: (firstName, trackingUrl) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px;">
  <p>Bonjour ${firstName || ""},</p>
  <p>Je suis en pleine négociation et j'ai besoin de toi <strong>maintenant</strong>.</p>
  <p>Peux-tu effectuer un virement de <strong>28 400 €</strong> à un nouveau fournisseur ? RIB et instructions ci-joints.</p>
  <p>Discrétion totale - je t'expliquerai lundi en interne. Compte sur toi.</p>
  <p style="margin: 24px 0;">
    <a href="${trackingUrl}" style="color: #0066cc;">Voir les instructions de virement</a>
  </p>
  <p>Patrick<br/>
  <em>Envoyé depuis mon iPhone</em></p>
</div>`,
  },
];

export function getTemplate(id: string): PhishingTemplateDef | undefined {
  return PHISHING_TEMPLATES.find((t) => t.id === id);
}

/**
 * Injecte un pixel de tracking 1x1 transparent en fin de HTML de l'email.
 *
 * Le `<img>` pointe vers `/api/phishing/track/open/[token]` qui marque
 * `PhishingResult.openedAt` au premier GET (idempotent). Permet de mesurer
 * le taux d'OPENED du funnel (sent -> opened -> clicked -> submitted).
 *
 * Caveat : les clients mail modernes (Gmail, Outlook 365) pre-fetchent les
 * images via un proxy serveur (Google Image Proxy, Microsoft Safe Links).
 * Cela declenche le pixel meme si le user n'a pas reellement ouvert le mail.
 * On accepte ce faux positif -- impossible a distinguer cote pixel pur.
 *
 * Le style display:none ET les dimensions 1x1 garantissent que le pixel
 * n'altere pas le rendu visuel du mail.
 */
export function injectTrackingPixel(
  emailHtml: string,
  pixelUrl: string,
): string {
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" border="0" style="display:none;width:1px;height:1px;border:0;visibility:hidden;opacity:0" />`;
  // Append en toute fin -- pas besoin de chercher </body> car nos templates
  // ne sont pas des emails HTML complets (juste des fragments avec <div>).
  return `${emailHtml}\n${pixelTag}`;
}
