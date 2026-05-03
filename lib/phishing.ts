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
};

export const PHISHING_TEMPLATES: PhishingTemplateDef[] = [
  {
    id: "FAKE_MICROSOFT",
    name: "Faux Microsoft 365",
    emoji: "🔐",
    description: "Mail \"votre mot de passe expire dans 24h\". Très commun, taux de clic 30 %+.",
    difficulty: "medium",
    emailSubject: "[Action requise] Votre mot de passe Microsoft 365 expire bientôt",
    emailFrom: "no-reply@microsoft-security.com",
    markers: [
      "Domaine expéditeur \"microsoft-security.com\" (pas microsoft.com officiel)",
      "Sentiment d'urgence (24h pour agir)",
      "Lien direct vers une page de connexion (un vrai service ne fait jamais ça par mail)",
      "Ton générique sans personnalisation profonde",
    ],
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
    description: "Faux SMS / mail \"votre colis n'a pas pu être livré\". Taux de clic 20 %.",
    difficulty: "easy",
    emailSubject: "Colissimo : votre colis n'a pas pu être livré",
    emailFrom: "suivi@colissimo-livraison.fr",
    markers: [
      "Domaine \"colissimo-livraison.fr\" — le vrai est \"laposte.fr\"",
      "Demande de paiement pour un service normalement gratuit",
      "URL raccourcie ou avec sous-domaine suspect",
      "Pas de référence au numéro de suivi exact",
    ],
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
    description: "Mail urgent du \"PDG\" demandant un virement confidentiel. Difficile à détecter.",
    difficulty: "hard",
    emailSubject: "URGENT - Confidentiel - Virement à effectuer",
    emailFrom: "patrick.durand-direction@gmail.com",
    markers: [
      "Email expéditeur en gmail.com (pas le domaine officiel de l'entreprise)",
      "Sentiment d'URGENCE + demande de CONFIDENTIALITÉ pour empêcher la vérification",
      "Aucun moyen de vérifier autre que l'email lui-même",
      "Demande directe d'action financière sans procédure habituelle",
    ],
    emailHtml: (firstName, trackingUrl) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px;">
  <p>Bonjour ${firstName || ""},</p>
  <p>Je suis en pleine négociation et j'ai besoin de toi <strong>maintenant</strong>.</p>
  <p>Peux-tu effectuer un virement de <strong>28 400 €</strong> à un nouveau fournisseur ? RIB et instructions ci-joints.</p>
  <p>Discrétion totale — je t'expliquerai lundi en interne. Compte sur toi.</p>
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
