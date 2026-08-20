// SPDX-License-Identifier: AGPL-3.0-or-later
// Assemblage CSV RFC 4180 partagé par les exports admin.
//
// Séparé dans son propre module pour qu'il n'existe qu'UNE implémentation
// de l'anti CSV-injection : un futur durcissement doit s'appliquer à tous
// les exports d'un coup, pas endpoint par endpoint.

/** BOM UTF-8 : ouverture directe dans Excel sans corruption d'accents. */
export const CSV_BOM = "﻿";

/**
 * Échappe une cellule CSV selon RFC 4180 :
 * - si elle contient une virgule, des guillemets ou un saut de ligne,
 *   on l'entoure de guillemets et on double les guillemets internes
 * - anti CSV-injection : préfixe les cellules débutant par = + - @ (ou
 *   tab/CR) pour qu'Excel/Sheets ne les interprète pas comme des formules
 */
export function csvEscape(
  v: string | number | null | undefined,
  separateur = ",",
): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  // On protege sur LE separateur reellement utilise : avec « ; », une cellule
  // contenant une virgule n'a pas besoin de guillemets, et inversement.
  if (s.includes(separateur) || /["\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Assemble un document CSV complet (BOM + CRLF + ligne finale) à partir
 * d'un header et de rows. Chaque cellule passe par csvEscape.
 */
export function buildCsv(
  header: string[],
  rows: (string | number | null | undefined)[][],
  /**
   * Separateur de colonnes. Virgule par defaut (RFC 4180), pour ne rien
   * changer aux exports existants.
   *
   * PASSER « ; » POUR UN EXPORT DESTINE A EXCEL EN FRANCAIS : la locale
   * francaise attend le point-virgule, et surtout les montants y portent une
   * VIRGULE decimale. Avec le separateur par defaut, chaque montant devrait
   * etre entoure de guillemets et la moindre erreur de citation eclate la
   * ligne en deux colonnes.
   */
  separateur: "," | ";" = ",",
): string {
  const ligne = (cells: (string | number | null | undefined)[]) =>
    cells.map((c) => csvEscape(c, separateur)).join(separateur);
  const lines = [ligne(header), ...rows.map(ligne)];
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}
