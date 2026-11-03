// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// Familles de saisons : la seule liste, partagée par le catalogue
// (prisma/catalog-tags.ts), le tableau /admin/modules et l'accordéon
// /apprendre.
//
// Une saison porte au plus un tag `famille:<id>`, posé par le catalogue au
// seed. Les deux interfaces en déduisent une catégorie d'affichage : la
// famille, ou le repli « autres » quand la saison n'a aucun tag famille
// connu (module installé depuis la marketplace, tag absent ou inconnu).
//
// Pourquoi un module à part : l'accordéon apprenant (juin 2026) et le
// tableau admin gardaient chacun une copie à quatre familles. La famille
// « sectoriel », créée le lendemain de l'accordéon, n'y a jamais été
// ajoutée : dix-sept saisons tombaient dans « Autres parcours » côté
// apprenant et, sans un mot, dans « Tout public » côté admin. Les libellés
// sont typés sur la liste : ajouter une famille sans ses libellés ne
// compile plus.
// =============================================================================

/** Familles du catalogue, dans l'ordre d'affichage (du plus large au plus
 *  spécialisé). */
export const FAMILLES = [
  "public",
  "metier",
  "sectoriel",
  "conformite",
  "avance",
] as const;
export type Famille = (typeof FAMILLES)[number];

/** Repli commun aux deux interfaces : saison sans tag famille connu. */
export const SANS_FAMILLE = "autres";
export type Categorie = Famille | typeof SANS_FAMILLE;

/** Catégories dans l'ordre d'affichage : les familles, puis le repli. */
export const CATEGORIES: readonly Categorie[] = [...FAMILLES, SANS_FAMILLE];

const PREFIXE_TAG = "famille:";

function estFamille(valeur: string): valeur is Famille {
  return (FAMILLES as readonly string[]).includes(valeur);
}

/**
 * Famille d'une saison d'après ses tags, ou null sans tag `famille:*` connu.
 * Un tag inconnu (`famille:xyz`) vaut absence : mieux vaut le voir dans
 * « Autres parcours » que le fondre en silence dans une famille.
 */
export function familleDepuisTags(tags: readonly string[]): Famille | null {
  for (const tag of tags) {
    if (!tag.startsWith(PREFIXE_TAG)) continue;
    const valeur = tag.slice(PREFIXE_TAG.length);
    if (estFamille(valeur)) return valeur;
  }
  return null;
}

/** Catégorie d'affichage : la famille, sinon le repli. */
export function categorieDepuisTags(tags: readonly string[]): Categorie {
  return familleDepuisTags(tags) ?? SANS_FAMILLE;
}

export type Libelle = { label: string; emoji: string; description: string };

/** Libellés du back-office (/admin/modules). */
export const LIBELLES_ADMIN: Record<Categorie, Libelle> = {
  public: {
    label: "Tout public",
    emoji: "👥",
    description:
      "Modules accessibles à tout le monde, sans prérequis informatique.",
  },
  metier: {
    label: "Métiers",
    emoji: "🎯",
    description:
      "Spécialisés par fonction : RH, compta, dev, direction, commercial.",
  },
  sectoriel: {
    label: "Sectoriel",
    emoji: "🏛️",
    description:
      "Adaptés à un secteur : santé, collectivités, éducation, industrie, BTP, commerce.",
  },
  conformite: {
    label: "Conformité",
    emoji: "📋",
    description:
      "NIS2, RGPD, réglementations sectorielles. Pour DPO et direction.",
  },
  avance: {
    label: "Avancé",
    emoji: "🚀",
    description: "Sujets pointus : crise cyber, supply chain, remédiation.",
  },
  autres: {
    label: "Autres parcours",
    emoji: "✨",
    description:
      "Modules sans famille (marketplace, tag absent) : affichés sous ce même nom côté apprenant.",
  },
};

/** Libellés côté apprenant (/apprendre). */
export const LIBELLES_APPRENANT: Record<
  Categorie,
  { label: string; emoji: string }
> = {
  public: { label: "Fondamentaux - pour tout le monde", emoji: "🌱" },
  metier: { label: "Par métier", emoji: "💼" },
  sectoriel: { label: "Par secteur d'activité", emoji: "🏛️" },
  conformite: { label: "Conformité & réglementaire", emoji: "⚖️" },
  avance: { label: "Pour aller plus loin", emoji: "🚀" },
  autres: { label: "Autres parcours", emoji: "✨" },
};
