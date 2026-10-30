// SPDX-License-Identifier: AGPL-3.0-or-later
// Rapprocher des libelles de groupes saisis dans un import avec les groupes
// de l'espace.
//
// L'import CSV accepte une colonne `groupes` (plusieurs valeurs separees
// par « ; », « | » ou « , ») et, a defaut, rapproche le `service` du
// fichier d'un groupe existant. On compare sans accents, sans casse et
// sans espaces superflus, sur le slug ou sur le nom. On ne cree JAMAIS un
// groupe depuis un texte libre : un libelle inconnu est signale, pas
// invente.

export type GroupeRapprochable = { id: string; slug: string; name: string };

/** « Ressources  Humaines » -> « ressources humaines », « Compta » -> « compta ». */
export function normaliserLibelle(libelle: string): string {
  return libelle
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Decoupe une cellule « compta; rh | direction » en libelles non vides. */
export function decouperGroupes(cellule: string | null | undefined): string[] {
  if (!cellule) return [];
  return cellule
    .split(/[;|,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Rapproche des libelles des groupes de l'espace. Un libelle correspond a un
 * groupe si, normalises, il est egal a son slug ou a son nom. Les doublons
 * sont fusionnes, les inconnus rendus tels quels pour le compte rendu.
 */
export function rapprocherGroupes(
  libelles: readonly string[],
  groupes: readonly GroupeRapprochable[],
): { trouves: GroupeRapprochable[]; inconnus: string[] } {
  const index = new Map<string, GroupeRapprochable>();
  for (const g of groupes) {
    index.set(normaliserLibelle(g.slug), g);
    index.set(normaliserLibelle(g.name), g);
  }
  const trouves = new Map<string, GroupeRapprochable>();
  const inconnus = new Map<string, string>();
  for (const libelle of libelles) {
    const cle = normaliserLibelle(libelle);
    if (!cle) continue;
    const g = index.get(cle);
    if (g) trouves.set(g.id, g);
    else if (!inconnus.has(cle)) inconnus.set(cle, libelle.trim());
  }
  return {
    trouves: Array.from(trouves.values()),
    inconnus: Array.from(inconnus.values()),
  };
}
