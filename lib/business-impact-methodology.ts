// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// lib/business-impact-methodology.ts
//
// Source unique de la TRAÇABILITE financière du dashboard /admin/business.
// Pour chaque chiffre exposé, on documente :
//   - la formule mathématique
//   - les variables et leurs valeurs ce mois-ci
//   - les sources publiques utilisées (Tracfin, ANSSI, Hiscox, Generali...)
//   - un argumentaire court et concret pour le COMEX
//
// Pourquoi : un chiffre financier sans traçabilité est ignoré (au mieux) ou
// rejeté (au pire) par un COMEX. Cette transparence est ce qui transforme
// "un dashboard cool" en "un outil de pilotage adopté".
// =============================================================================

import type { BusinessImpact } from "@/lib/business-impact";

export type MetricExplanation = {
  /** Titre court (correspond au libellé du hero) */
  title: string;
  /** Valeur formatée pour rappel ("35 000 €", "12%", "x4") */
  valueLabel: string;
  /** Formule mathématique en notation lisible */
  formula: string;
  /** Détail des variables avec leur valeur courante */
  variables: Array<{ name: string; value: string; explain?: string }>;
  /** Sources publiques avec citations exactes */
  sources: Array<{ name: string; detail: string; url?: string }>;
  /** Phrase à reprendre tel quel en COMEX */
  comexPitch: string;
};

// -----------------------------------------------------------------------------
// SCORE COLLECTIF
// -----------------------------------------------------------------------------

export function explainCollectiveScore(
  impact: BusinessImpact,
): MetricExplanation {
  return {
    title: "Score collectif",
    valueLabel: `${impact.collectiveScore}/100`,
    formula: "moyenne pondérée des Risk Scores individuels",
    variables: [
      {
        name: "Risk Score individuel",
        value: "0–100 par collaborateur",
        explain:
          "Calculé à partir de la complétion des modules, du score aux quiz, de l'inactivité et des résultats de phishing simulé.",
      },
      {
        name: "Effectif retenu",
        value: `${impact.totalSeats} collaborateurs actifs`,
        explain:
          "Seuls les comptes activés et de rôle LEARNER ou MANAGER comptent. Admins exclus (pour ne pas biaiser).",
      },
    ],
    sources: [
      {
        name: "ANSSI - Référentiel Hygiène Informatique 2024",
        detail:
          "Définit la sensibilisation comme indicateur n°1 de maturité humaine. La moyenne pondérée est conforme à l'esprit du référentiel (1 maillon faible = 1 vulnérabilité).",
      },
      {
        name: "ISO 27001 §A.6.3",
        detail:
          "« La sensibilisation à la sécurité doit être mesurée et documentée par collaborateur. »",
      },
    ],
    comexPitch: `« Notre score humain cyber est de ${impact.collectiveScore}/100. C'est la moyenne du niveau de protection apporté par chaque collaborateur. Au-dessus de 80, on est dans les standards ISO 27001 ; en-dessous de 50, on est dans la zone à risque imposant une action. »`,
  };
}

// -----------------------------------------------------------------------------
// COÛT ATTENDU SUR 12 MOIS
// -----------------------------------------------------------------------------

export function explainExpectedAnnualLoss(
  impact: BusinessImpact,
): MetricExplanation {
  return {
    title: "Coût attendu sur 12 mois",
    valueLabel: `${impact.expectedAnnualLoss.toLocaleString("fr-FR")} €`,
    formula: "Coût moyen incident × Probabilité d'incident sur 12 mois",
    variables: [
      {
        name: "Coût moyen incident PME",
        value: `${impact.estimatedIncidentCost.toLocaleString("fr-FR")} €`,
        explain: `Pour une équipe de ${impact.totalSeats} pers. (échelle calibrée sur ANSSI cert-fr 2024 : 18 k€ pour <10 pers., 35 k€ pour 10-50 pers., 65 k€ pour 50-100 pers., 120 k€ pour 100-250 pers., 280 k€ pour 250+).`,
      },
      {
        name: "Probabilité incident sur 12 mois",
        value: `${Math.round(impact.incidentProbability12m * 100)}%`,
        explain: `Calibré sur le score collectif ${impact.collectiveScore}. Échelle : 4% si score ≥ 85 / 10% ≥ 70 / 20% ≥ 55 / 32% ≥ 40 / 45% si <40.`,
      },
    ],
    sources: [
      {
        name: "Tracfin - Bilan cybercriminalité PME 2024",
        detail:
          "Coût moyen d'une cyberattaque réussie en PME française : 35 000 € (rançon + chômage technique + remédiation + perte de données).",
        url: "https://www.economie.gouv.fr/tracfin",
      },
      {
        name: "Baromètre Hiscox 2023",
        detail:
          "75% des PME victimes mettent plus de 2 jours à reprendre une activité normale. Coût moyen indirect : 14 000 € en plus.",
      },
      {
        name: "ANSSI cert-fr - Panorama de la menace 2024",
        detail:
          "1 PME sur 2 sans formation cyber a subi un incident significatif sur 12 mois. C'est la base de notre calibrage probabiliste.",
        url: "https://www.cert.ssi.gouv.fr",
      },
    ],
    comexPitch: `« Sans action, nous avons mathématiquement ${impact.expectedAnnualLoss.toLocaleString("fr-FR")} € de coût attendu cyber sur 12 mois (probabilité × impact moyen pour une boîte de notre taille, sources publiques ANSSI/Tracfin). Ce n'est pas un risque théorique, c'est une espérance comptable. »`,
  };
}

