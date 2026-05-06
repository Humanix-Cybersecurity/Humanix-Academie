// SPDX-License-Identifier: AGPL-3.0-or-later
// Source de vérité de la grille tarifaire Humanix Académie.
// Aligné sur le pivot mai 2026 — open core service-led, modèle volume.
// Cf. Pack_Lancement_Solo/05_Pivot_OSS_Mai_2026/05_PRICING_VOLUME.md
//
// 6 paliers :
//   0. Community Edition — self-host AGPL gratuit (n'a pas de tenant cloud)
//   1. Découverte        — cloud forever-free, 5 sièges
//   2. Starter (id: solo) — 19 €/mois forfait, 15 sièges
//   3. Essentielle ⭐    — 3 €/user/mois (mini 16, max 50)
//   4. Pro                — 2,50 €/user/mois (mini 51, max 250)
//   5. Enterprise (id: premium) — sur devis (250+)

import type { PlanId } from "@/lib/plans";

// Le palier "community" (self-host) n'est pas un PlanId tenant.
// On l'ajoute uniquement pour l'afficher dans la page /tarifs.
export type TierId = PlanId | "community";

export type PricingTier = {
  id: TierId;
  name: string;
  tagline: string;
  emoji: string;
  /** Self-host AGPL : pas de tenant cloud, redirige vers GitHub */
  selfHostOnly?: boolean;
  /** Forever-free cloud : pas de CB demandée */
  freeForever?: boolean;
  pricing: {
    monthly: {
      display: string;
      amount: number | null;
      unit?: "forfait" | "user" | "free";
    };
    annual: {
      display: string;
      amount: number | null;
      unit?: "forfait" | "user" | "free";
      saving?: string;
    };
  };
  seats: { min: number; max: number | null };
  highlight?: boolean;
  features: string[];
  cta: { label: string; type: "trial" | "contact" | "github" | "signup-free" };
};

