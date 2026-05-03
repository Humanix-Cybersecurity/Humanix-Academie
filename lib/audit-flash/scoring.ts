// Moteur de scoring de l'audit flash.
// Convertit les reponses en : score / 100, verdict, top 3 risques, recommandations,
// et propose une offre HumaniX adaptee a la taille de l'entreprise.

import {
  AUDIT_QUESTIONS,
  AuditCategory,
  CATEGORY_LABELS,
  CATEGORY_EMOJI,
  TOTAL_MAX_SCORE,
} from "./questions";

export type Answer = "yes" | "no" | "unsure";

export type AuditAnswers = Record<string, Answer>;

export type CompanySize =
  | "1-9" // TPE
  | "10-49" // Petite PME
  | "50-249" // Grosse PME
  | "250+"; // ETI / Mid-market

export type Sector =
  | "services"
  | "industrie"
  | "commerce"
  | "sante"
  | "finance"
  | "public"
  | "associatif"
  | "autre";

export type RiskItem = {
  category: AuditCategory;
  categoryLabel: string;
  emoji: string;
  lostPoints: number;
  failedQuestions: { id: string; text: string }[];
  severity: "critique" | "important" | "moyen";
  recommendation: string;
};

export type Verdict = {
  label: "Excellent" | "Solide" | "Fragile" | "À risque";
  color: "green" | "amber" | "orange" | "red";
  summary: string;
};

export type RecommendedPlan = {
  slug: "solo" | "essentielle" | "pro" | "premium";
  name: string;
  monthlyPrice: string; // formate FR
  annualEstimate: string;
  rationale: string;
  ctaUrl: string;
};

export type AuditResult = {
  score: number; // 0 - 100
  verdict: Verdict;
  topRisks: RiskItem[]; // max 3
  recommendedPlan: RecommendedPlan;
  nis2Concerned: boolean;
};

// ===========================================================================
// CALCUL DU SCORE
// ===========================================================================
export function computeScore(answers: AuditAnswers): number {
  let earned = 0;
  for (const q of AUDIT_QUESTIONS) {
    const a = answers[q.id];
    // OUI = bon. NON ou JE NE SAIS PAS = pas de point.
    // (On pourrait differencier "unsure" mais en cyber, ne pas savoir = ne pas faire.)
    const goodAnswer = q.invertScoring ? a === "no" : a === "yes";
    if (goodAnswer) earned += q.weight;
  }
  return Math.round((earned / TOTAL_MAX_SCORE) * 100);
}

// ===========================================================================
// VERDICT QUALITATIF
// ===========================================================================
function buildVerdict(score: number): Verdict {
  if (score >= 80) {
    return {
      label: "Excellent",
      color: "green",
      summary:
        "Votre maturité cyber est solide. Vous avez les bons réflexes — l'enjeu sera de maintenir le niveau dans le temps face à une menace qui évolue chaque mois.",
    };
  }
  if (score >= 60) {
    return {
      label: "Solide",
      color: "amber",
      summary:
        "Vous avez de bonnes bases mais des zones d'ombre à corriger rapidement. Un incident reste possible et coûterait cher.",
    };
  }
  if (score >= 40) {
    return {
      label: "Fragile",
      color: "orange",
      summary:
        "Votre exposition est élevée. Plusieurs failles classiques sont présentes — un attaquant les trouvera. Plan d'action prioritaire requis dans les 30 jours.",
    };
  }
  return {
    label: "À risque",
    color: "red",
    summary:
      "Votre entreprise présente une exposition critique. Statistiquement, vous serez victime d'un incident dans les 12 prochains mois. Action immédiate nécessaire.",
  };
}

// ===========================================================================
// TOP 3 RISQUES
// ===========================================================================
const CATEGORY_RECOMMENDATION: Record<AuditCategory, string> = {
  identite:
    "Activer le MFA partout (priorité absolue) et déployer un gestionnaire de mots de passe à toute l'équipe. Coût : ~3 €/utilisateur/mois.",
  donnees:
    "Mettre en place une stratégie de sauvegarde 3-2-1 testée trimestriellement. Tenir un registre RGPD à jour. Cartographier vos données sensibles.",
  humain:
    "Lancer un programme de sensibilisation continu (modules courts, simulations de phishing, anecdotes hebdo). C'est exactement ce que fait HumaniX Académie.",
  infra:
    "Imposer les mises à jour automatiques. Déployer un EDR moderne (Bitdefender, SentinelOne, ESET). Définir une charte BYOD claire.",
  conformite:
    "Rédiger un plan de réponse à incident en 1 page. Vérifier votre statut NIS2. Envisager une assurance cyber (premium PME ~ 800 €/an).",
};

export function computeTopRisks(answers: AuditAnswers): RiskItem[] {
  // Aggrege les points perdus par categorie + recense les questions ratees.
  const byCategory = new Map<
    AuditCategory,
    { lost: number; failed: { id: string; text: string }[] }
  >();

  for (const q of AUDIT_QUESTIONS) {
    const a = answers[q.id];
    const goodAnswer = q.invertScoring ? a === "no" : a === "yes";
    if (!goodAnswer) {
      const entry = byCategory.get(q.category) ?? { lost: 0, failed: [] };
      entry.lost += q.weight;
      entry.failed.push({ id: q.id, text: q.text });
      byCategory.set(q.category, entry);
    }
  }

  const risks: RiskItem[] = Array.from(byCategory.entries())
    .map(([category, data]) => ({
      category,
      categoryLabel: CATEGORY_LABELS[category],
      emoji: CATEGORY_EMOJI[category],
      lostPoints: data.lost,
      failedQuestions: data.failed,
      severity: (data.lost >= 5
        ? "critique"
        : data.lost >= 3
        ? "important"
        : "moyen") as "critique" | "important" | "moyen",
      recommendation: CATEGORY_RECOMMENDATION[category],
    }))
    .sort((a, b) => b.lostPoints - a.lostPoints)
    .slice(0, 3);

  return risks;
}

