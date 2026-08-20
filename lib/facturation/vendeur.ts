// SPDX-License-Identifier: AGPL-3.0-or-later
// Identite legale de l'emetteur des factures.
//
// Source : app/mentions-legales/page.tsx. Ces valeurs sont RECOPIEES dans le
// snapshot de chaque facture au moment de l'emission (cf. emettre.ts). Les
// modifier ici ne change donc RIEN aux factures deja emises -- c'est voulu :
// une facture ne se reecrit pas, elle s'annule par un avoir.

export type IdentiteVendeur = {
  raisonSociale: string;
  formeJuridique: string;
  capitalSocial: string;
  adresse: string;
  codePostal: string;
  ville: string;
  pays: string;
  siren: string;
  siret: string;
  rcs: string;
  tvaIntra: string;
  ape: string;
  email: string;
};

export const VENDEUR: IdentiteVendeur = {
  raisonSociale: "Humanix-Cybersecurity",
  formeJuridique: "SASU",
  capitalSocial: "100,00 €",
  adresse: "16 Rue Joseph Loiret",
  codePostal: "30100",
  ville: "Alès",
  pays: "FR",
  siren: "103 901 799",
  siret: "103 901 799 00017",
  rcs: "RCS Nîmes 103 901 799",
  tvaIntra: "FR 80 103 901 799",
  ape: "6202A",
  email: "contact@humanix-cybersecurity.fr",
};
