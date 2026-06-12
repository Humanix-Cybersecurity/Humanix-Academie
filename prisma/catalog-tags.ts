// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// Tags par saison pour /admin/modules.
//
// Chaque saison du catalogue (cf. catalog-saisons.ts) recoit ici 1 ou plusieurs
// tags qui permettent :
//   - le filtrage rapide dans la console admin (cliquer "rh" affiche les
//     saisons concernees)
//   - le groupement par famille (Public / Metiers / Conformite / Avance)
//   - les suggestions automatiques lors de l'onboarding tenant
//
// CONVENTION DE NOMMAGE
//   - Public     : "tout-public", "fondamentaux"
//   - Famille    : "famille:public" / "famille:metier" / "famille:conformite"
//                  / "famille:avance"
//   - Metier     : "metier:rh", "metier:compta", "metier:dev",
//                  "metier:dirigeants", "metier:dpo", "metier:managers"
//   - Theme      : "phishing", "rgpd", "nis2", "ransomware", "ia",
//                  "supply-chain", "deepfake", "byod", "mobile",
//                  "physique", "cloud", "sauvegardes", "vie-privee",
//                  "collaboration", "visios", "social-media", "crise"
//   - Vecteur    : "vecteur:email", "vecteur:sms", "vecteur:appel",
//                  "vecteur:qr", "vecteur:web"
//
// L'admin peut ensuite ajouter / retirer librement des tags via l'UI.
// =============================================================================

export const SAISON_TAGS: Record<string, string[]> = {
  // ---- Famille : public (fondamentaux + tout collaborateur) ----
  phishing: [
    "famille:public",
    "tout-public",
    "fondamentaux",
    "phishing",
    "vecteur:email",
    "vecteur:sms",
    "vecteur:appel",
  ],
  "mots-de-passe": [
    "famille:public",
    "tout-public",
    "fondamentaux",
    "mots-de-passe",
    "mfa",
  ],
  "donnees-sensibles": [
    "famille:public",
    "tout-public",
    "fondamentaux",
    "rgpd",
    "donnees-perso",
  ],
  teletravail: [
    "famille:public",
    "tout-public",
    "fondamentaux",
    "teletravail",
    "wifi",
    "byod",
  ],
  "fraude-president": [
    "famille:public",
    "tout-public",
    "fraude",
    "fovi",
    "ingenierie-sociale",
  ],
  ransomware: [
    "famille:public",
    "tout-public",
    "fondamentaux",
    "ransomware",
    "incident",
  ],
  "reseaux-sociaux-pro": [
    "famille:public",
    "tout-public",
    "social-media",
    "vie-privee",
    "osint",
  ],
  "stockage-cloud": [
    "famille:public",
    "tout-public",
    "cloud",
    "byod",
    "shadow-it",
  ],
  "ia-generative": [
    "famille:public",
    "tout-public",
    "ia",
    "rgpd",
    "fondamentaux",
  ],

  // ---- Famille : tendances 2026 (specialisees, mais accessibles) ----
  deepfakes: [
    "famille:public",
    "tout-public",
    "deepfake",
    "ia",
    "fraude",
  ],
  "supply-chain": [
    "famille:avance",
    "supply-chain",
    "prestataires",
    "iso27001",
    "metier:managers",
  ],
  "cyber-dev": [
    "famille:metier",
    "metier:dev",
    "owasp",
    "secrets",
    "code-review",
  ],
  "wifi-reseaux": [
    "famille:public",
    "tout-public",
    "wifi",
    "vpn",
    "byod",
  ],
  "email-pro": [
    "famille:public",
    "tout-public",
    "email",
    "phishing",
    "fondamentaux",
  ],
  "mobile-smartphone": [
    "famille:public",
    "tout-public",
    "mobile",
    "byod",
    "spyware",
  ],

  // ---- Famille : avance (crise, regulation) ----
  "crise-cyber": [
    "famille:avance",
    "crise",
    "incident",
    "communication",
    "metier:managers",
  ],
  "acces-physiques": [
    "famille:public",
    "tout-public",
    "physique",
    "tailgating",
    "badges",
  ],
  "visios-meetings": [
    "famille:public",
    "tout-public",
    "visios",
    "vie-privee",
    "collaboration",
  ],

  // ---- Famille : conformite (NIS2, RGPD, dirigeants) ----
  "nis2-pme": [
    "famille:conformite",
    "nis2",
    "metier:managers",
    "metier:dirigeants",
    "regulation",
  ],
  "cyber-dirigeants": [
    "famille:metier",
    "metier:dirigeants",
    "metier:managers",
    "gouvernance",
    "roi",
    "nis2",
  ],

  // ---- Famille : metier (specialises par fonction) ----
  "cyber-rh": [
    "famille:metier",
    "metier:rh",
    "rgpd",
    "onboarding",
    "offboarding",
  ],
  "cyber-compta": [
    "famille:metier",
    "metier:compta",
    "fovi",
    "fraude",
    "erp",
  ],
  "dpo-quotidien": [
    "famille:conformite",
    "metier:dpo",
    "rgpd",
    "regulation",
  ],
  sauvegardes: [
    "famille:public",
    "tout-public",
    "sauvegardes",
    "ransomware",
    "continuite",
  ],
  "cyber-collaboration": [
    "famille:public",
    "tout-public",
    "collaboration",
    "slack",
    "teams",
    "shadow-it",
  ],
  "vie-privee-bureau": [
    "famille:public",
    "tout-public",
    "vie-privee",
    "rgpd",
    "famille",
  ],

  // ---- Saison de remediation (auto-assignee post-clic phishing simule) ----
  "remediation-flash": [
    "famille:avance",
    "remediation",
    "phishing",
    "automation",
  ],

  // ---- Extension metiers (saisons 33+) ----
  "cyber-commercial": [
    "famille:metier",
    "metier:commercial",
    "vente",
    "crm",
    "ingenierie-sociale",
    "mobilite",
  ],
};

