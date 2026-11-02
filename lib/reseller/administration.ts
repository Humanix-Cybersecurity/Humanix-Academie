// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Gestion deleguee : ou un parent (revendeur, siege) administre un espace
// enfant. L'espace actif se resout par le NOM D'HOTE (lib/tenant-context.ts :
// slug ou brandSubdomain), donc administrer un enfant, c'est ouvrir son
// /admin sur son propre hote. Le sous-domaine de marque a priorite : c'est
// celui que l'enfant connait et que ses liens portent ; sinon le slug, qui
// est un hote valide aussi (DNS et certificat jokers).
//
// Fonctions pures : testees sans base ni requete.

export type EspaceAdressable = {
  slug: string;
  brandSubdomain: string | null;
};

/** Nom d'hote de l'espace : `acme.humanix-academie.fr`. */
export function hoteAdministration(
  espace: EspaceAdressable,
  rootDomain: string,
): string {
  return `${espace.brandSubdomain ?? espace.slug}.${rootDomain}`;
}

/** URL de l'administration de l'espace, ou d'une de ses pages. */
export function urlAdministration(
  espace: EspaceAdressable,
  rootDomain: string,
  chemin = "/admin",
): string {
  return `https://${hoteAdministration(espace, rootDomain)}${chemin}`;
}
