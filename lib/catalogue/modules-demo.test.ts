// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATALOG_SAISONS_DEMO } from "@/prisma/catalog-saisons-demo";

import { compterModulesDemo } from "./modules-demo";

// Le chargeur est remplace : on fixe ce qu'il sert, on verifie le compte.
const listEpisodes = vi.hoisted(() =>
  vi.fn<(saisonSlug: string) => string[]>(),
);
vi.mock("@/lib/episodes", () => ({ listEpisodes }));

const totalDuCatalogue = CATALOG_SAISONS_DEMO.reduce(
  (somme, saison) => somme + saison.episodes.length,
  0,
);

function modulesDe(saisonSlug: string): string[] {
  const saison = CATALOG_SAISONS_DEMO.find((s) => s.slug === saisonSlug);
  if (!saison) throw new Error(`saison ${saisonSlug} absente du catalogue`);
  return saison.episodes.map((e) => e.slug);
}

beforeEach(() => {
  listEpisodes.mockReset();
});

describe("compterModulesDemo", () => {
  it("compte tous les modules du catalogue de demonstration", () => {
    listEpisodes.mockReturnValue([]);
    expect(compterModulesDemo().modules).toBe(totalDuCatalogue);
    expect(totalDuCatalogue).toBeGreaterThan(0);
  });

  it("ne compte aucun module redige quand le lecteur n'en sert aucun", () => {
    // Une instance commerciale dont le chargeur ne lit pas les saisons de
    // demo : tout s'y affiche en contenu generique, la note doit le dire.
    listEpisodes.mockReturnValue([]);
    expect(compterModulesDemo()).toEqual({
      modules: totalDuCatalogue,
      rediges: 0,
    });
  });

  it("compte rediges les modules que le lecteur sert, saison par saison", () => {
    listEpisodes.mockImplementation((saisonSlug) =>
      saisonSlug === "maitrise-ia"
        ? ["01-hallucinations", "03-atrophie-critique"]
        : modulesDe(saisonSlug),
    );
    const manquants = modulesDe("maitrise-ia").length - 2;
    expect(compterModulesDemo()).toEqual({
      modules: totalDuCatalogue,
      rediges: totalDuCatalogue - manquants,
    });
  });

  it("compte tout redige quand chaque module a son MDX", () => {
    listEpisodes.mockImplementation(modulesDe);
    expect(compterModulesDemo()).toEqual({
      modules: totalDuCatalogue,
      rediges: totalDuCatalogue,
    });
  });

  it("ignore un MDX que le catalogue ne declare pas", () => {
    // Un fichier en trop ne doit pas faire croire a un module redige de plus.
    listEpisodes.mockImplementation((saisonSlug) => [
      ...modulesDe(saisonSlug),
      "99-brouillon",
    ]);
    expect(compterModulesDemo().rediges).toBe(totalDuCatalogue);
  });

  it("interroge le chargeur une fois par saison du catalogue", () => {
    listEpisodes.mockReturnValue([]);
    compterModulesDemo();
    expect(listEpisodes.mock.calls.map(([slug]) => slug)).toEqual(
      CATALOG_SAISONS_DEMO.map((s) => s.slug),
    );
  });
});
