// SPDX-License-Identifier: AGPL-3.0-or-later
// Les regles de securite numerique de l'organisation : le texte, versionne.
//
// Pourquoi ici et pas en base : ces cinq regles sont le pivot de tout le
// parcours Mairies (des regles qui ne demandent pas de juger, et le soutien
// de l'autorite pour dire non). Elles doivent etre les memes pour tout le
// monde, relues comme du code, et datees par une version. La base ne porte
// que l'etat d'adoption d'un tenant et les attestations de lecture
// (prisma : ReglesOrganisation, LectureRegles). Changer le texte de fond =
// incrementer VERSION_REGLES, ce qui redemande une lecture a chacun.
//
// Vocabulaire : les regles sont ecrites une fois avec des jetons
// ({collectivite}, {signataire}, {agents}) remplis selon le type
// d'organisation, pour qu'une commune lise « la commune » et « le maire »,
// et une entreprise « l'organisation » et « la direction ».

export const VERSION_REGLES = 1;

export type TypeOrganisation = "commune" | "intercommunalite" | "entreprise";

export const TYPES_ORGANISATION: readonly TypeOrganisation[] = [
  "commune",
  "intercommunalite",
  "entreprise",
];

export function estTypeOrganisation(v: string): v is TypeOrganisation {
  return (TYPES_ORGANISATION as readonly string[]).includes(v);
}

export type Vocabulaire = {
  /** Libelle du type dans les formulaires. */
  libelle: string;
  /** « la commune », « la communauté », « l'organisation ». */
  collectivite: string;
  /** « le conseil municipal », « le conseil communautaire », « la direction ». */
  organe: string;
  /** « délibération » ou « décision ». */
  acte: string;
  /** En-tete de l'acte. */
  registre: string;
  /** L'autorite qui couvre le refus : « le maire », « la présidence », « la direction ». */
  signataire: string;
  /** Fonction affichee sous la signature quand elle n'est pas renseignee. */
  fonctionSignataire: string;
  /** Les personnes concernees. */
  agents: string;
  /** La meme chose apres « à » : « aux agents et aux élus ». */
  auxAgents: string;
  /** Les visas de l'acte. */
  fondements: readonly string[];
};

export const VOCABULAIRE: Record<TypeOrganisation, Vocabulaire> = {
  commune: {
    libelle: "Commune (conseil municipal)",
    collectivite: "la commune",
    organe: "le conseil municipal",
    acte: "délibération",
    registre: "Extrait du registre des délibérations du conseil municipal",
    signataire: "le maire",
    fonctionSignataire: "Le maire",
    agents: "les agents et les élus",
    auxAgents: "aux agents et aux élus",
    fondements: [
      "le code général des collectivités territoriales, notamment son article L2121-29",
      "le règlement (UE) 2016/679 du 27 avril 2016 relatif à la protection des données (RGPD), notamment son article 32",
    ],
  },
  intercommunalite: {
    libelle: "Intercommunalité (conseil communautaire)",
    collectivite: "la communauté",
    organe: "le conseil communautaire",
    acte: "délibération",
    registre: "Extrait du registre des délibérations du conseil communautaire",
    signataire: "la présidence",
    fonctionSignataire: "La présidence",
    agents: "les agents et les élus",
    auxAgents: "aux agents et aux élus",
    fondements: [
      "le code général des collectivités territoriales, notamment ses articles L5211-1 et L2121-29",
      "le règlement (UE) 2016/679 du 27 avril 2016 relatif à la protection des données (RGPD), notamment son article 32",
    ],
  },
  entreprise: {
    libelle: "Entreprise ou association (direction)",
    collectivite: "l'organisation",
    organe: "la direction",
    acte: "décision",
    registre: "Décision de la direction",
    signataire: "la direction",
    fonctionSignataire: "La direction",
    agents: "l'ensemble du personnel",
    auxAgents: "à l'ensemble du personnel",
    fondements: [
      "le règlement (UE) 2016/679 du 27 avril 2016 relatif à la protection des données (RGPD), notamment son article 32",
      "le règlement intérieur et la charte informatique en vigueur",
    ],
  },
};

export type Regle = {
  id: string;
  /** Une ligne, telle qu'on la dit a voix haute. */
  titre: string;
  /** Deux phrases, pour l'affiche. */
  resume: string;
  /** Le texte complet, pour l'annexe de l'acte. */
  texte: string;
};

