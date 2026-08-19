// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Le catalogue du parcours de mise en conformite RGPD.
//
// A QUI ON PARLE
//
//   Pas a un juriste. Dans une TPE ou une PME, le role de DPO atterrit sur la
//   RH, le RAF, parfois le QSE : quelqu'un de competent a qui on a pose un
//   chapeau sans mode d'emploi, et qui ouvre le RGPD pour tomber sur
//   « article 30 » sans savoir si ca le concerne.
//
//   On ne fait pas a sa place. On rend clair.
//
// A NE PAS CONFONDRE avec la conformite de Humanix lui-meme (/admin/dpo). Ici
// il s'agit de SON entreprise : sa paie, sa videosurveillance, son fichier
// clients.
//
// POURQUOI CE CATALOGUE EST DU CODE ET NON DES DONNEES
//
//   C'est de la doctrine. Elle suit la loi, elle doit se relire, se diffe et
//   se revoir comme du contenu pedagogique. En base, une correction passerait
//   sans que personne ne la voie.
//
// TROIS REGLES qui gouvernent chaque entree :
//
//   1. le francais d'abord, l'article ensuite ;
//   2. une action faisable CETTE SEMAINE -- « tenez votre registre » paralyse,
//      « listez cinq traitements evidents » se fait un mardi apres-midi ;
//   3. dire quand ce n'est pas nous, et ou aller.

/**
 * Qui possede l'etape.
 *
 * `personne` part avec elle a l'anonymisation ; `entreprise` reste et sert au
 * successeur. La memoire de la conformite ne doit pas tenir dans une seule
 * tete.
 */
export type PorteeEtape = "personne" | "entreprise";

export type SectionParcours = "etincelle" | "socle" | "recurrent";

/**
 * Ce que Humanix peut honnetement promettre sur cette etape.
 *
 * `hors_perimetre` est le plus important des trois : un parcours qui pretend
 * tout couvrir ment, et celui qui s'en apercoit ne fait plus confiance au
 * reste.
 */
export type VerdictEtape = "humanix_fait" | "humanix_aide" | "hors_perimetre";

export type EtapeParcours = {
  cle: string;
  section: SectionParcours;
  portee: PorteeEtape;
  /** La question telle que la personne se la pose, sans jargon. */
  question: string;
  /** Pourquoi ca compte pour SON entreprise, en une phrase. */
  pourquoi: string;
  /** L'action concrete, faisable cette semaine. */
  action: string;
  verdict: VerdictEtape;
  /** Reference legale, affichee EN BAS : pour qui veut verifier. */
  reference?: string;
  /** Ou aller quand ce n'est pas nous. */
  ressource?: { libelle: string; url: string };
  /**
   * Une entreprise sans videosurveillance doit pouvoir ecarter la question
   * sans se sentir en faute. Faux pour les etapes d'apprentissage : on ne
   * declare pas « sans objet » le fait de comprendre.
   */
  peutEtreSansObjet: boolean;
};

export const SECTIONS: Record<
  SectionParcours,
  { titre: string; sous_titre: string }
> = {
  etincelle: {
    titre: "Avant tout",
    sous_titre: "De quoi il retourne, et si ca vous concerne. Aucune tache.",
  },
  socle: {
    titre: "Le socle",
    sous_titre: "Un mois de travail, reparti. C'est la base de tout le reste.",
  },
  recurrent: {
    titre: "Ce qui se rejoue",
    sous_titre: "La conformite n'est pas un projet qu'on termine.",
  },
};

