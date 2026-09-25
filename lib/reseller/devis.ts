// SPDX-License-Identifier: AGPL-3.0-or-later
// Lecture des parametres d'un devis revendeur (formulaire et route PDF) :
// pur, borne, testable.
import { GRILLE_REVENDEUR, simulerRevendeur } from "./tarification";
import type { CalculRevendeur } from "./tarification";

export type ParametresDevis = {
  prospect: string;
  nbEspaces: number;
  utilisateursParEspace: number;
};

export const LIMITES_DEVIS = {
  nbEspacesMax: 500,
  utilisateursParEspaceMax: 5000,
};

/** Renvoie null si les parametres sont absents ou hors bornes. */
export function lireParametresDevis(
  brut: Record<string, string | string[] | undefined>,
): ParametresDevis | null {
  const un = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  const prospect = un(brut.prospect).slice(0, 120);
  // Entier strict : parseInt("2.5") vaudrait 2 et masquerait une saisie fausse.
  const entier = (v: string) => (/^\d{1,6}$/.test(v) ? Number(v) : Number.NaN);
  const nbEspaces = entier(un(brut.espaces));
  const utilisateursParEspace = entier(un(brut.utilisateurs));
  if (!prospect) return null;
  if (
    !Number.isInteger(nbEspaces) ||
    nbEspaces < 1 ||
    nbEspaces > LIMITES_DEVIS.nbEspacesMax
  ) {
    return null;
  }
  if (
    !Number.isInteger(utilisateursParEspace) ||
    utilisateursParEspace < 1 ||
    utilisateursParEspace > LIMITES_DEVIS.utilisateursParEspaceMax
  ) {
    return null;
  }
  return { prospect, nbEspaces, utilisateursParEspace };
}

export function referenceDevis(prospect: string, date = new Date()): string {
  const jour = date.toISOString().slice(0, 10).replace(/-/g, "");
  const slug =
    prospect
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8) || "PROSPECT";
  return `DEV-${jour}-${slug}`;
}

export function dateValidite(date = new Date()): Date {
  return new Date(
    date.getTime() + GRILLE_REVENDEUR.validiteDevisJours * 86400000,
  );
}

export function calculerDevis(p: ParametresDevis): CalculRevendeur {
  return simulerRevendeur({
    nbEspaces: p.nbEspaces,
    utilisateursParEspace: p.utilisateursParEspace,
  });
}
