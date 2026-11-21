// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Mini-eligibilite NIS2 : 4 questions pour aider un dirigeant a savoir,
// en clair, s'il est probablement concerne par la directive et a quel
// titre (entite essentielle, entite importante, concerne indirectement,
// ou probablement hors perimetre direct).
//
// IMPORTANT - posture : c'est une ESTIMATION INDICATIVE, pas un avis
// juridique. Le perimetre exact dependra de la loi francaise de
// transposition, pas encore adoptee definitivement (etat du 2026-11-20,
// cf. docs/COMPLIANCE.md section 2), de ses decrets d'application et de la
// situation propre de chaque organisation. Certaines entites sont concernees
// quelle que soit leur taille. On le dit explicitement dans le resultat et
// l'UI.
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
  "essentielle" | "importante" | "indirecte" | "hors_probable";

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
      "Énergie, transport, banque et finance, santé, eau potable et eaux usées, infrastructures numériques (cloud, datacenters, DNS), administration publique, espace.",
  },
  {
    id: "annexe2",
    label: "Autre secteur critique (annexe II)",
    exemples:
      "Services postaux, gestion des déchets, industrie chimique, agroalimentaire, fabrication (dispositifs médicaux, électronique, machines, véhicules), fournisseurs numériques (places de marché, moteurs de recherche, réseaux sociaux), recherche.",
  },
  {
    id: "autre",
    label: "Aucun de ces secteurs",
    exemples:
      "Commerce de détail classique, services aux entreprises non listés, artisanat, professions libérales, etc.",
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
    critere: "De 50 à 249 personnes, ou de 10 à 50 M€ de chiffre d'affaires.",
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
    titre: "Vous êtes probablement une entité essentielle",
    resume:
      "Votre secteur et votre taille vous placent dans la catégorie la plus suivie par la directive.",
    consequence:
      "Les mêmes mesures de bon sens que pour tout le monde (article 21), mais avec un contrôle plus actif de l'autorité et une attention particulière de la direction. Rien d'insurmontable : l'essentiel reste l'organisation et les bons réflexes.",
    prochaineEtape:
      "Faites le diagnostic pour voir, article par article, où vous en êtes et par quoi commencer.",
    ton: "info",
  },
  importante: {
    titre: "Vous êtes probablement une entité importante",
    resume:
      "Votre secteur vous fait entrer dans le périmètre de la directive, avec un suivi de l'autorité a posteriori.",
    consequence:
      "Les obligations sont les mêmes mesures de socle que pour les entités essentielles (article 21), avec un contrôle qui intervient surtout en cas d'incident ou de signalement. La bonne nouvelle : se mettre en ordre de marche se fait par étapes.",
    prochaineEtape:
      "Faites le diagnostic pour situer votre niveau et obtenir un plan d'action concret.",
    ton: "info",
  },
  indirecte: {
    titre: "Vous êtes concerné indirectement",
    resume:
      "Vous n'êtes peut-être pas visé directement, mais vos clients réglementés vont vous demander des garanties.",
    consequence:
      "La directive rend chaque entité responsable de la sécurité de sa chaîne de fournisseurs (article 21.2.d). Vos donneurs d'ordre vont répercuter ces exigences dans leurs contrats. Anticiper devient un argument commercial, pas seulement une contrainte.",
    prochaineEtape:
      "Le diagnostic vous montre les attentes typiques de vos clients et comment y répondre sans tout chambouler.",
    ton: "attention",
  },
  hors_probable: {
    titre: "Vous êtes probablement hors du périmètre direct",
    resume:
      "En l'état, la directive ne semble pas vous viser directement, mais la prudence reste utile.",
    consequence:
      "NIS2 redéfinit le niveau de sécurité attendu de tout le tissu économique. Même hors périmètre, la démarche protège votre activité et rassure assureurs, banques et clients. Et le périmètre peut évoluer avec les décrets d'application.",
    prochaineEtape:
      "Le diagnostic reste un excellent bilan de santé cyber, sans engagement.",
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
