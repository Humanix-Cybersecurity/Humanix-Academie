// SPDX-License-Identifier: AGPL-3.0-or-later
// Dans un composant client, une date s'affiche par lib/date-paris.ts, jamais
// par toLocaleString, toLocaleDateString, toLocaleTimeString ni
// Intl.DateTimeFormat.
//
// Un composant client est rendu deux fois : par le serveur (conteneur en
// UTC), puis par le navigateur a l'hydratation (fuseau de la personne). Une
// date formatee avec le fuseau du processus donne deux textes, React jette le
// HTML du serveur et recommence (erreur #418). Constate le 2026-11-02 sur
// /profil/securite, puis dans cinq autres composants d'administration. Les
// helpers de lib/date-paris.ts fixent le fuseau (Europe/Paris) et assemblent
// le texte eux-memes : meme resultat partout.
//
// Ce test lit les sources sans les importer. Les commentaires sont ignores.
// Limite connue : `uneDate.toLocaleString(...)` sur une variable deja typee
// Date n'est pas reconnu, le meme nom servant aux nombres ; seul l'appel
// precede de `new Date(...)` l'est.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DOSSIERS = ["app", "components", "lib"];

const MOTIFS: [string, RegExp][] = [
  ["toLocaleDateString", /\.toLocaleDateString\(/],
  ["toLocaleTimeString", /\.toLocaleTimeString\(/],
  ["new Date(...).toLocaleString", /new Date\([^()]*\)\s*\.toLocaleString\(/],
  ["Intl.DateTimeFormat", /\bIntl\.DateTimeFormat\(/],
];

function sources(dossier: string): string[] {
  const resultat: string[] = [];
  const parcourir = (d: string) => {
    for (const nom of readdirSync(d)) {
      const chemin = path.join(d, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) {
        resultat.push(chemin);
      }
    }
  };
  parcourir(path.join(RACINE, dossier));
  return resultat;
}

/** Vrai si la premiere instruction du fichier est la directive "use client". */
function estComposantClient(source: string): boolean {
  const sansCommentaires = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return /^\s*["']use client["']/.test(sansCommentaires);
}

// Lignes de code : sans les commentaires de ligne ni les blocs de commentaire.
function lignesDeCode(source: string): string[] {
  const sansBlocs = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return sansBlocs
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .filter((l) => l.trim().length > 0);
}

const fichiersClient = DOSSIERS.flatMap(sources).filter((f) =>
  estComposantClient(readFileSync(f, "utf8")),
);

describe("dates dans les composants client", () => {
  it("parcourt bien les composants client (au moins 100 fichiers)", () => {
    expect(fichiersClient.length).toBeGreaterThanOrEqual(100);
  });

  it.each(fichiersClient.map((f) => [path.relative(RACINE, f), f]))(
    "%s formate ses dates par lib/date-paris",
    (_relatif, fichier) => {
      const fautives = lignesDeCode(readFileSync(fichier, "utf8")).flatMap(
        (ligne) =>
          MOTIFS.filter(([, motif]) => motif.test(ligne)).map(
            ([nom]) => `${nom} : ${ligne.trim()}`,
          ),
      );
      expect(fautives).toEqual([]);
    },
  );
});
