// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Les modeles telechargeables du parcours de conformite.
//
// POURQUOI ILS COMPTENT PLUS QUE LA LISTE A COCHER
//
//   Pour quelqu'un qui herite du sujet, l'obstacle n'est pas de savoir QUOI
//   faire -- le parcours le dit -- mais la page blanche. Un tableau deja
//   structure, avec les bonnes colonnes et un exemple rempli, transforme une
//   bonne intention en fichier rempli.
//
// LA FRONTIERE, RAPPELEE A CHAQUE MODELE
//
//   On pre-remplit UNIQUEMENT la ligne qui nous concerne : ce que Humanix
//   traite pour le compte du Client, au titre de l'article 28.3.h. Le reste
//   lui appartient -- sa paie, ses cameras, son fichier clients. Remplir a sa
//   place serait faux (nous ne connaissons pas ses traitements) et dangereux
//   (il signerait un document qu'il n'a pas ecrit).

/** Un modele pret a telecharger. */
export type Modele = {
  nomFichier: string;
  typeMime: string;
  contenu: string;
};

/**
 * Separateur POINT-VIRGULE et BOM UTF-8, et ce n'est pas un detail.
 *
 * Ces fichiers s'ouvrent dans un Excel francais. Avec une virgule, tout
 * atterrit dans une seule colonne ; sans BOM, les accents arrivent en
 * charabia. Un modele illisible ne serait pas seulement inelegant : il
 * renverrait la personne exactement a la page blanche qu'on voulait lui
 * epargner.
 */
const SEP = ";";
const BOM = "﻿";

