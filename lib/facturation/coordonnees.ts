// SPDX-License-Identifier: AGPL-3.0-or-later
// Validation et normalisation des coordonnees de facturation.
//
// Partagee par le checkout public et la console admin : les deux doivent
// appliquer EXACTEMENT les memes regles, sinon une adresse acceptee d'un cote
// serait refusee de l'autre -- et le client ne comprendrait pas pourquoi.

import { formeTvaIntraPlausible } from "./regime-tva";

export type CoordonneesBrutes = {
  raisonSociale?: unknown;
  adresse?: unknown;
  codePostal?: unknown;
  ville?: unknown;
  pays?: unknown;
  siren?: unknown;
  tvaIntra?: unknown;
};

export type Coordonnees = {
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  pays: string;
  siren: string | null;
  tvaIntra: string | null;
};

export type Validation =
  { ok: true; valeur: Coordonnees } | { ok: false; erreur: string };

const MAX = {
  raisonSociale: 200,
  adresse: 200,
  codePostal: 20,
  ville: 100,
  siren: 20,
  tvaIntra: 20,
} as const;

function propre(v: unknown, max: number): string {
  return String(v ?? "")
    .trim()
    .slice(0, max);
}

export function validerCoordonnees(brut: CoordonneesBrutes): Validation {
  const raisonSociale = propre(brut.raisonSociale, MAX.raisonSociale);
  const adresse = propre(brut.adresse, MAX.adresse);
  const codePostal = propre(brut.codePostal, MAX.codePostal);
  const ville = propre(brut.ville, MAX.ville);
  // Le pays n'est PAS tronque : on valide la saisie entiere.
  //
  // Tronquer a deux lettres transforme une faute de frappe en code valide mais
  // FAUX : « Allemagne » devient « AL », c'est-a-dire l'Albanie -- hors UE,
  // donc 0 % de TVA au lieu du regime allemand. Le test l'a attrape.
  const paysSaisi = String(brut.pays ?? "")
    .trim()
    .toUpperCase();
  const pays = paysSaisi || "FR";
  const siren = propre(brut.siren, MAX.siren) || null;
  const tvaIntra = propre(brut.tvaIntra, MAX.tvaIntra) || null;

  const manquants: string[] = [];
  if (!raisonSociale) manquants.push("la dénomination sociale");
  if (!adresse) manquants.push("l'adresse");
  if (!codePostal) manquants.push("le code postal");
  if (!ville) manquants.push("la ville");
  if (manquants.length > 0) {
    return { ok: false, erreur: `Il manque ${manquants.join(", ")}.` };
  }
  if (!/^[A-Z]{2}$/.test(pays)) {
    return {
      ok: false,
      erreur: "Le pays doit être un code à deux lettres (FR, BE, DE...).",
    };
  }
  // Un numero mal forme est REFUSE, pas ignore : ignore, il ferait croire a
  // une autoliquidation qui ne s'appliquerait pas.
  if (tvaIntra && !formeTvaIntraPlausible(tvaIntra)) {
    return {
      ok: false,
      erreur:
        "Le numéro de TVA intracommunautaire est mal formé (ex. FR80103901799).",
    };
  }
  return {
    ok: true,
    valeur: {
      raisonSociale,
      adresse,
      codePostal,
      ville,
      pays,
      siren,
      tvaIntra,
    },
  };
}