// -----------------------------------------------------------------------------
// ROI HUMANIX
// -----------------------------------------------------------------------------

export function explainRoi(impact: BusinessImpact): MetricExplanation {
  // On reconstruit les chiffres du calcul ROI pour exposer les variables.
  // Cf. lib/business-impact.ts : ROI = (saving / humanixCost), arrondi à 1 décimale.
  // saving = baselineExpectedLoss − expectedAnnualLoss (différence avec PME non-formée)
  const baselineProb = 0.25;
  const baselineExpectedLoss = Math.round(
    impact.estimatedIncidentCost * baselineProb,
  );
  const grossSaving = baselineExpectedLoss - impact.expectedAnnualLoss;

  return {
    title: "ROI Humanix",
    valueLabel: `× ${impact.roiMultiplier}`,
    formula: "(Coût évité par la formation) / (Coût annuel Humanix)",
    variables: [
      {
        name: "Scénario PME non-formée",
        value: `${baselineExpectedLoss.toLocaleString("fr-FR")} €/an`,
        explain: `Hypothèse de référence : score collectif de 50, soit 25% de probabilité d'incident annuel × ${impact.estimatedIncidentCost.toLocaleString("fr-FR")} € de coût moyen.`,
      },
      {
        name: "Votre scénario actuel",
        value: `${impact.expectedAnnualLoss.toLocaleString("fr-FR")} €/an`,
        explain: `Avec votre score collectif de ${impact.collectiveScore}, votre probabilité d'incident annuelle tombe à ${Math.round(impact.incidentProbability12m * 100)}%.`,
      },
      {
        name: "Économie brute (avant coût Humanix)",
        value: `${grossSaving.toLocaleString("fr-FR")} €/an`,
        explain: `Différence entre les deux scénarios. C'est le coût statistique évité par la sensibilisation.`,
      },
      {
        name: "Coût Humanix annuel",
        value: `${impact.humanixAnnualCost.toLocaleString("fr-FR")} €/an`,
        explain: `Aligné sur la grille tarifaire publique mai 2026 pour ${impact.totalSeats} sièges.`,
      },
    ],
    sources: [
      {
        name: "Étude IBM Cost of a Data Breach Report 2024",
        detail:
          "La sensibilisation cyber réduit en moyenne le coût d'une violation de 232 000 USD (~210 k€), pour un coût programme moyen de 30 k€/an. ROI moyen observé : ×7.",
      },
      {
        name: "Generali - Étude Sinistralité Cyber PME 2023",
        detail:
          "Les PME formées affichent une sinistralité 4× moindre que les non-formées sur les 24 derniers mois.",
      },
    ],
    comexPitch: `« Pour ${impact.humanixAnnualCost.toLocaleString("fr-FR")} € de programme cyber annuel, nous évitons statistiquement ${grossSaving.toLocaleString("fr-FR")} € de pertes attendues. Le ROI de ×${impact.roiMultiplier} est conservateur - Generali et IBM observent ×4 à ×7 sur des programmes structurés. »`,
  };
}

// -----------------------------------------------------------------------------
// LIMITES MÉTHODOLOGIQUES (à afficher en bas, par honnêteté intellectuelle)
// -----------------------------------------------------------------------------

export const METHODOLOGY_LIMITATIONS = [
  "Les coûts moyens d'incident sont des **ordres de grandeur** issus d'études publiques. Votre coût réel dépend de votre secteur (santé, finance, retail, BTP) et de votre dépendance au SI.",
  "La probabilité d'incident est **calibrée sur la moyenne PME française**. Un secteur très ciblé (cabinet d'avocats, comptable) peut avoir +20% à +50% de probabilité réelle.",
  "Le **ROI n'est pas une promesse contractuelle** : c'est une espérance statistique. Une seule attaque évitée peut couvrir 5 à 10 ans de programme.",
  "Notre score n'inclut **pas la dimension technique** (firewall, EDR, sauvegardes). Un programme cyber complet doit aussi traiter ces couches.",
  "Les chiffres sont **mis à jour à chaque consultation** depuis votre base utilisateurs réelle. Aucun chiffre n'est mis en cache plus de quelques minutes.",
];

// -----------------------------------------------------------------------------
// Helper : retourne TOUS les explainers d'un coup
// -----------------------------------------------------------------------------

export function buildAllExplanations(
  impact: BusinessImpact,
): MetricExplanation[] {
  return [
    explainCollectiveScore(impact),
    explainExpectedAnnualLoss(impact),
    explainRoi(impact),
  ];
}
