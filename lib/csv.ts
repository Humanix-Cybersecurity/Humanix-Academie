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
export function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
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
): string {
  const lines = [
    header.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}