const REGLES_BRUTES: readonly Regle[] = [
  {
    id: "paiement",
    titre: "Aucun ordre de paiement par téléphone, même de moi",
    resume:
      "Aucun virement, aucun changement de RIB ne s'exécute sur un appel, un SMS ou un simple courriel, quel qu'en soit l'expéditeur apparent, y compris {signataire}. On vérifie par un appel au numéro déjà connu, et on note la vérification.",
    texte:
      "Aucun virement, aucun changement de coordonnées bancaires d'un fournisseur ou d'un tiers, aucune modification de RIB ne s'exécute sur un appel téléphonique, un SMS ou un simple courriel, quel qu'en soit l'expéditeur apparent, y compris {signataire}. Toute demande de ce type est vérifiée par un appel au numéro déjà connu du fournisseur ou du service, jamais au numéro fourni par la demande, et la vérification est notée sur la fiche du tiers avec la date et la personne jointe.",
  },
  {
    id: "canal",
    titre: "Chaque demande passe par un canal que nous détenons",
    resume:
      "Actes, adresses, informations sur les personnes, accès aux logiciels : la réponse suit la procédure et part vers un canal que {collectivite} détient. Personne n'a à juger si un appel est sincère : celui qui refuse d'être rappelé attend.",
    texte:
      "Les actes, les adresses et informations sur les habitants ou les usagers, les accès aux registres, aux locaux et aux logiciels ne se remettent que par la procédure prévue, vers un canal que {collectivite} détient : formulaire, courrier, rappel au numéro officiel, compte nominatif. Personne n'a à évaluer la sincérité d'un appel, d'un courriel ou d'une visite : un interlocuteur qui refuse d'être rappelé à un numéro connu attend, et une urgence réelle a toujours un autre chemin.",
  },
  {
    id: "compte",
    titre: "Un compte par personne, jamais de mot de passe partagé",
    resume:
      "Chaque personne a ses propres identifiants, avec les droits de son rôle. Aucun mot de passe partagé ni écrit sous un clavier. Les accès se ferment le jour du départ ; un remplacement a son propre compte.",
    texte:
      "Chaque personne, agent, élu, remplacement ou prestataire, dispose de ses propres identifiants, avec les droits de son rôle et une double authentification quand l'outil la propose. Aucun mot de passe n'est partagé, transmis par message ni écrit à portée de main. Les accès se ferment le jour du départ ou de la fin d'intervention ; un remplacement dispose d'un compte propre, activé pour sa seule période. {collectivite_maj} tient la liste de ses accès et de ses prestataires.",
  },
  {
    id: "refus",
    titre: "Refuser et faire attendre n'est jamais une faute",
    resume:
      "La personne qui applique ces règles est couverte par {signataire}. Faire attendre un vrai gendarme, un vrai éditeur ou un vrai technicien le temps d'une vérification est un geste attendu, pas un risque personnel.",
    texte:
      "La personne qui applique ces règles est couverte par {signataire} et par {organe}. Faire attendre un véritable gendarme, un véritable éditeur de logiciel, un véritable technicien ou un véritable service de l'État le temps d'une vérification est un geste attendu, pas un risque personnel. Aucune sanction, aucun reproche ne peut suivre un refus ou un délai conforme à ces règles, y compris lorsque la demande venait de {signataire}.",
  },
  {
    id: "declaration",
    titre: "On déclare, on porte plainte, on n'accuse pas",
    resume:
      "Tout incident ou tentative est signalé sans délai ; {collectivite} déclare et porte plainte. La personne qui signale n'est jamais mise en cause pour avoir signalé.",
    texte:
      "Tout incident ou tentative, y compris un clic, un virement parti ou un accès ouvert par erreur, est signalé sans délai {a_signataire} et à la personne référente. {collectivite_maj} déclare : plainte, préfecture, CNIL lorsqu'une donnée personnelle est concernée, assureur, et informe les personnes concernées. La personne qui signale n'est jamais mise en cause pour avoir signalé : c'est le silence qui aggrave un incident.",
  },
];

/** Engagements de l'organisation, portes par l'acte (article 4). */
const ENGAGEMENTS_BRUTS: readonly string[] = [
  "porter ces règles à la connaissance de chacune des personnes concernées et recueillir son attestation de lecture, y compris à chaque arrivée ;",
  "proposer à chaque poste un parcours de sensibilisation adapté à ses situations, et en suivre l'avancement par service, jamais par une évaluation individuelle ;",
  "tenir l'inventaire des accès, des comptes et des prestataires, et le revoir à chaque départ ;",
  "faire restaurer une sauvegarde réelle au moins une fois par an, en présence de {collectivite} ;",
  "jouer au moins une fois par an un exercice sur table avec {organe} et les responsables de service, et corriger le plan de continuité à partir de ce qui a manqué ;",
  "revoir ces règles chaque année et à chaque incident.",
];

/** « à » + « le maire » → « au maire » ; « à la présidence » ; « à l'ensemble ». */
export function contracter(groupe: string): string {
  if (groupe.startsWith("le ")) return "au " + groupe.slice(3);
  if (groupe.startsWith("les ")) return "aux " + groupe.slice(4);
  return "à " + groupe;
}

function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function remplir(texte: string, v: Vocabulaire): string {
  return texte
    .replaceAll("{collectivite_maj}", majuscule(v.collectivite))
    .replaceAll("{collectivite}", v.collectivite)
    .replaceAll("{a_signataire}", contracter(v.signataire))
    .replaceAll("{signataire}", v.signataire)
    .replaceAll("{organe}", v.organe)
    .replaceAll("{agents}", v.agents);
}

/** Les cinq regles, avec le vocabulaire du type d'organisation. */
export function reglesPour(type: TypeOrganisation): Regle[] {
  const v = VOCABULAIRE[type];
  return REGLES_BRUTES.map((r) => ({
    id: r.id,
    titre: remplir(r.titre, v),
    resume: remplir(r.resume, v),
    texte: remplir(r.texte, v),
  }));
}

export function engagementsPour(type: TypeOrganisation): string[] {
  const v = VOCABULAIRE[type];
  return ENGAGEMENTS_BRUTS.map((e) => remplir(e, v));
}

/** Nombre de regles, pour les libelles (« les cinq règles »). */
export const NOMBRE_REGLES = REGLES_BRUTES.length;
