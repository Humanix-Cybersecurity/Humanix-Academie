// SPDX-License-Identifier: AGPL-3.0-or-later
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE_CHIFFRES } from "./catalogue-chiffres";

const racine = join(__dirname, "..");
// Le vrai fichier, pas le symlink prisma/catalog-saisons.ts : en CI le
// submodule privé est absent et le symlink est résolu vers un stub OSS.
const catalogueCommercial = join(
  racine,
  "content-pro",
  "prisma",
  "catalog-saisons.ts",
);
const contentProPresent = existsSync(catalogueCommercial);

describe("chiffres publics du catalogue", () => {
  it.skipIf(!contentProPresent)(
    "correspondent au catalogue commercial réel",
    async () => {
      // Chemin variable : tsc ne doit pas résoudre ce module, absent en CI.
      const mod = (await import(/* @vite-ignore */ catalogueCommercial)) as {
        validateCatalog: () => { totalSaisons: number; totalEpisodes: number };
      };
      const reel = mod.validateCatalog();
      expect({
        saisons: reel.totalSaisons,
        modules: reel.totalEpisodes,
      }).toEqual({
        saisons: CATALOGUE_CHIFFRES.saisons,
        modules: CATALOGUE_CHIFFRES.modules,
      });
      const enquetes = readdirSync(
        join(racine, "content-pro", "content", "enquetes"),
      ).filter((f) => f.endsWith(".mdx")).length;
      expect(enquetes).toBe(CATALOGUE_CHIFFRES.enquetes);
    },
  );

  it("correspondent au contenu livré avec la Community Edition", async () => {
    const enquetesDemo = readdirSync(
      join(racine, "content", "enquetes-demo"),
    ).filter((f) => f.endsWith(".mdx")).length;
    expect(enquetesDemo).toBe(CATALOGUE_CHIFFRES.enquetesDemo);
    const demo = (await import("../prisma/catalog-saisons-demo")) as Record<
      string,
      unknown
    >;
    const saisonsDemo = Object.values(demo).find((v) =>
      Array.isArray(v),
    ) as unknown[];
    expect(saisonsDemo).toHaveLength(CATALOGUE_CHIFFRES.saisonsDemo);
  });

  it("sont repris tels quels par le README, le manifest et la doc open core", () => {
    const fichiers = ["README.md", "public/manifest.json", "docs/OPEN_CORE.md"];
    for (const fichier of fichiers) {
      const texte = readFileSync(join(racine, fichier), "utf8");
      // « 5 saisons démo » (un chiffre) reste hors du contrôle : seuls les
      // nombres à deux ou trois chiffres désignent le catalogue commercial.
      for (const m of texte.matchAll(/\b(\d{2,3}) saisons\b/g)) {
        expect(Number(m[1]), `${fichier} : « ${m[0]} »`).toBe(
          CATALOGUE_CHIFFRES.saisons,
        );
      }
      for (const m of texte.matchAll(
        /\b(\d{3}) (?:modules|épisodes|episodes|MDX)\b/g,
      )) {
        expect(Number(m[1]), `${fichier} : « ${m[0]} »`).toBe(
          CATALOGUE_CHIFFRES.modules,
        );
      }
    }
    expect(
      readFileSync(join(racine, "public", "manifest.json"), "utf8"),
    ).toContain(`${CATALOGUE_CHIFFRES.modules} modules`);
  });

  it("sont importés par chaque page publique qui cite le catalogue", () => {
    // La page d'accueil a gardé « 344 modules » en dur pendant des mois
    // après la centralisation (#916) : une page publique qui cite le
    // catalogue doit lire la constante, jamais un littéral.
    const pages = [
      "components/home/ProofSection.tsx",
      "app/tarifs/page.tsx",
      "app/comparatif/page.tsx",
      "app/certificat/page.tsx",
      "app/marketplace/page.tsx",
    ];
    for (const page of pages) {
      const source = readFileSync(join(racine, page), "utf8");
      expect(source, `${page} doit importer lib/catalogue-chiffres`).toMatch(
        /from "[^"]*lib\/catalogue-chiffres"/,
      );
    }
  });
});
