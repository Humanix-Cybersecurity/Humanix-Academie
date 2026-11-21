// SPDX-License-Identifier: AGPL-3.0-or-later
// Ce que /comparatif affirme sur les modules rediges. La page perd sa
// valeur le jour ou elle dit plus que ce qui a ete compte : chaque
// formulation de la note est fixee ici.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ModulesTransparencyNote from "@/components/comparatif/ModulesTransparencyNote";

// Hors de Next, <Link> est remplace par une coquille.
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: (p: { href: string; children?: React.ReactNode }) =>
      React.createElement("a", { href: p.href }, p.children),
  };
});

type Chiffres = {
  catalogueModules: number;
  catalogueWritten: number;
  demoModules: number;
  demoWritten: number;
};

/** Le texte affiche, sans balises, espaces reduits. */
function texte(chiffres: Chiffres): string {
  const html = renderToStaticMarkup(
    <ModulesTransparencyNote demoSaisons={5} {...chiffres} />,
  );
  return html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const catalogueComplet = { catalogueModules: 476, catalogueWritten: 476 };

describe("note de transparence des modules", () => {
  it("annonce le catalogue et le nombre de modules rediges", () => {
    const t = texte({ ...catalogueComplet, demoModules: 28, demoWritten: 19 });
    expect(t).toContain("Notre catalogue affiche 476 modules.");
    expect(t).toContain(
      "476 épisodes ont un scénario détaillé rédigé par un expert",
    );
  });

  it("ne conclut que sur le catalogue quand il est entierement redige", () => {
    const t = texte({ ...catalogueComplet, demoModules: 28, demoWritten: 19 });
    expect(t).toContain(
      "Aucun module de ce catalogue ne repose sur un fallback générique.",
    );
    // L'ancienne formule parlait pour tous les modules du service.
    expect(t).not.toContain("Aucun module ne repose");
  });

  it("dit combien de modules de demonstration n'ont pas leur scenario", () => {
    const t = texte({ ...catalogueComplet, demoModules: 28, demoWritten: 19 });
    expect(t).toContain(
      "S'y ajoutent les 5 saisons de démonstration (CC BY-SA) : 28 modules, dont 9 n'ont pas encore leur scénario.",
    );
    expect(t).toContain(
      "Ceux-là utilisent un contenu générique (questions, quiz, débrief), signalé par un bandeau en tête de module.",
    );
  });

  it("accorde au singulier quand un seul module attend son scenario", () => {
    const t = texte({ ...catalogueComplet, demoModules: 28, demoWritten: 27 });
    expect(t).toContain("28 modules, dont 1 n'a pas encore son scénario.");
    expect(t).toContain("Celui-là utilise un contenu générique");
  });

  it("dit que tout est redige quand c'est le cas", () => {
    const t = texte({ ...catalogueComplet, demoModules: 28, demoWritten: 28 });
    expect(t).toContain(
      "S'y ajoutent les 5 saisons de démonstration (CC BY-SA) : 28 modules, tous rédigés.",
    );
    expect(t).not.toContain("contenu générique");
    expect(t).not.toContain("pas encore");
  });

  it("dit tout quand aucun module de demonstration n'est servi redige", () => {
    const t = texte({ ...catalogueComplet, demoModules: 28, demoWritten: 0 });
    expect(t).toContain("28 modules, dont 28 n'ont pas encore leur scénario.");
  });

  it("garde l'aveu du repli quand le catalogue n'est pas entierement redige", () => {
    const t = texte({
      catalogueModules: 476,
      catalogueWritten: 470,
      demoModules: 28,
      demoWritten: 28,
    });
    expect(t).toContain("470 épisodes ont un scénario détaillé");
    expect(t).toContain("Les autres utilisent un fallback structuré");
    expect(t).not.toContain("Aucun module de ce catalogue");
  });

  it("accorde au singulier un catalogue a un seul module redige", () => {
    const t = texte({
      catalogueModules: 476,
      catalogueWritten: 1,
      demoModules: 0,
      demoWritten: 0,
    });
    expect(t).toContain("1 épisode a un scénario détaillé");
  });

  it("ne parle pas des saisons de demonstration s'il n'y en a pas", () => {
    const t = texte({ ...catalogueComplet, demoModules: 0, demoWritten: 0 });
    expect(t).not.toContain("saisons de démonstration");
  });

  it("ne pretend jamais qu'un module redige en trop efface un manque", () => {
    // Un compte superieur au catalogue ne doit pas produire de nombre negatif.
    const t = texte({ ...catalogueComplet, demoModules: 28, demoWritten: 30 });
    expect(t).toContain("28 modules, tous rédigés.");
    expect(t).not.toContain("-2");
  });

  it("renvoie vers /apprendre", () => {
    const html = renderToStaticMarkup(
      <ModulesTransparencyNote
        demoSaisons={5}
        {...catalogueComplet}
        demoModules={28}
        demoWritten={19}
      />,
    );
    expect(html).toContain('href="/apprendre"');
  });
});
