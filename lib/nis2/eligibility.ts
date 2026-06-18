// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Mini-eligibilite NIS2 : 4 questions pour aider un dirigeant a savoir,
// en clair, s'il est probablement concerne par la directive et a quel
// titre (entite essentielle, entite importante, concerne indirectement,
// ou probablement hors perimetre direct).
//
// IMPORTANT - posture : c'est une ESTIMATION INDICATIVE, pas un avis
// juridique. Le perimetre exact depend des decrets sectoriels d'application
// de la loi du 31 octobre 2024 (n° 2024-1039) et de la situation propre de
// chaque organisation. Certaines entites sont concernees quelle que soit
// leur taille. On le dit explicitement dans le resultat et l'UI.
//
// Logique (simplifiee a partir des criteres NIS2) :
//   - Annexe I (secteurs hautement critiques) :
//       grande entreprise   -> entite ESSENTIELLE
//       entreprise moyenne  -> entite IMPORTANTE
//       petite / micro      -> hors perimetre direct (sauf exceptions)
//   - Annexe II (autres secteurs critiques) :
//       moyenne ou grande   -> entite IMPORTANTE
//       petite / micro      -> hors perimetre direct (sauf exceptions)
//   - Autre secteur         -> hors perimetre direct
//   - Dans tous les cas, si l'organisation est fournisseur d'une entite
//     reglementee, elle est concernee INDIRECTEMENT (exigences repercutees
//     par ses clients au titre de l'art. 21.2.d, chaine d'approvisionnement).

export type Nis2Secteur = "annexe1" | "annexe2" | "autre";

export type Nis2Taille = "micro" | "petite" | "moyenne" | "grande";

export type Nis2Statut =
  | "essentielle"
  | "importante"
  | "indirecte"
  | "hors_probable";

export type Nis2EligibilityInput = {
  secteur: Nis2Secteur;
  taille: Nis2Taille;
  /** L'organisation fournit-elle un produit/service a une entite reglementee NIS2 ? */
  fournisseurEntiteRegulee: boolean;
};

export type Nis2EligibilityResult = {
  statut: Nis2Statut;
  /** Titre court et rassurant (pas de jargon) */
  titre: string;
  /** Ce que ca veut dire, en une phrase claire */
  resume: string;
  /** Ce que ca implique concretement */
  consequence: string;
  /** L'invitation a passer a la suite (diagnostic) */
  prochaineEtape: string;
  /** Cle de ton pour l'UI (couleur, icone) */
  ton: "info" | "attention" | "neutre";
};

// -----------------------------------------------------------------------------
// Options affichees dans le wizard (label + exemples concrets, sans jargon)
// -----------------------------------------------------------------------------

export const NIS2_SECTEURS: Array<{
  id: Nis2Secteur;
  label: string;
  exemples: string;
}> = [
  {
    id: "annexe1",
    label: "Secteur hautement critique (annexe I)",
    exemples:
      "Energie, transport, banque et finance, sante, eau potable et eaux usees, infrastructures numeriques (cloud, datacenters, DNS), administration publique, espace.",
  },
  {
    id: "annexe2",
    label: "Autre secteur critique (annexe II)",
    exemples:
      "Services postaux, gestion des dechets, industrie chimique, agroalimentaire, fabrication (dispositifs medicaux, electronique, machines, vehicules), fournisseurs numeriques (places de marche, moteurs de recherche, reseaux sociaux), recherche.",
  },
  {
    id: "autre",
    label: "Aucun de ces secteurs",
    exemples:
      "Commerce de detail classique, services aux entreprises non listes, artisanat, professions liberales, etc.",
  },
];

export const NIS2_TAILLES: Array<{
  id: Nis2Taille;
  label: string;
  critere: string;
}> = [
  {
    id: "micro",
    label: "Micro-entreprise",
    critere: "Moins de 10 personnes et moins de 2 M€ de chiffre d'affaires.",
  },
  {
    id: "petite",
    label: "Petite entreprise",
    critere: "Moins de 50 personnes et moins de 10 M€ de chiffre d'affaires.",
  },
  {
    id: "moyenne",
    label: "Entreprise moyenne",
    critere:
      "De 50 a 249 personnes, ou de 10 a 50 M€ de chiffre d'affaires.",
  },
  {
    id: "grande",
    label: "Grande entreprise",
    critere: "250 personnes ou plus, ou plus de 50 M€ de chiffre d'affaires.",
  },
];