/**
 * Resout les tags d'une saison a partir de son slug. Renvoie un tableau
 * vide si pas de tags definis (= la saison sera classee "non taggee" dans
 * l'UI, ce qui invite l'admin a la categoriser).
 */
export function tagsForSaison(slug: string): string[] {
  return SAISON_TAGS[slug] ?? [];
}

/**
 * Renvoie la famille ("public" / "metier" / "conformite" / "avance") d'une
 * saison a partir de ses tags. Cherche un tag "famille:X" et renvoie X.
 * Default : "public" si aucune famille explicite (cas de saison custom non
 * categorisee).
 */
export function familyFromTags(tags: string[]): string {
  const familyTag = tags.find((t) => t.startsWith("famille:"));
  return familyTag ? familyTag.slice("famille:".length) : "public";
}

/**
 * Liste de toutes les familles disponibles, dans l'ordre d'affichage souhaite
 * dans /admin/modules (du plus grand public au plus specialise).
 */
export const FAMILY_ORDER = ["public", "metier", "sectoriel", "conformite", "avance"] as const;

export const FAMILY_LABELS: Record<string, { label: string; emoji: string; description: string }> = {
  public: {
    label: "Tout public",
    emoji: "👥",
    description: "Modules accessibles a tous les collaborateurs, sans prerequis IT.",
  },
  metier: {
    label: "Metiers",
    emoji: "🎯",
    description: "Specialises par fonction : RH, compta, dev, dirigeants, commercial...",
  },
  sectoriel: {
    label: "Sectoriel",
    emoji: "🏛️",
    description: "Adaptes a un secteur : sante, collectivites, education, industrie...",
  },
  conformite: {
    label: "Conformite",
    emoji: "📋",
    description: "NIS2, RGPD, regulations sectorielles. Pour DPO et dirigeants.",
  },
  avance: {
    label: "Avance",
    emoji: "🚀",
    description: "Sujets pointus : crise cyber, supply chain, remediation.",
  },
};
