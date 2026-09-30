// SPDX-License-Identifier: AGPL-3.0-or-later
// Construit le texte de l'acte (deliberation ou decision) a partir de l'etat
// du tenant : en-tete, visas, considerants, articles, signature, annexe.
// Pur et teste ; le PDF (pdf.tsx) ne fait que le mettre en page.
import {
  contracter,
  engagementsPour,
  NOMBRE_REGLES,
  reglesPour,
  VOCABULAIRE,
  type Regle,
  type TypeOrganisation,
} from "./regles";

export type ParametresActe = {
  typeOrganisation: TypeOrganisation;
  nomOrganisation: string;
  nomSignataire: string | null;
  fonctionSignataire: string | null;
  referenceActe: string | null;
  dateSeance: Date | null;
  adopteeLe: Date | null;
  /** Date de generation, pour le pied de page. */
  genereLe: Date;
};

export type TexteActe = {
  /** Lignes d'en-tete : nom de l'organisation, registre, seance, numero. */
  entete: string[];
  objet: string;
  preambule: string;
  visas: string[];
  considerants: string[];
  articles: { numero: number; texte: string }[];
  /** « Après en avoir délibéré, le conseil municipal DÉCIDE : » ou « DÉCIDE : ». */
  decide: string;
  cloture: string[];
  signature: { fonction: string; nom: string };
  annexeTitre: string;
  regles: Regle[];
  /** Mention en pied de page. */
  mention: string;
  /** Nom de fichier propose au telechargement. */
  nomFichier: string;
};

/** Un champ vide devient une ligne de points a completer a la main. */
export const BLANC = "..............................";

const NOMS_NOMBRES = [
  "",
  "une",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
];

export function enLettres(n: number): string {
  return NOMS_NOMBRES[n] ?? String(n);
}

export function dateLongue(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function texteActe(p: ParametresActe): TexteActe {
  const v = VOCABULAIRE[p.typeOrganisation];
  const regles = reglesPour(p.typeOrganisation);
  const engagements = engagementsPour(p.typeOrganisation);
  const seance = p.dateSeance ? dateLongue(p.dateSeance) : BLANC;
  const reference = p.referenceActe ?? BLANC;
  const nomSignataire = p.nomSignataire ?? BLANC;
  const fonction = p.fonctionSignataire ?? v.fonctionSignataire;
  const nb = enLettres(NOMBRE_REGLES);
  const estCollectivite = p.typeOrganisation !== "entreprise";

  const entete = [
    p.nomOrganisation.toUpperCase(),
    v.registre,
    estCollectivite ? `Séance du ${seance}` : `Décision du ${seance}`,
    `${majuscule(v.acte)} n° ${reference}`,
  ];

  const preambule = estCollectivite
    ? `${majuscule(v.organe)}, légalement convoqué, s'est réuni le ${seance} sous la présidence de ${nomSignataire}, ${fonction.toLowerCase()}.`
    : `${majuscule(v.organe)} de ${p.nomOrganisation}, représentée par ${nomSignataire}, en qualité de ${p.fonctionSignataire ?? BLANC}, prend la décision suivante.`;

  const considerants = [
    `que la sécurité numérique de ${v.collectivite} repose d'abord sur des règles simples, connues de tous et soutenues par ${v.signataire}, avant tout équipement ;`,
    `que les attaques qui visent ${v.collectivite} passent par ses personnes : un ordre de paiement imité, une demande d'information plausible, un compte partagé, une pression exercée sur une personne seule ;`,
    `qu'il appartient ${contracter(v.organe)} de dire que le refus ou le délai imposé par ces règles est attendu et couvert, pour que personne n'ait à décider seul au pire moment ;`,
  ];

  const articles = [
    {
      numero: 1,
      texte: `${majuscule(v.organe)} adopte les ${nb} règles de sécurité numérique de ${v.collectivite} annexées au présent acte, dans leur version ${VERSION_TEXTE}.`,
    },
    {
      numero: 2,
      texte: `Ces règles s'appliquent ${v.auxAgents} de ${v.collectivite}, ainsi qu'aux remplacements et aux prestataires qui accèdent à ses outils. Le refus ou le délai qu'elles imposent ne peut donner lieu à aucun reproche ni à aucune sanction, y compris lorsque la demande émane de ${v.signataire}.`,
    },
    {
      numero: 3,
      texte: `${majuscule(v.signataire)} porte ces règles à la connaissance de chaque personne concernée, recueille son attestation de lecture et les affiche dans les lieux de travail.`,
    },
    {
      numero: 4,
      texte: `${majuscule(v.collectivite)} s'engage à : ${engagements.join(" ")}`,
    },
    {
      numero: 5,
      texte: estCollectivite
        ? `${majuscule(v.signataire)} est chargé de l'exécution de la présente ${v.acte}, qui sera transmise au représentant de l'État et publiée dans les conditions prévues par le code général des collectivités territoriales.`
        : `${majuscule(v.signataire)} est chargée de l'exécution de la présente décision et de sa diffusion.`,
    },
  ];

  const cloture = estCollectivite
    ? [
        "Fait et délibéré les jour, mois et an que dessus.",
        "Votants : ..........   Pour : ..........   Contre : ..........   Abstentions : ..........",
        "Pour extrait conforme,",
      ]
    : ["Fait le " + seance + ".", "Pour décision,"];

  const mention = `Modèle généré par Humanix Académie le ${dateLongue(p.genereLe)} à partir des règles version ${VERSION_TEXTE}, à adapter par ${estCollectivite ? "le secrétariat" : "l'organisation"} avant adoption ; ne constitue pas un conseil juridique.`;

  return {
    entete,
    objet: `Objet : adoption des règles de sécurité numérique de ${v.collectivite}`,
    preambule,
    visas: v.fondements.map((f) => `Vu ${f}\u00a0;`),
    considerants: considerants.map(
      (c) => `Considérant ${c.replace(/ ;$/, "\u00a0;")}`,
    ),
    articles,
    decide: estCollectivite
      ? `Après en avoir délibéré, ${v.organe} DÉCIDE :`
      : "DÉCIDE :",
    cloture,
    signature: { fonction, nom: nomSignataire },
    annexeTitre: `Annexe : les ${nb} règles de sécurité numérique de ${v.collectivite}`,
    regles,
    mention,
    nomFichier: `${slug(v.acte)}-regles-${slug(p.nomOrganisation) || "organisation"}.pdf`,
  };
}

/** Version des regles telle qu'ecrite dans l'acte (« 1 »). */
export const VERSION_TEXTE = "1";