export const TIERS: PricingTier[] = [
  {
    id: "community",
    name: "Community Edition",
    tagline: "Code libre AGPLv3 · self-host · pour devs et ESN",
    emoji: "🌐",
    selfHostOnly: true,
    pricing: {
      monthly: { display: "0 €", amount: 0, unit: "free" },
      annual: { display: "0 €", amount: 0, unit: "free" },
    },
    seats: { min: 1, max: null },
    features: [
      "Code source complet sur GitHub (AGPLv3)",
      "Plateforme Next.js multi-tenant",
      "5 modules de base (mots de passe, MFA, phishing, sauvegarde, RGPD)",
      "Mascotte évolutive + console dirigeant",
      "Connecteur natif CISO Assistant + format OSCAL",
      "Webhooks compatibles Sentinel/Splunk/Sekoia",
      "MCP Server pour agents IA (Claude Desktop, Mistral, GPT) — MIT autonome",
      "Pack NIS2 lite (templates registres)",
      "Documentation utilisateur complète",
      "Communauté Discord + GitHub Discussions",
      "Mises à jour à votre rythme",
      "Support communautaire (pas de SLA)",
    ],
    cta: { label: "Voir le code sur GitHub", type: "github" },
  },
  {
    id: "decouverte",
    name: "Découverte",
    tagline: "Cloud forever-free · 5 sièges · sans CB",
    emoji: "🌱",
    freeForever: true,
    pricing: {
      monthly: { display: "0 €/mois", amount: 0, unit: "free" },
      annual: { display: "0 €/an", amount: 0, unit: "free" },
    },
    seats: { min: 1, max: 5 },
    features: [
      "Tout Community Edition + cloud SaaS",
      "Hébergement France garanti (RGPD-compliant)",
      "Mises à jour automatiques",
      "Sauvegardes quotidiennes",
      "Support communautaire (Discord)",
      "Pas d'engagement, pas de CB requise",
      "Migration possible vers payant à tout moment",
    ],
    cta: { label: "Créer mon compte gratuit", type: "signup-free" },
  },
  {
    id: "solo",
    name: "Starter",
    tagline: "Pour TPE 5-15 personnes — pour le prix d'un café/semaine",
    emoji: "⚡",
    pricing: {
      monthly: { display: "19 €/mois", amount: 19, unit: "forfait" },
      annual: {
        display: "15 €/mois",
        amount: 15,
        unit: "forfait",
        saving: "−21 % engagement annuel",
      },
    },
    seats: { min: 1, max: 15 },
    features: [
      "Jusqu'à 15 utilisateurs inclus",
      "4 saisons cyber complètes (phishing, MFA, données, télétravail)",
      "Librairie micro-learning incluse",
      "Mascotte évolutive + boutique",
      "Console dirigeant complète",
      "Export rapport de conformité PDF",
      "Webhooks Slack / Teams / Email natifs",
      "Hébergement UE (RGPD-compliant)",
      "Support email (réponse < 48h ouvrées)",
      "30 jours d'essai gratuit, sans CB",
    ],
    cta: { label: "Démarrer l'essai gratuit", type: "trial" },
  },
  {
    id: "essentielle",
    name: "Essentielle",
    tagline:
      "Le standard PME — tout le contenu, tous les connecteurs souverains",
    emoji: "✨",
    highlight: true,
    pricing: {
      monthly: { display: "3 €/utilisateur/mois", amount: 3, unit: "user" },
      annual: {
        display: "2,50 €/utilisateur/mois",
        amount: 2.5,
        unit: "user",
        saving: "−17 % engagement annuel",
      },
    },
    seats: { min: 16, max: 50 },
    features: [
      "Tout le catalogue cyber (saisons + librairie)",
      "SSO Microsoft 365 et Google Workspace",
      "SCIM v2 — provisioning auto Entra / Okta / Google",
      "Console manager + dirigeant avec accès gradués",
      "Suivi individuel et par service",
      "Certificats individuels (PDF signé)",
      "Import CSV en masse",
      "Score de risque humain temps réel",
      "API REST publique (lecture) — clé API tenant",
      "Webhooks signés HMAC-SHA256 (events temps réel)",
      "Connecteur GRC : CISO Assistant + format OSCAL v1.1.2 (NIST)",
      "Notifications de rappel automatiques",
      "Support 5j/5 par chat (réponse < 4h)",
    ],
    cta: { label: "Démarrer l'essai gratuit", type: "trial" },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour PME industrialisées — phishing, marketplace, IA, SIEM",
    emoji: "🚀",
    pricing: {
      monthly: {
        display: "2,50 €/utilisateur/mois",
        amount: 2.5,
        unit: "user",
      },
      annual: {
        display: "2 €/utilisateur/mois",
        amount: 2,
        unit: "user",
        saving: "−20 % engagement annuel",
      },
    },
    seats: { min: 51, max: 250 },
    features: [
      "Tout l'offre Essentielle, et en plus :",
      "Challenges d'équipe inter-services",
      "Phishing email — génération illimitée de templates (envoi à la charge du client ou forfait sur mesure)",
      "Vishing IA souverain Mistral + Piper TTS local 🇫🇷 — génération illimitée de scripts (exécution à la charge du client ou forfait sur mesure)",
      "Smishing IA souverain Mistral 🇫🇷 — génération illimitée de SMS (envoi à la charge du client ou forfait sur mesure)",
      "Marketplace de modules (officiels + communauté)",
      "Modules contributeurs (publication interne)",
      "API REST illimitée",
      "Connecteurs SIEM : Microsoft Sentinel + Splunk HEC (workbook & SPL fournis)",
      "Format CEF v1 — compatible QRadar, Sekoia, Elastic, Wazuh, Graylog",
      "Customer Success Manager dédié",
      "Kit CSE et charte d'usage prête à l'emploi",
      "IA Coach personnalisé par apprenant",
      "Cyber-Réflexe (réponse à incident guidée)",
      "Multi-établissements light (gestion par site)",
      "Pack NIS2 turnkey complet",
      "Onboarding 1h en visio inclus",
    ],
    cta: { label: "Démarrer l'essai gratuit", type: "trial" },
  },
  {
    id: "premium",
    name: "Enterprise",
    tagline: "Multi-sites, secteur réglementé, exigences élevées",
    emoji: "👑",
    pricing: {
      monthly: { display: "Sur devis", amount: null },
      annual: { display: "Sur devis", amount: null },
    },
    seats: { min: 251, max: null },
    features: [
      "Tout l'offre Pro, et en plus :",
      "Self-host avec support pro inclus",
      "Multi-tenant (gestion par filiale ou site)",
      "Option hébergement SecNumCloud",
      "White-label possible (logo + couleurs)",
      "Connecteurs souverains 🇫🇷 : Sekoia.io, HarfangLab, Mailinblack/Vade",
      "Plugin GLPI + connecteur Lucca (à venir, sprint 12)",
      "Connecteurs sur-mesure (Drata, Vanta, ServiceNow…) en prestation",
      "SLA 99,9 % avec pénalités",
      "Support 7j/7 (réponse < 4h)",
      "DPO partagé inclus 1 an",
      "Onboarding sur site + ateliers présentiels",
      "Pentest annuel partagé sur la plateforme",
      "Conformité ISO 27001 / NIS2 facilitée",
      "Accès direct fondateur",
    ],
    cta: { label: "Demander un devis", type: "contact" },
  },
];