// ===========================================================================
// OFFRE RECOMMANDEE EN FONCTION DE LA TAILLE
// ===========================================================================
export function recommendPlan(
  size: CompanySize,
  score: number,
): RecommendedPlan {
  // En dessous de 50, le plan "à risque" pousse vers Pro pour l'accompagnement.
  const needsBoost = score < 50;

  switch (size) {
    case "1-9":
      return {
        slug: "solo",
        name: "Starter",
        monthlyPrice: "19 € HT / mois (forfait)",
        annualEstimate: "228 € HT / an (180 € en annuel)",
        rationale:
          "Pour les TPE jusqu'à 15 collaborateurs : tout l'essentiel pour démarrer une démarche cyber sérieuse, pour le prix d'un café par semaine.",
        ctaUrl: "/tarifs#solo",
      };
    case "10-49":
      return {
        slug: needsBoost ? "pro" : "essentielle",
        name: needsBoost ? "Pro" : "Essentielle",
        monthlyPrice: needsBoost
          ? "2,50 € HT / utilisateur / mois"
          : "3 € HT / utilisateur / mois",
        annualEstimate: needsBoost
          ? "à partir de 1 530 € HT / an (51 sièges mini)"
          : "à partir de 576 € HT / an (16 sièges mini)",
        rationale: needsBoost
          ? "Votre score indique un besoin d'accompagnement structuré : l'offre Pro inclut le phishing simulé, les challenges d'équipe, l'IA Coach et le Pack NIS2 turnkey."
          : "Pour les PME de 16 à 50 collaborateurs : couverture complète, SSO M365/Google, certificats individuels, connecteur CISO Assistant, conformité documentée.",
        ctaUrl: needsBoost ? "/tarifs#pro" : "/tarifs#essentielle",
      };
    case "50-249":
      return {
        slug: "pro",
        name: "Pro",
        monthlyPrice: "2,50 € HT / utilisateur / mois",
        annualEstimate: "à partir de 1 530 € HT / an",
        rationale:
          "Pour les PME de 51 à 250 collaborateurs : phishing simulé illimité, marketplace de modules, IA Coach personnalisé, multi-établissements, Pack NIS2 turnkey, connecteurs SIEM (Sentinel/Splunk/Sekoia).",
        ctaUrl: "/tarifs#pro",
      };
    case "250+":
      return {
        slug: "premium",
        name: "Enterprise",
        monthlyPrice: "Sur devis",
        annualEstimate: "À partir de ~5 000 € HT / an",
        rationale:
          "Pour les ETI : déploiement multi-tenant (filiales), SSO SAML/SCIM enterprise, option SecNumCloud, white-label, SLA 99,9 %, DPO partagé, connecteurs souverains FR (Sekoia, HarfangLab, Vade).",
        ctaUrl: "/contact",
      };
  }
}

// ===========================================================================
// NIS2 : detection rapide
// ===========================================================================
// Approximation prudente : NIS2 concerne plus de 15000 entites en France
// (sante, energie, eau, transport, finance, fournisseurs critiques...).
// On prend une vue "grand sceptique" : on alerte si la reponse "nis2_aware"
// est non/unsure ET la taille >= 50, OU si secteur regule.
const NIS2_REGULATED_SECTORS: Sector[] = [
  "sante",
  "finance",
  "industrie",
  "public",
];

export function isNis2Concerned(
  answers: AuditAnswers,
  size: CompanySize,
  sector: Sector,
): boolean {
  if (NIS2_REGULATED_SECTORS.includes(sector)) return true;
  if ((size === "50-249" || size === "250+") && answers.nis2_aware !== "yes") {
    return true;
  }
  return false;
}

// ===========================================================================
// API PRINCIPALE
// ===========================================================================
export function buildAuditResult(
  answers: AuditAnswers,
  size: CompanySize,
  sector: Sector,
): AuditResult {
  const score = computeScore(answers);
  return {
    score,
    verdict: buildVerdict(score),
    topRisks: computeTopRisks(answers),
    recommendedPlan: recommendPlan(size, score),
    nis2Concerned: isNis2Concerned(answers, size, sector),
  };
}

// ===========================================================================
// LABELS UI
// ===========================================================================
export const SIZE_LABELS: Record<CompanySize, string> = {
  "1-9": "1 à 9 collaborateurs (TPE)",
  "10-49": "10 à 49 collaborateurs",
  "50-249": "50 à 249 collaborateurs",
  "250+": "250 collaborateurs et +",
};

export const SECTOR_LABELS: Record<Sector, string> = {
  services: "Services & conseil",
  industrie: "Industrie & manufacturing",
  commerce: "Commerce & distribution",
  sante: "Santé & médico-social",
  finance: "Finance & assurance",
  public: "Secteur public & collectivités",
  associatif: "Associatif & ESS",
  autre: "Autre",
};
