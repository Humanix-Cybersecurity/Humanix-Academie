// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULES_OPTIONNELS } from "./resoudre-contenu-optionnel";

const RACINE = resolve(import.meta.dirname, "..");
const LOADER = readFileSync(join(RACINE, "prisma/seed-data-loader.ts"), "utf8");

describe("modules optionnels", () => {
  it("declare les quatre modules de contenu commercial", () => {
    expect(MODULES_OPTIONNELS.map((m) => m.chemin).sort()).toEqual([
      "lib/anecdotes/seed-data.ts",
      "lib/library-seed.ts",
      "lib/marketplace-seed.ts",
      "prisma/catalog-saisons.ts",
    ]);
  });

  it("chaque module declare est IMPORTE par le loader", () => {
    // L'invariant le plus fragile du dispositif. Si quelqu'un ajoute un
    // import statique de contenu commercial dans seed-data-loader.ts sans
    // l'ajouter ici, aucun substitut ne sera genere : le build d'un fork
    // AGPLv3 echouera sur un module introuvable, et personne ne comprendra
    // pourquoi.
    for (const m of MODULES_OPTIONNELS) {
      const sansExtension = m.chemin.replace(/\.ts$/, "");
      const attendu = sansExtension.startsWith("prisma/")
        ? `./${sansExtension.slice("prisma/".length)}`
        : `../${sansExtension}`;
      expect(
        LOADER.includes(`from "${attendu}"`),
        `${m.chemin} devrait etre importe comme "${attendu}" dans seed-data-loader.ts`,
      ).toBe(true);
    }
  });

  it("chaque symbole declare est celui que le loader utilise", () => {
    for (const m of MODULES_OPTIONNELS) {
      expect(
        LOADER.includes(`import { ${m.symbole} }`),
        `le symbole ${m.symbole} devrait etre importe dans seed-data-loader.ts`,
      ).toBe(true);
    }
  });

  it("le loader n'utilise plus de require() dynamique", () => {
    // C'est la regression qu'on protege. Un `require()` reintroduit ferait
    // silencieusement dependre le catalogue du MODE D'EXECUTION : mesure du
    // 2026-08-12, meme code, 58 saisons en tsx contre 5 en bundle ESM.
    const lignesActives = LOADER.split("\n").filter(
      (l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"),
    );
    const suspectes = lignesActives.filter((l) => /\brequire\s*\(/.test(l));
    expect(
      suspectes,
      `require() dynamique detecte : ${suspectes.join(" | ")}`,
    ).toHaveLength(0);
  });

  it("chaque module a un role lisible, pour le message d'erreur", () => {
    // Le message affiche au developpeur liste les modules manquants avec
    // leur role. Un role vide rendrait ce message inutilisable.
    for (const m of MODULES_OPTIONNELS) {
      expect(m.role.length).toBeGreaterThan(10);
      expect(m.symbole).toMatch(/^[A-Z][A-Z_]+$/);
    }
  });
});
