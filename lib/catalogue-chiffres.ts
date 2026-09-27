// SPDX-License-Identifier: AGPL-3.0-or-later
// Chiffres publics du catalogue, en un seul endroit.
//
// Pourquoi : les pages publiques (tarifs, comparatif, certificat, README,
// manifest) ont affiché « 58 saisons · 344 modules » pendant des mois alors
// que le catalogue en comptait 79 et 470. Un chiffre codé en dur dans chaque
// page se périme sans bruit. Ici, une seule source, et un test qui compare
// ces constantes au catalogue réel quand content-pro est présent
// (lib/catalogue-chiffres.test.ts). Le README, public/manifest.json et
// docs/OPEN_CORE.md n'importent rien : le même test vérifie qu'ils citent
// les mêmes chiffres.
//
// Mise à jour : relever avec `validateCatalog()` (prisma/catalog-saisons.ts)
// et les comptages listés ci-dessous, puis changer les valeurs ET la date.
export const CATALOGUE_CHIFFRES = {
  /** Saisons du catalogue commercial, hors démo. */
  saisons: 79,
  /** Épisodes (modules MDX) du catalogue commercial. */
  modules: 470,
  /** Enquêtes interactives premium (content-pro/content/enquetes). */
  enquetes: 27,
  /** Enquêtes gratuites livrées avec la Community Edition (content/enquetes-demo). */
  enquetesDemo: 3,
  /** Articles de la librairie (content-pro/lib/library-seed.ts). */
  articles: 38,
  /** Articles de la librairie dans la Community Edition (lib/library-seed-demo.ts). */
  articlesDemo: 8,
  /** Modules de la marketplace (content-pro/lib/marketplace-seed.ts). */
  modulesMarketplace: 30,
  /** Saisons de démonstration CC BY-SA (prisma/catalog-saisons-demo.ts). */
  saisonsDemo: 5,
  /** Date du relevé, AAAA-MM-JJ. */
  releveLe: "2026-09-27",
} as const;

/** « 79 saisons · 470 modules », le libellé court des pages publiques. */
export const LIBELLE_CATALOGUE = `${CATALOGUE_CHIFFRES.saisons} saisons · ${CATALOGUE_CHIFFRES.modules} modules`;
