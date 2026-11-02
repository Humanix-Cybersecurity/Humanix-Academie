// SPDX-License-Identifier: AGPL-3.0-or-later
// L'administration agit dans l'espace ACTIF, jamais dans l'espace d'origine.
//
// L'espace actif est celui du sous-domaine quand l'utilisateur y a acces
// (acces externe, gestion deleguee, SUPERADMIN), sinon l'espace d'origine.
// Il se resout en un seul endroit, lib/current-tenant.ts. Lire
// `session.user.tenantId` dans une page, une action ou une route
// d'administration, c'est agir sur l'espace d'origine pendant que le bandeau
// annonce l'autre : entre le 2026-05-23 (arrivee des acces croises) et le
// 2026-11-02, quarante fichiers le faisaient encore, dont Groupes et Modules.
//
// Ce test lit les sources sans les importer. Les commentaires sont ignores :
// ils peuvent raconter l'histoire, le code ne peut plus la rejouer.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/** Dossiers ou l'espace actif doit toujours venir de lib/current-tenant. */
const DOSSIERS = ["app/admin", "app/api/admin", "lib/impersonation"];

const MOTIF = /session[?!]*\.user[?!]*\.tenantId/;

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

// Lignes de code : sans les commentaires de ligne ni les blocs de commentaire.
function lignesDeCode(source: string): string[] {
  const sansBlocs = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return sansBlocs
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .filter((l) => l.trim().length > 0);
}

const fichiers = DOSSIERS.flatMap(sources);

describe("espace actif dans l'administration", () => {
  it("parcourt bien l'administration (au moins 120 fichiers)", () => {
    expect(fichiers.length).toBeGreaterThanOrEqual(120);
  });

  it.each(fichiers.map((f) => [path.relative(RACINE, f), f]))(
    "%s ne lit pas session.user.tenantId",
    (_relatif, fichier) => {
      const fautives = lignesDeCode(readFileSync(fichier, "utf8")).filter((l) =>
        MOTIF.test(l),
      );
      expect(fautives).toEqual([]);
    },
  );

  it("lib/current-tenant.ts reste le seul endroit qui decide de l'espace actif", () => {
    const source = readFileSync(
      path.join(RACINE, "lib/current-tenant.ts"),
      "utf8",
    );
    expect(source).toMatch(/export async function getCurrentTenantId\(/);
    expect(source).toMatch(/export async function getCurrentTenantAccess\(/);
  });
});
