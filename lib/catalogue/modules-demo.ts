// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Les modules des saisons de demonstration (CC BY-SA) : combien sont servis
// rediges, combien s'affichent en contenu generique.
//
// POURQUOI CE COMPTE EXISTE
//
//   La note de transparence de /comparatif disait « Aucun module ne repose
//   sur un fallback generique » des que les modules du catalogue commercial
//   avaient tous leur MDX. Or le service propose aussi les saisons de
//   demonstration, et l'une d'elles (maitrise-ia) a des modules sans MDX :
//   ils s'affichent en contenu generique, sous un bandeau. La note parlait
//   donc pour tous les modules en n'en ayant compte qu'une partie.
//
// POURQUOI PASSER PAR LE CHARGEUR, ET PAS LIRE LE DOSSIER
//
//   « Redige » veut dire ici « que le lecteur servira redige ». On pose donc
//   la question a lib/episodes.ts, qui tranche selon le mode de l'instance.
//   Compter les fichiers de content/saisons-demo de son cote, c'est annoncer
//   un texte que l'instance ne sert peut-etre pas.

import { listEpisodes } from "@/lib/episodes";
import { CATALOG_SAISONS_DEMO } from "@/prisma/catalog-saisons-demo";

export type ModulesDemo = {
  /** Modules declares par le catalogue de demonstration. */
  modules: number;
  /** Ceux que le lecteur sert depuis un MDX. */
  rediges: number;
};

export function compterModulesDemo(): ModulesDemo {
  let modules = 0;
  let rediges = 0;
  for (const saison of CATALOG_SAISONS_DEMO) {
    const avecMdx = new Set(listEpisodes(saison.slug));
    modules += saison.episodes.length;
    rediges += saison.episodes.filter((e) => avecMdx.has(e.slug)).length;
  }
  return { modules, rediges };
}