// -----------------------------------------------------------------------------
// Contenu des verdicts (ton calme, accompagnant, jamais alarmiste)
// -----------------------------------------------------------------------------

const RESULTATS: Record<Nis2Statut, Omit<Nis2EligibilityResult, "statut">> = {
  essentielle: {
    titre: "Vous etes probablement une entite essentielle",
    resume:
      "Votre secteur et votre taille vous placent dans la categorie la plus suivie par la directive.",
    consequence:
      "Les memes mesures de bon sens que pour tout le monde (article 21), mais avec un controle plus actif de l'autorite et une attention particuliere de la direction. Rien d'insurmontable : l'essentiel reste l'organisation et les bons reflexes.",
    prochaineEtape:
      "Faites le diagnostic pour voir, article par article, ou vous en etes et par quoi commencer.",
    ton: "info",
  },
  importante: {
    titre: "Vous etes probablement une entite importante",
    resume:
      "Votre secteur vous fait entrer dans le perimetre de la directive, avec un suivi de l'autorite a posteriori.",
    consequence:
      "Les obligations sont les memes mesures de socle que pour les entites essentielles (article 21), avec un controle qui intervient surtout en cas d'incident ou de signalement. La bonne nouvelle : se mettre en ordre de marche se fait par etapes.",
    prochaineEtape:
      "Faites le diagnostic pour situer votre niveau et obtenir un plan d'action concret.",
    ton: "info",
  },
  indirecte: {
    titre: "Vous etes concerne indirectement",
    resume:
      "Vous n'etes peut-etre pas vise directement, mais vos clients reglementes vont vous demander des garanties.",
    consequence:
      "La directive rend chaque entite responsable de la securite de sa chaine de fournisseurs (article 21.2.d). Vos donneurs d'ordre vont repercuter ces exigences dans leurs contrats. Anticiper devient un argument commercial, pas seulement une contrainte.",
    prochaineEtape:
      "Le diagnostic vous montre les attentes typiques de vos clients et comment y repondre sans tout chambouler.",
    ton: "attention",
  },
  hors_probable: {
    titre: "Vous etes probablement hors du perimetre direct",
    resume:
      "En l'etat, la directive ne semble pas vous viser directement, mais la prudence reste utile.",
    consequence:
      "NIS2 redefinit le niveau de securite attendu de tout le tissu economique. Meme hors perimetre, la demarche protege votre activite et rassure assureurs, banques et clients. Et le perimetre peut evoluer avec les decrets d'application.",
    prochaineEtape:
      "Le diagnostic reste un excellent bilan de sante cyber, sans engagement.",
    ton: "neutre",
  },
};

/**
 * Estime le statut NIS2 d'une organisation a partir de 4 reponses.
 *
 * ESTIMATION INDICATIVE - ne se substitue pas a une analyse juridique.
 */
export function evaluateNis2Eligibility(
  input: Nis2EligibilityInput,
): Nis2EligibilityResult {
  const { secteur, taille, fournisseurEntiteRegulee } = input;

  const estGrande = taille === "grande";
  const estMoyenneOuPlus = taille === "moyenne" || taille === "grande";

  let statut: Nis2Statut;

  if (secteur === "annexe1") {
    if (estGrande) statut = "essentielle";
    else if (taille === "moyenne") statut = "importante";
    else statut = fournisseurEntiteRegulee ? "indirecte" : "hors_probable";
  } else if (secteur === "annexe2") {
    if (estMoyenneOuPlus) statut = "importante";
    else statut = fournisseurEntiteRegulee ? "indirecte" : "hors_probable";
  } else {
    statut = fournisseurEntiteRegulee ? "indirecte" : "hors_probable";
  }

  return { statut, ...RESULTATS[statut] };
}