export const CATALOGUE: readonly EtapeParcours[] = [
  {
    cle: "comprendre-rgpd",
    section: "etincelle",
    portee: "personne",
    question: "De quoi parle-t-on, au juste ?",
    pourquoi:
      "Le RGPD concerne une entreprise de douze personnes autant qu'un grand groupe. Tant qu'on ne sait pas ce qu'il demande vraiment, on ne peut ni commencer, ni deleguer.",
    action:
      "Vingt minutes de lecture, sans jargon. Aucune tache a produire : juste de quoi cesser d'avoir peur du sujet.",
    verdict: "humanix_aide",
    peutEtreSansObjet: false,
  },
  {
    cle: "suis-je-dpo",
    section: "etincelle",
    portee: "personne",
    question: "Suis-je vraiment DPO ?",
    pourquoi:
      "Beaucoup portent le titre sans y etre tenus ; d'autres devraient en designer un et l'ignorent. Le savoir change ce qu'on attend de vous.",
    action:
      "Repondez aux trois questions de l'outil CNIL. Notez la reponse quelque part : on vous la redemandera.",
    verdict: "hors_perimetre",
    reference: "RGPD art. 37",
    ressource: {
      libelle: "Outil de designation — CNIL",
      url: "https://www.cnil.fr/fr/designation-dpo",
    },
    peutEtreSansObjet: false,
  },
  {
    cle: "registre-traitements",
    section: "socle",
    portee: "entreprise",
    question: "Qu'est-ce que mon entreprise fait des donnees ?",
    pourquoi:
      "C'est la pierre angulaire. Sans cette liste, aucune des etapes suivantes n'est evaluable : on ne protege pas ce qu'on n'a pas recense.",
    action:
      "Listez CINQ traitements evidents : paie, recrutement, clients, badges, video. Cinq, pas trente. Le reste viendra.",
    verdict: "humanix_aide",
    reference: "RGPD art. 30",
    ressource: {
      libelle: "Modele de registre — CNIL (tableur)",
      url: "https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement",
    },
    peutEtreSansObjet: false,
  },
  {
    cle: "information-personnes",
    section: "socle",
    portee: "entreprise",
    question: "Les gens savent-ils ce que je fais de leurs donnees ?",
    pourquoi:
      "Collecter sans informer est la faute la plus frequente, et la plus simple a corriger. Elle se voit immediatement lors d'un controle.",
    action:
      "Verifiez trois endroits : le contrat de travail, les formulaires du site, et l'affichage a l'entree si vous avez des cameras.",
    verdict: "humanix_aide",
    reference: "RGPD art. 13",
    peutEtreSansObjet: false,
  },
  {
    cle: "durees-conservation",
    section: "socle",
    portee: "entreprise",
    question: "Combien de temps je garde tout ca ?",
    pourquoi:
      "Presque tout le monde est en faute ici, et personne ne le sait : on garde par defaut, indefiniment. Une duree non definie est une duree illegale.",
    action:
      "Pour vos cinq traitements, ecrivez une duree en face de chacun. Un tableau de cinq lignes suffit.",
    verdict: "humanix_aide",
    reference: "RGPD art. 5.1.e",
    peutEtreSansObjet: false,
  },
  {
    cle: "sous-traitants",
    section: "socle",
    portee: "entreprise",
    question: "Qui d'autre voit ces donnees ?",
    pourquoi:
      "Votre comptable, votre logiciel de paie, votre hebergeur : chacun traite des donnees pour vous, et chacun doit etre encadre par un contrat.",
    action:
      "Listez vos prestataires qui voient des donnees personnelles. Pour chacun, demandez-lui son contrat de sous-traitance.",
    verdict: "humanix_aide",
    reference: "RGPD art. 28",
    peutEtreSansObjet: false,
  },
  {
    cle: "demandes-personnes",
    section: "recurrent",
    portee: "entreprise",
    question: "Que faire si quelqu'un demande ses donnees ?",
    pourquoi:
      "Vous avez UN MOIS pour repondre, et le delai court des la demande — y compris si elle arrive par un simple courriel a l'accueil.",
    action:
      "Decidez qui recoit ces demandes et ou elles sont notees. Une adresse et un tableau suffisent pour commencer.",
    verdict: "humanix_aide",
    reference: "RGPD art. 12 a 22",
    peutEtreSansObjet: false,
  },
  {
    cle: "violation-donnees",
    section: "recurrent",
    portee: "entreprise",
    question: "Et si je perds des donnees ?",
    pourquoi:
      "72 heures pour notifier la CNIL. Ce n'est pas le moment de decouvrir la procedure : elle doit tenir sur une page, lisible a 3 h du matin.",
    action:
      "Ecrivez qui appeler et dans quel ordre. Notre propre procedure vous sert de modele — elle est ecrite pour etre executee seul, sous stress.",
    verdict: "humanix_aide",
    reference: "RGPD art. 33 et 34",
    peutEtreSansObjet: false,
  },
  {
    cle: "aipd",
    section: "recurrent",
    portee: "entreprise",
    question: "Certains de mes traitements sont-ils a risque ?",
    pourquoi:
      "Quelques traitements imposent une analyse d'impact avant meme de commencer. La liste est courte et publique : verifier coute dix minutes.",
    action:
      "Comparez vos cinq traitements a la liste CNIL. Si aucun n'y figure, notez-le et passez : c'est une reponse valable.",
    verdict: "humanix_aide",
    reference: "RGPD art. 35",
    ressource: {
      libelle: "Liste des traitements soumis a AIPD — CNIL",
      url: "https://www.cnil.fr/fr/analyse-dimpact-relative-la-protection-des-donnees-publication-dune-liste-des-traitements-pour",
    },
    peutEtreSansObjet: true,
  },
  {
    cle: "demontrer",
    section: "recurrent",
    portee: "entreprise",
    question: "Comment je prouve tout ca ?",
    pourquoi:
      "Etre conforme ne suffit pas : il faut pouvoir le DEMONTRER. C'est ce qu'on vous demandera en premier, et ce qui manque le plus souvent.",
    action:
      "Rassemblez au meme endroit vos registres, durees, contrats et notes. Un dossier partage suffit — l'important est qu'il existe.",
    verdict: "humanix_aide",
    reference: "RGPD art. 5.2",
    peutEtreSansObjet: false,
  },
] as const;

/** Statuts possibles. `sans_objet` n'est offert que si l'etape l'autorise. */
export const STATUTS = ["a_faire", "en_cours", "fait", "sans_objet"] as const;
export type StatutEtape = (typeof STATUTS)[number];

export function etapeParCle(cle: string): EtapeParcours | undefined {
  return CATALOGUE.find((e) => e.cle === cle);
}

/**
 * Avancement, en NOMBRE d'etapes et jamais en pourcentage de conformite.
 *
 * « 82 % conforme » serait faux juridiquement -- la conformite n'est pas une
 * moyenne, un point manquant peut couter plus que dix acquis -- et dangereux
 * commercialement.
 *
 * `sans_objet` compte comme traite : ecarter une question en connaissance de
 * cause EST une reponse.
 */
export function avancement(statuts: Record<string, StatutEtape | undefined>): {
  traitees: number;
  total: number;
} {
  const traitees = CATALOGUE.filter((e) => {
    const s = statuts[e.cle];
    return s === "fait" || s === "sans_objet";
  }).length;
  return { traitees, total: CATALOGUE.length };
}

/** La prochaine etape a traiter, dans l'ordre du catalogue. */
export function prochaineEtape(
  statuts: Record<string, StatutEtape | undefined>,
): EtapeParcours | null {
  return (
    CATALOGUE.find((e) => {
      const s = statuts[e.cle];
      return s !== "fait" && s !== "sans_objet";
    }) ?? null
  );
}
