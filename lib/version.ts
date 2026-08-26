// SPDX-License-Identifier: AGPL-3.0-or-later
// Quelle revision tourne reellement.
//
// POURQUOI CE MODULE EXISTE
//
//   L'image ne portait aucun label de revision, `deploy.sh` ne journalisait
//   rien, et rien ne lit package.json au runtime. Pour repondre a « quelle
//   version tourne en production ? », il fallait ouvrir une session SSH et
//   lire le HEAD du clone -- c'est-a-dire disposer deja de l'acces que la
//   question cherche a economiser, souvent au pire moment.
//
//   `HUMANIX_REVISION` est pose au build par scripts/deploy.sh, via les
//   `args` du service app. Il peut legitimement etre absent : un fork qui
//   construit l'image a la main n'a aucune raison de le fournir.
//
// UNE VALEUR MAL FORMEE VAUT ABSENCE
//
//   Afficher « revision inconnue » est honnete. Afficher une chaine vide, un
//   « ${HUMANIX_REVISION} » non substitue ou un fragment tronque donnerait
//   une fausse assurance a qui compare deux instances.

export type RevisionDeployee = {
  /** SHA complet, ou null si absent ou mal forme. */
  revision: string | null;
  /** Les sept premiers caracteres, pour l'affichage. */
  courte: string | null;
  /** Branche ou tag demande au deploiement (ex. « main », « v1.6.0 »). */
  ref: string | null;
};

/** Un SHA git : hexadecimal, de 7 a 40 caracteres. */
const FORME_SHA = /^[0-9a-f]{7,40}$/;

function propre(v: string | undefined, maxLongueur: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  // Une substitution non resolue arrive telle quelle dans l'environnement.
  if (t.includes("$")) return null;
  return t.slice(0, maxLongueur);
}

export function revisionDeployee(
  env: Record<string, string | undefined> = process.env,
): RevisionDeployee {
  const brut = propre(env.HUMANIX_REVISION, 40);
  const revision =
    brut && FORME_SHA.test(brut.toLowerCase()) ? brut.toLowerCase() : null;

  return {
    revision,
    courte: revision ? revision.slice(0, 7) : null,
    ref: propre(env.HUMANIX_BUILD_REF, 100),
  };
}
