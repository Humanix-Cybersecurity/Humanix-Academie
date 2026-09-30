// SPDX-License-Identifier: AGPL-3.0-or-later
// Lecture et validation du formulaire des regles (page /admin/regles).
// Pur : pas de base, pas de session, testable avec un FormData.
import { estTypeOrganisation, type TypeOrganisation } from "./regles";

export type ReglesInput = {
  typeOrganisation: TypeOrganisation;
  nomOrganisation: string;
  nomSignataire: string | null;
  fonctionSignataire: string | null;
  referenceActe: string | null;
  dateSeance: Date | null;
  /** La case « adoptée » : l'organe deliberant a vote les regles. */
  adoptee: boolean;
};

export type ErreurRegles =
  | "type_invalide"
  | "nom_invalide"
  | "signataire_trop_long"
  | "fonction_trop_longue"
  | "reference_trop_longue"
  | "date_invalide";

export type LectureFormulaireRegles =
  { ok: true; input: ReglesInput } | { ok: false; erreur: ErreurRegles };

function champ(formData: FormData, nom: string): string {
  return String(formData.get(nom) ?? "").trim();
}

function optionnel(valeur: string, max: number): string | null {
  return valeur.length ? valeur.slice(0, max) : null;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** « AAAA-MM-JJ » (valeur d'un input date) → Date UTC minuit, ou null si vide. */
export function lireDateSeance(valeur: string): Date | null | "invalide" {
  if (!valeur) return null;
  const m = DATE_RE.exec(valeur);
  if (!m) return "invalide";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const coherente =
    d.getUTCFullYear() === Number(m[1]) &&
    d.getUTCMonth() === Number(m[2]) - 1 &&
    d.getUTCDate() === Number(m[3]);
  if (!coherente || d.getUTCFullYear() < 2000 || d.getUTCFullYear() > 2100) {
    return "invalide";
  }
  return d;
}

export function lireFormulaireRegles(
  formData: FormData,
): LectureFormulaireRegles {
  const type = champ(formData, "type");
  if (!estTypeOrganisation(type)) return { ok: false, erreur: "type_invalide" };

  const nomOrganisation = champ(formData, "nom");
  if (nomOrganisation.length < 2 || nomOrganisation.length > 120) {
    return { ok: false, erreur: "nom_invalide" };
  }
  const signataire = champ(formData, "signataire");
  if (signataire.length > 120) {
    return { ok: false, erreur: "signataire_trop_long" };
  }
  const fonction = champ(formData, "fonction");
  if (fonction.length > 80)
    return { ok: false, erreur: "fonction_trop_longue" };
  const reference = champ(formData, "reference");
  if (reference.length > 40) {
    return { ok: false, erreur: "reference_trop_longue" };
  }
  const date = lireDateSeance(champ(formData, "dateSeance"));
  if (date === "invalide") return { ok: false, erreur: "date_invalide" };

  return {
    ok: true,
    input: {
      typeOrganisation: type,
      nomOrganisation,
      nomSignataire: optionnel(signataire, 120),
      fonctionSignataire: optionnel(fonction, 80),
      referenceActe: optionnel(reference, 40),
      dateSeance: date,
      adoptee: champ(formData, "adoptee") === "on",
    },
  };
}

export const MESSAGES_ERREUR_REGLES: Record<ErreurRegles, string> = {
  type_invalide: "Le type d'organisation n'est pas reconnu.",
  nom_invalide:
    "Le nom de l'organisation doit faire entre 2 et 120 caractères.",
  signataire_trop_long: "Le nom du signataire est trop long (120 caractères).",
  fonction_trop_longue: "La fonction est trop longue (80 caractères).",
  reference_trop_longue:
    "La référence de l'acte est trop longue (40 caractères).",
  date_invalide: "La date de séance n'est pas valide.",
};