function csv(lignes: readonly (readonly string[])[]): string {
  return (
    BOM +
    lignes
      .map((l) =>
        l
          .map((c) => {
            // Guillemets doubles si la cellule contient le separateur, un
            // guillemet ou un saut de ligne -- sinon Excel decale tout.
            const v = c.replace(/"/g, '""');
            return /[";\n\r]/.test(c) ? `"${v}"` : v;
          })
          .join(SEP),
      )
      .join("\r\n") +
    "\r\n"
  );
}

/**
 * Registre des activites de traitement (art. 30).
 *
 * Colonnes reprises de la structure attendue par la CNIL. La premiere ligne
 * de donnees est un EXEMPLE REMPLI -- celui de Humanix -- pour montrer le
 * niveau de detail attendu. Les suivantes sont amorcees avec les traitements
 * qu'on retrouve dans presque toutes les entreprises, vides, pour que la
 * personne n'ait plus qu'a completer.
 */
export function modeleRegistre(nomEntreprise: string): Modele {
  const entetes = [
    "Nom du traitement",
    "Finalite",
    "Base legale",
    "Personnes concernees",
    "Categories de donnees",
    "Destinataires",
    "Transfert hors UE",
    "Duree de conservation",
    "Mesures de securite",
  ];

  const exempleHumanix = [
    "Sensibilisation cyber (Humanix Academie)",
    "Former les collaborateurs a la securite informatique",
    "Interet legitime",
    "Collaborateurs inscrits",
    "Nom, e-mail professionnel, progression, resultats de quiz",
    "Humanix-Cybersecurity (sous-traitant), Scaleway (hebergeur, France)",
    "Non",
    "Duree du contrat + 1 an",
    "Chiffrement, cloisonnement par client, journalisation des acces",
  ];

  const amorces = [
    "Paie",
    "Recrutement",
    "Gestion des clients",
    "Controle d'acces (badges)",
    "Videosurveillance",
  ].map((nom) => [nom, "", "", "", "", "", "", "", ""]);

  return {
    nomFichier: `registre-traitements-${slug(nomEntreprise)}.csv`,
    typeMime: "text/csv; charset=utf-8",
    contenu: csv([entetes, exempleHumanix, ...amorces]),
  };
}

/**
 * Tableau des durees de conservation (art. 5.1.e).
 *
 * On distingue la duree en BASE ACTIVE de l'archivage : c'est la nuance qui
 * manque le plus souvent, et celle qui fait qu'un tableau tient devant un
 * controle.
 */
export function modeleDurees(nomEntreprise: string): Modele {
  const entetes = [
    "Traitement",
    "Duree en base active",
    "Archivage intermediaire",
    "Sort a l'issue",
    "Justification",
  ];
  const exemple = [
    "Candidatures non retenues",
    "Duree du recrutement",
    "2 ans apres le dernier contact",
    "Suppression",
    "Recommandation CNIL",
  ];
  const amorces = [
    "Paie",
    "Recrutement",
    "Clients",
    "Badges",
    "Videosurveillance",
  ].map((n) => [n, "", "", "", ""]);
  return {
    nomFichier: `durees-conservation-${slug(nomEntreprise)}.csv`,
    typeMime: "text/csv; charset=utf-8",
    contenu: csv([entetes, exemple, ...amorces]),
  };
}

/** Recensement des prestataires qui voient des donnees (art. 28). */
export function modeleSousTraitants(nomEntreprise: string): Modele {
  const entetes = [
    "Prestataire",
    "Ce qu'il fait pour nous",
    "Donnees auxquelles il accede",
    "Pays d'hebergement",
    "Contrat de sous-traitance signe",
    "Date de la derniere revue",
  ];
  const exemple = [
    "Humanix-Cybersecurity",
    "Plateforme de sensibilisation cyber",
    "Nom, e-mail pro, progression",
    "France (Scaleway)",
    "Oui",
    "",
  ];
  const amorces = [
    "Cabinet comptable",
    "Logiciel de paie",
    "Hebergeur du site",
    "Outil de messagerie",
  ].map((n) => [n, "", "", "", "", ""]);
  return {
    nomFichier: `sous-traitants-${slug(nomEntreprise)}.csv`,
    typeMime: "text/csv; charset=utf-8",
    contenu: csv([entetes, exemple, ...amorces]),
  };
}

/**
 * Mention d'information (art. 13), a coller la ou on collecte.
 *
 * Texte a trous, et les trous sont explicites : une mention pre-remplie que
 * la personne signerait sans la lire serait pire qu'aucune mention.
 */
export function modeleMentionInformation(nomEntreprise: string): Modele {
  const contenu = `MENTION D'INFORMATION — a adapter, puis a placer la ou vous collectez
des donnees : contrat de travail, formulaire du site, affichage a l'entree.

Les crochets [...] sont des trous a remplir. Ne les laissez pas : une
mention approximative vaut mieux qu'une mention fausse, mais une mention
fausse est pire que rien.

---

${nomEntreprise} collecte et traite vos donnees personnelles.

Finalite : [pourquoi vous collectez ces donnees — ex. gerer la paie]

Base legale : [obligation legale / execution du contrat / interet legitime /
consentement — une seule, celle qui correspond vraiment]

Donnees collectees : [liste — ex. nom, prenom, NIR, coordonnees bancaires]

Destinataires : [qui y accede — service RH, cabinet comptable, editeur du
logiciel de paie]

Duree de conservation : [duree — ex. 5 ans apres la fin du contrat]

Vos droits : vous pouvez demander l'acces a vos donnees, leur rectification,
leur effacement, la limitation de leur traitement, ou vous opposer a
celui-ci. Vous pouvez egalement definir des directives sur leur sort apres
votre deces.

Pour exercer ces droits : [adresse e-mail ou postale dediee]

Vous pouvez introduire une reclamation aupres de la CNIL (www.cnil.fr).

---

RAPPEL : ce modele n'est pas un conseil juridique. Il vous donne la
structure attendue ; le contenu depend de votre situation.
`;
  return {
    nomFichier: `mention-information-${slug(nomEntreprise)}.txt`,
    typeMime: "text/plain; charset=utf-8",
    // CRLF : ce fichier finira ouvert dans un Bloc-notes Windows. Les
    // versions recentes gerent le LF seul, les anciennes affichent tout sur
    // une ligne -- et la personne conclura que le modele est casse.
    contenu: BOM + contenu.replace(/\n/g, "\r\n"),
  };
}

/**
 * Suivi des demandes de droits (art. 12 a 22).
 *
 * La colonne qui compte est l'echeance : un mois a compter de la reception,
 * et le delai court meme si la demande arrive par un courriel a l'accueil.
 */
export function modeleSuiviDemandes(nomEntreprise: string): Modele {
  const entetes = [
    "Date de reception",
    "Demandeur",
    "Nature de la demande",
    "ECHEANCE (1 mois)",
    "Identite verifiee",
    "Date de reponse",
    "Suite donnee",
  ];
  const exemple = [
    "2026-01-15",
    "Salarie — service comptabilite",
    "Acces a ses donnees",
    "2026-02-15",
    "Oui",
    "2026-01-28",
    "Copie transmise par courrier recommande",
  ];
  return {
    nomFichier: `suivi-demandes-droits-${slug(nomEntreprise)}.csv`,
    typeMime: "text/csv; charset=utf-8",
    contenu: csv([
      entetes,
      exemple,
      ...Array.from({ length: 5 }, () => Array(7).fill("")),
    ]),
  };
}

/** Quels modeles sont attaches a quelle etape du parcours. */
export const MODELES_PAR_ETAPE: Record<
  string,
  { libelle: string; fabrique: (nomEntreprise: string) => Modele }
> = {
  "registre-traitements": {
    libelle: "Registre pre-structure (tableur)",
    fabrique: modeleRegistre,
  },
  "durees-conservation": {
    libelle: "Tableau des durees (tableur)",
    fabrique: modeleDurees,
  },
  "sous-traitants": {
    libelle: "Recensement des prestataires (tableur)",
    fabrique: modeleSousTraitants,
  },
  "information-personnes": {
    libelle: "Mention d'information a trous",
    fabrique: modeleMentionInformation,
  },
  "demandes-personnes": {
    libelle: "Tableau de suivi des demandes (tableur)",
    fabrique: modeleSuiviDemandes,
  },
};

/** Nom de fichier sur : pas d'accent, pas d'espace, rien d'exotique. */
function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "entreprise"
  );
}