export type AddOn = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  price: { display: string; details: string };
  features: string[];
};

export const ADD_ONS: AddOn[] = [
  {
    id: "managed",
    name: "Pack Managed Service",
    emoji: "🤝",
    description:
      "Pour les PME qui veulent un accompagnement humain en plus de la plateforme.",
    price: {
      display: "+ 990 €/an HT",
      details: "S'ajoute à n'importe quel abonnement payant",
    },
    features: [
      "Audit de maturité cyber humaine initial (1 jour)",
      "Onboarding accompagné par expert Humanix (3 sessions)",
      "4 ateliers live trimestriels (visio ou présentiel)",
      "Revue de conformité semestrielle",
      "Réponse prioritaire aux incidents (< 1 h ouvrée)",
      "Rapport annuel de progression rédigé pour ton COMEX",
    ],
  },
  {
    id: "audit-pentest",
    name: "Pack Audit + Pentest annuel",
    emoji: "🛡️",
    description:
      "Une vue technique externe régulière sur ton niveau de cyberprotection réel.",
    price: { display: "+ 2 400 €/an HT", details: "Disponible dès Pro" },
    features: [
      "1 audit cyber complet par an (5 jours sur site ou hybride)",
      "1 pentest externe annuel (3 jours)",
      "Rapport executive + technique livré",
      "Plan d'action priorisé",
      "Restitution en visio avec ton équipe",
    ],
  },
  {
    id: "formation-qualiopi",
    name: "Pack Formation Qualiopi",
    emoji: "🎓",
    description:
      "Formation collective certifiante en cybersécurité humaine, animée par Humanix-Cybersecurity en partenariat avec un organisme de formation certifié Qualiopi. Éligible CPF, OPCO, plan de développement des compétences, FIFPL.",
    price: {
      display: "+ 1 800 €/session HT",
      details:
        "8 personnes max · hors frais déplacement, hôtel, restauration formateur (refacturés au coût réel sur justificatifs si présentiel hors visio)",
    },
    features: [
      "2 jours (14h) en présentiel ou visio synchrone",
      "Maximum 8 participants par session (pour interactivité)",
      "Programme co-construit avec un partenaire Qualiopi",
      "Support pédagogique imprimé + versions numériques",
      "Évaluations diagnostique / formative / sommative",
      "Attestation Qualiopi + certificat individuel signé",
      "Éligible CPF, OPCO, plan de formation, FIFPL",
      "Convention de formation fournie en amont",
      "Bilan pédagogique et financier post-session",
      "Programme adaptable à ton secteur (BTP, santé, retail, services, industrie)",
    ],
  },
];

// Calcul du prix mensuel attendu pour une équipe de N personnes.
// Sélectionne le tier "cloud" approprié selon le volume.
// Note : Community Edition est exclu (self-host, pas de prix cloud).
export function calculateMonthlyPrice(
  seats: number,
  billing: "monthly" | "annual",
): {
  tier: PricingTier;
  total: number;
  perUser: number;
  isQuote: boolean;
  isFree: boolean;
} {
  // On exclut Community Edition (self-host) du matching cloud
  const cloudTiers = TIERS.filter((t) => !t.selfHostOnly);
  const tier =
    cloudTiers.find(
      (t) =>
        seats >= t.seats.min && (t.seats.max === null || seats <= t.seats.max),
    ) ?? cloudTiers[cloudTiers.length - 1];

  const p = tier.pricing[billing];
  if (p.amount === null) {
    return { tier, total: 0, perUser: 0, isQuote: true, isFree: false };
  }
  if (p.unit === "free" || p.amount === 0) {
    return { tier, total: 0, perUser: 0, isQuote: false, isFree: true };
  }
  if (p.unit === "forfait") {
    return {
      tier,
      total: p.amount,
      perUser: p.amount / seats,
      isQuote: false,
      isFree: false,
    };
  }
  const total = p.amount * seats;
  return { tier, total, perUser: p.amount, isQuote: false, isFree: false };
}
