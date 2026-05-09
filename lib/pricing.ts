// SPDX-License-Identifier: AGPL-3.0-or-later
// Source de vérité de la grille tarifaire Humanix Académie.
// Aligné sur le pivot mai 2026 - simplification a 4 paliers.
//
// 4 paliers :
//   0. Community Edition  - self-host AGPL gratuit (n'a pas de tenant cloud)
//   1. Starter            - cloud, 0EUR free <=5 sieges, 19EUR/mois 6-15
//   2. Pro ⭐             - 3EUR/user/mois (16 a 250 sieges)
//   3. Enterprise         - sur devis (250+, multi-site, secteurs reglementes)

import type { PlanId } from "@/lib/plans";
import { PLAN_FREE_SEATS } from "@/lib/plans";

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
  /** Forever-free cloud : pas de CB demandée jusqu'a freeUnderSeats inclus */
  freeForever?: boolean;
  /** Combien de sieges sont gratuits avant facturation (0 si plan paye des le 1er user) */
  freeUnderSeats?: number;
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
  cta: {
    label: string;
    type: "subscribe" | "contact" | "github" | "signup-free";
  };
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
      "MCP Server pour agents IA (Claude Desktop, Mistral, GPT) - MIT autonome",
      "Pack NIS2 lite (templates registres)",
      "Documentation utilisateur complète",
      "Communauté Discord + GitHub Discussions",
      "Mises à jour à votre rythme",
      "Support communautaire (pas de SLA)",
    ],
    cta: { label: "Voir le code sur GitHub", type: "github" },
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "TPE 1-15 personnes · gratuit jusqu'à 5 utilisateurs",
    emoji: "⚡",
    freeForever: true,
    freeUnderSeats: PLAN_FREE_SEATS.starter, // 5
    pricing: {
      monthly: {
        display: "Gratuit jusqu'à 5 · puis 19 €/mois",
        amount: 19,
        unit: "forfait",
      },
      annual: {
        display: "Gratuit jusqu'à 5 · puis 15 €/mois",
        amount: 15,
        unit: "forfait",
        saving: "−21 % engagement annuel",
      },
    },
    seats: { min: 1, max: 15 },
    features: [
      "Gratuit pour les équipes de 1 à 5 personnes (sans engagement, sans CB)",
      "Forfait 19 €/mois quand tu passes 6-15 utilisateurs",
      "4 saisons cyber complètes (phishing, MFA, données, télétravail)",
      "Librairie micro-learning incluse",
      "Mascotte évolutive + boutique",
      "Console dirigeant complète",
      "Export rapport de conformité PDF",
      "Webhooks Slack / Teams / Email natifs",
      "Hébergement France (RGPD-compliant)",
      "Support email (réponse < 48h ouvrées)",
      "Migration possible vers Pro à tout moment",
    ],
    cta: { label: "Créer mon compte gratuit", type: "signup-free" },
  },
  {
    id: "pro",
    name: "Pro",
    tagline:
      "Le standard PME — tout le contenu, tous les connecteurs souverains",
    emoji: "🚀",
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
    seats: { min: 16, max: 250 },
    features: [
      "Tout le catalogue cyber (saisons + librairie + nouveautés mensuelles)",
      "SSO Microsoft 365 et Google Workspace",
      "SCIM v2 — provisioning auto Entra / Okta / Google",
      "Console manager + dirigeant avec accès gradués",
      "Suivi individuel et par service",
      "Certificats individuels (PDF signé)",
      "Import CSV en masse",
      "Score de risque humain temps réel",
      "API REST publique illimitée — clé API tenant",
      "Webhooks signés HMAC-SHA256 (events temps réel)",
      "Connecteur GRC : CISO Assistant + format OSCAL v1.1.2 (NIST)",
      "Notifications de rappel automatiques",
      "Challenges d'équipe inter-services",
      "Phishing email — génération illimitée de templates",
      "Vishing IA souverain Mistral + Piper TTS local 🇫🇷",
      "Smishing IA souverain Mistral 🇫🇷",
      "Marketplace de modules (officiels + communauté)",
      "Modules contributeurs (publication interne)",
      "Connecteurs SIEM : Microsoft Sentinel + Splunk HEC",
      "Format CEF v1 — compatible QRadar, Sekoia, Elastic, Wazuh, Graylog",
      "Customer Success Manager dédié",
      "Kit CSE et charte d'usage prête à l'emploi",
      "IA Coach personnalisé par apprenant",
      "Cyber-Réflexe (réponse à incident guidée)",
      "Multi-établissements light (gestion par site)",
      "Pack NIS2 turnkey complet",
      "Onboarding 1h en visio inclus",
      "Support 5j/5 par chat (réponse < 4h)",
    ],
    cta: { label: "S'abonner", type: "subscribe" },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-sites, secteurs réglementés, exigences élevées (250+)",
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
    cta: { label: "Nous contacter", type: "contact" },
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

/**
 * Calcul du prix mensuel attendu pour une équipe de N personnes.
 * Sélectionne le tier "cloud" approprié selon le volume.
 *
 * Cas particulier Starter : free jusqu'a 5 sieges, 19EUR forfait au-dela.
 */
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

  // Cas free-under-seats : Starter gratuit jusqu'a freeUnderSeats inclus.
  if (tier.freeUnderSeats && seats <= tier.freeUnderSeats) {
    return { tier, total: 0, perUser: 0, isQuote: false, isFree: true };
  }

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
