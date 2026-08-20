// SPDX-License-Identifier: AGPL-3.0-or-later
// Verification d'un numero de TVA intracommunautaire aupres de VIES.
//
// LE PIEGE, ET IL EST SERIEUX
//
//   L'API renvoie `isValid: false` DANS DEUX SITUATIONS OPPOSEES :
//
//     { "isValid": false, "userError": "INVALID" }
//         -> le numero n'existe pas. Reponse ferme.
//
//     { "isValid": false, "userError": "MS_MAX_CONCURRENT_REQ" }
//         -> le service de l'Etat membre est occupe. On NE SAIT PAS.
//
//   Constate en interrogeant l'API le 2026-08-20 : le meme numero, valide, a
//   d'abord repondu `false / MS_MAX_CONCURRENT_REQ` puis `true / VALID`.
//   Lire `isValid` seul reviendrait a declarer faux un numero parfaitement
//   valide -- et a le refacturer avec TVA sans que personne ne comprenne
//   pourquoi.
//
//   D'ou un resultat a TROIS etats, jamais deux.
//
// POLITIQUE EN CAS DE DOUTE : on facture la TVA francaise. Une exoneration
// accordee a tort se paie en redressement ; une TVA facturee a tort se
// corrige par un avoir.

import { normaliserTvaIntra } from "./regime-tva";

const RACINE = "https://ec.europa.eu/taxation_customs/vies/rest-api/ms";
const DELAI_MS = 8000;

export type ResultatVies =
  | { statut: "valide"; nom: string | null; adresse: string | null }
  | { statut: "invalide" }
  | { statut: "inconnu"; cause: string };

/** Codes `userError` qui signifient « le service n'a pas pu repondre ». */
const INDISPONIBLE = new Set([
  "MS_MAX_CONCURRENT_REQ",
  "GLOBAL_MAX_CONCURRENT_REQ",
  "MS_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
  "TIMEOUT",
  "SERVER_BUSY",
  "IP_BLOCKED",
]);

type ReponseVies = {
  isValid?: unknown;
  userError?: unknown;
  name?: unknown;
  address?: unknown;
};

/** VIES rend « --- » quand il n'a rien a dire : ce n'est pas une valeur. */
function texte(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" || t === "---" ? null : t;
}

/**
 * Interroge VIES. Ne leve jamais : un service tiers indisponible ne doit pas
 * empecher un client d'enregistrer ses coordonnees.
 */
export async function verifierTvaIntra(numero: string): Promise<ResultatVies> {
  const n = normaliserTvaIntra(numero);
  const pays = n.slice(0, 2);
  const reste = n.slice(2);
  if (!/^[A-Z]{2}$/.test(pays) || reste.length < 2) {
    return { statut: "invalide" };
  }

  let reponse: Response;
  try {
    reponse = await fetch(
      `${RACINE}/${pays}/vat/${encodeURIComponent(reste)}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(DELAI_MS),
        cache: "no-store",
      },
    );
  } catch (e) {
    return {
      statut: "inconnu",
      cause: e instanceof Error ? e.name : "reseau",
    };
  }

  if (!reponse.ok) {
    return { statut: "inconnu", cause: `http_${reponse.status}` };
  }

  let corps: ReponseVies;
  try {
    corps = (await reponse.json()) as ReponseVies;
  } catch {
    return { statut: "inconnu", cause: "reponse_illisible" };
  }

  const erreur = typeof corps.userError === "string" ? corps.userError : "";
  if (corps.isValid === true) {
    return {
      statut: "valide",
      nom: texte(corps.name),
      adresse: texte(corps.address),
    };
  }
  // ICI EST LE PIEGE : `isValid: false` ne suffit pas a conclure.
  if (INDISPONIBLE.has(erreur)) {
    return { statut: "inconnu", cause: erreur };
  }
  if (erreur === "INVALID" || erreur === "") {
    return { statut: "invalide" };
  }
  // Code inconnu : on ne devine pas, on refuse de conclure.
  return { statut: "inconnu", cause: erreur };
}
