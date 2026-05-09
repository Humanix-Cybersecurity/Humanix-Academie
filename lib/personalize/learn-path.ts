// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Personnalisation du parcours apprenant : adaptation au persona + a la
// maturite (ex-checklist "automatisations intelligentes" item 5).
//
// CAS D'USAGE :
//   /apprendre affiche aujourd'hui les saisons dans l'ordre canonique.
//   Pour un developpeur, "Cyber pour les developpeurs" devrait remonter
//   en haut. Pour un debutant, "Phishing" et "Mots de passe" doivent
//   passer en premier. Pour un user qui a fini les 10 fondamentaux avec
//   80%+, on debloque les saisons "hard".
//
//   Cette adaptation NE doit PAS cacher de saisons (sinon l'user pense
//   que la plateforme est vide). Elle doit juste **prioriser** ce qui
//   est le plus pertinent en haut, et signaler visuellement.
//
// PHILOSOPHIE :
//   - Buckets : "mandatory" (RH a impose) > "recommended" (persona/
//     maturity) > "explore" (le reste reste accessible)
//   - Ordre canonique preserve dans chaque bucket (pas de chaos)
//   - Score de pertinence = signal visuel (badge "🎯 Pour toi"), pas
//     un filtre

import type { Persona } from "@/lib/ai/persona";

/**
 * Mapping persona -> saisons prioritaires (slugs du catalog).
 * Ce sont des recommandations metier : un developpeur n'a pas besoin
 * de prioriser "fraude-president" en premier, il a plus de valeur a
 * commencer par "cyber-dev" + "ia-generative".
 *
 * Toutes les saisons sont dispo a tous : c'est juste l'ordre qui change.
 */
export const PERSONA_PRIORITY_SAISONS: Record<Persona, string[]> = {
  beginner: [
    "phishing",
    "mots-de-passe",
    "donnees-sensibles",
    "teletravail",
    "stockage-cloud",
  ],
  technical: [
    "wifi-reseaux",
    "mobile-smartphone",
    "sauvegardes",
    "stockage-cloud",
    "supply-chain",
  ],
  manager: [
    "cyber-dirigeants",
    "crise-cyber",
    "supply-chain",
    "nis2-pme",
    "fraude-president",
  ],
  developer: [
    "cyber-dev",
    "ia-generative",
    "supply-chain",
    "stockage-cloud",
    "email-pro",
  ],
  finance: [
    "fraude-president",
    "cyber-compta",
    "deepfakes",
    "phishing",
    "email-pro",
  ],
  hr: [
    "cyber-rh",
    "donnees-sensibles",
    "reseaux-sociaux-pro",
    "phishing",
    "ia-generative",
  ],
  ops: [
    "ransomware",
    "sauvegardes",
    "supply-chain",
    "crise-cyber",
    "wifi-reseaux",
  ],
};

export type LearnBucket = "mandatory" | "recommended" | "explore";

export type SaisonClassification = {
  /** Bucket d'affichage : on trie d'abord par bucket, puis par ordre canonique */
  bucket: LearnBucket;
  /** Position dans la priorite persona (0 = top). -1 = pas dans le mapping persona. */
  personaRank: number;
  /** Niveau de difficulte recommande pour cet user (issu de la maturite). */
  recommendedDifficulty: "easy" | "medium" | "hard";
  /** Texte court (1 phrase) explicant POURQUOI cette saison est recommandee.
   *  Affiche en tooltip / micro-copy sur la card. null si pas recommandee. */
  reason: string | null;
};

export type ClassifyInput = {
  /** Slug de la saison a classer */
  saisonSlug: string;
  /** True si Tenant.config.isMandatory pour cette saison */
  isMandatory: boolean;
  /** Persona infere (cf. lib/ai/persona.ts) */
  persona: Persona;
  /** Maturite : nb d'episodes COMPLETED + score moyen quiz */
  completedCount: number;
  avgQuizScorePct: number;
};

/**
 * Classe une saison pour un user donne. Pure function : pas de side
 * effect, pas de query BDD. A appeler en map() sur la liste des saisons
 * deja chargee par /apprendre.
 */
export function classifySaisonForUser(
  input: ClassifyInput,
): SaisonClassification {
  const personaPriority = PERSONA_PRIORITY_SAISONS[input.persona] ?? [];
  const personaRank = personaPriority.indexOf(input.saisonSlug);

  // Difficulte recommandee selon maturite :
  //   - debutant (< 3 ep): easy d'abord
  //   - intermediate (3-9 ep): medium
  //   - mature (10+ ep avec score moyen >= 70): hard debloque
  const recommendedDifficulty: SaisonClassification["recommendedDifficulty"] =
    input.completedCount >= 10 && input.avgQuizScorePct >= 70
      ? "hard"
      : input.completedCount >= 3
        ? "medium"
        : "easy";

  // Bucket : mandatory > recommended (persona match) > explore
  let bucket: LearnBucket;
  let reason: string | null = null;

  if (input.isMandatory) {
    bucket = "mandatory";
    reason = "Saison recommandée par ton entreprise.";
  } else if (personaRank >= 0) {
    bucket = "recommended";
    reason = personaReasonText(input.persona);
  } else {
    bucket = "explore";
  }

  return {
    bucket,
    personaRank,
    recommendedDifficulty,
    reason,
  };
}

function personaReasonText(persona: Persona): string {
  switch (persona) {
    case "beginner":
      return "Bonne porte d'entrée pour un parcours débutant.";
    case "technical":
      return "Pertinent pour un profil technique IT / support.";
    case "manager":
      return "Vue stratégique adaptée à un dirigeant ou manager.";
    case "developer":
      return "Adapté à un profil développeur.";
    case "finance":
      return "Spécifique aux risques finance / comptabilité.";
    case "hr":
      return "Spécifique aux risques RH et données salariés.";
    case "ops":
      return "Adapté à un profil ops / production / continuité.";
    default:
      return "Recommandé pour toi.";
  }
}

/**
 * Comparator pour trier les saisons par bucket puis par persona-rank
 * puis par effectiveOrder canonique. A passer a Array.prototype.sort().
 */
export function compareSaisonsForUser<
  T extends { effectiveOrder: number; classification: SaisonClassification },
>(a: T, b: T): number {
  const order: Record<LearnBucket, number> = {
    mandatory: 0,
    recommended: 1,
    explore: 2,
  };
  const ba = order[a.classification.bucket];
  const bb = order[b.classification.bucket];
  if (ba !== bb) return ba - bb;

  // Dans le bucket "recommended", on classe par personaRank (0 d'abord)
  if (a.classification.bucket === "recommended") {
    return a.classification.personaRank - b.classification.personaRank;
  }

  // Sinon, ordre canonique du tenant
  return a.effectiveOrder - b.effectiveOrder;
}
