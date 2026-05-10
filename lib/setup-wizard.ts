// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// Quick Setup Wizard - moteur de suggestion
//
// A partir d'un profil tenant (taille, secteur, niveau cyber actuel), on
// calcule une selection de saisons a activer + a rendre obligatoires. La
// logique vit ici (cote serveur) plutot que dans le client pour qu'elle
// soit testable, evolutive, et reutilisable (par ex. par une API).
//
// Strategie :
//   - Saisons "fondamentaux" tagguees famille:public + tag "fondamentaux"
//     -> toujours suggerees pour tous (phishing, mots-de-passe, ...)
//   - Saisons "metier" tagguees famille:metier metier:X -> suggerees si
//     le secteur l'implique (ex. compta -> metier:compta + cyber-rh)
//   - Saisons "conformite" -> suggerees aux > 50 personnes (NIS2 oblige
//     ou recommande) et secteurs sensibles (sante, finance)
//   - Saisons "avance" (crise, supply chain) -> suggerees aux niveaux
//     "avance"
//
// 2-3 saisons sont marquees obligatoires (les vraies fondations) ; les
// autres sont activees mais facultatives.
// =============================================================================

export type TenantSize = "tpe" | "pme" | "eti" | "grande";
export type TenantSector =
  | "services" // services B2B / conseil / SaaS / etc. (default)
  | "sante"
  | "finance"
  | "industrie"
  | "public"
  | "tech";
export type CyberMaturity = "debutant" | "initie" | "avance";

export type SetupProfile = {
  size: TenantSize;
  sector: TenantSector;
  maturity: CyberMaturity;
};

export type SaisonForSuggestion = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  audience: string;
};

export type SetupSuggestion = {
  /** Saisons a activer pour le tenant (flag isActive=true). */
  activate: string[];
  /** Sous-ensemble de `activate` a rendre obligatoire (flag isMandatory=true). */
  mandatory: string[];
  /** Resume textuel pour l'utilisateur (affiche dans le wizard). */
  rationale: string;
};

// --- helpers ---------------------------------------------------------------

function hasTag(s: SaisonForSuggestion, tag: string): boolean {
  return s.tags.includes(tag);
}

function hasAnyTag(s: SaisonForSuggestion, tags: string[]): boolean {
  return tags.some((t) => s.tags.includes(t));
}

// --- moteur principal ------------------------------------------------------

/**
 * Calcule les suggestions a partir du profil tenant + du catalogue
 * de saisons disponibles. Pure : pas d'effet de bord, testable.
 */
export function suggestSaisons(
  profile: SetupProfile,
  catalog: SaisonForSuggestion[],
): SetupSuggestion {
  const activate = new Set<string>();
  const mandatory = new Set<string>();
  const rationaleParts: string[] = [];

  // 1) Fondamentaux : toujours suggerees a tous (essentiels universels).
  //    On rend phishing + mots-de-passe obligatoires (le strict minimum).
  for (const s of catalog) {
    if (hasTag(s, "fondamentaux")) {
      activate.add(s.id);
      // Phishing et mots-de-passe = vraiment incontournables
      if (s.slug === "phishing" || s.slug === "mots-de-passe") {
        mandatory.add(s.id);
      }
    }
  }
  rationaleParts.push("fondamentaux (phishing, mots de passe, RGPD)");

  // 2) Specialisation metier selon secteur
  const sectorMetierMap: Record<TenantSector, string[]> = {
    services: [], // pas de metier specifique
    sante: ["dpo-quotidien"], // donnees sensibles + DPO
    finance: ["cyber-compta"],
    industrie: ["supply-chain"],
    public: ["dpo-quotidien", "nis2-pme"],
    tech: ["cyber-dev"],
  };
  const sectorSlugs = sectorMetierMap[profile.sector];
  for (const s of catalog) {
    if (sectorSlugs.includes(s.slug)) {
      activate.add(s.id);
    }
  }
  if (sectorSlugs.length > 0) {
    rationaleParts.push(`specialise ${profile.sector}`);
  }

  // 3) Selon taille : a partir d'une PME, NIS2 + cyber-dirigeants + cyber-rh
  //    pertinents. Pour les TPE on reste leger (pas de conformite lourde).
  if (profile.size !== "tpe") {
    for (const s of catalog) {
      if (
        s.slug === "nis2-pme" ||
        s.slug === "cyber-dirigeants" ||
        s.slug === "cyber-rh"
      ) {
        activate.add(s.id);
      }
    }
    rationaleParts.push("conformite NIS2");
  }

  // 4) Selon maturite : avance debloque les saisons crise / remediation
  if (profile.maturity === "avance") {
    for (const s of catalog) {
      if (
        s.slug === "crise-cyber" ||
        s.slug === "supply-chain" ||
        s.slug === "remediation-flash"
      ) {
        activate.add(s.id);
      }
    }
    rationaleParts.push("modules avances (crise, supply chain)");
  } else if (profile.maturity === "initie") {
    for (const s of catalog) {
      if (s.slug === "crise-cyber") activate.add(s.id);
    }
  }

  // 5) Garde-fou : si trop peu suggere (rare), on ajoute teletravail +
  //    donnees-sensibles (sujets transversaux).
  if (activate.size < 4) {
    for (const s of catalog) {
      if (
        s.slug === "teletravail" ||
        s.slug === "donnees-sensibles" ||
        s.slug === "ia-generative"
      ) {
        activate.add(s.id);
      }
    }
  }

  return {
    activate: Array.from(activate),
    mandatory: Array.from(mandatory),
    rationale: rationaleParts.join(" + "),
  };
}

// --- meta : libelles UI ----------------------------------------------------

export const SIZE_LABELS: Record<TenantSize, string> = {
  tpe: "TPE — moins de 10 personnes",
  pme: "PME — 10 à 100 personnes",
  eti: "ETI — 100 à 500 personnes",
  grande: "Grande entreprise — 500+ personnes",
};

export const SECTOR_LABELS: Record<TenantSector, { label: string; emoji: string }> = {
  services: { label: "Services / conseil", emoji: "💼" },
  sante: { label: "Santé / médico-social", emoji: "🏥" },
  finance: { label: "Finance / banque / assurance", emoji: "🏦" },
  industrie: { label: "Industrie / production", emoji: "🏭" },
  public: { label: "Secteur public / collectivité", emoji: "🏛️" },
  tech: { label: "Tech / éditeur logiciel", emoji: "💻" },
};

export const MATURITY_LABELS: Record<CyberMaturity, { label: string; helper: string }> = {
  debutant: {
    label: "Débutant",
    helper: "On démarre la cyber, on a peu de processus en place.",
  },
  initie: {
    label: "Initié",
    helper: "On a quelques bases (MFA, sauvegardes), on veut structurer.",
  },
  avance: {
    label: "Avancé",
    helper: "On a une démarche structurée, on cherche à monter en maturité.",
  },
};
