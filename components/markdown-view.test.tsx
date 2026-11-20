// SPDX-License-Identifier: AGPL-3.0-or-later
// Ce que l'apprenant voit d'un debrief : MarkdownView rend le texte des
// episodes, des enquetes, de la librairie et des reponses de Hex.
//
// Les contenus sont ecrits avec des lignes repliees vers 66 colonnes.
// Jusqu'au 2026-11-20, une puce ecrite sur deux lignes sortait en deux
// listes separees par un paragraphe, une citation de huit lignes en huit
// encadres, et le gras d'une « regle d'or » gardait ses asterisques. Les
// cas de lib/markdown.test.ts fixent le parseur ; ceux-ci fixent le HTML.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MarkdownView from "@/components/MarkdownView";

// Hors de Next, <Link> est remplace par une coquille.
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: (p: { href: string; children?: React.ReactNode }) =>
      React.createElement("a", { href: p.href }, p.children),
  };
});

const html = (content: string) =>
  renderToStaticMarkup(<MarkdownView content={content} />);

/** Nombre de balises ouvrantes `<nom ...>` dans le HTML. */
const compte = (h: string, balise: string) =>
  (h.match(new RegExp(`<${balise}[ >]`, "g")) ?? []).length;

/**
 * Le texte lu a l'ecran : sans balises, entites decodees. Sans ce decodage,
 * un chevron ou un guillemet affiche (`&gt;`, `&quot;`) passerait inapercu.
 */
const texte = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

describe("MarkdownView - puces repliees", () => {
  // Forme reelle d'un debrief : puces repliees, gras, titre de section.
  const debrief = [
    "**Annexe I : secteurs hautement critiques**",
    "- Energie (electricite, reseaux de chaleur et de froid, petrole,",
    "  gaz, hydrogene)",
    "- **Infrastructure numerique** (DNS, **informatique en nuage**,",
    "  centres de donnees)",
    "- Moins de 50 personnes : **hors",
    "  perimetre**, sauf exceptions",
    "",
    "Paragraphe suivant.",
  ].join("\n");

  it("rend une seule liste, une ligne par puce", () => {
    const h = html(debrief);
    expect(compte(h, "ul")).toBe(1);
    expect(compte(h, "li")).toBe(3);
    // Titre de section et paragraphe final : rien entre les puces.
    expect(compte(h, "p")).toBe(2);
  });

  it("n'affiche aucun asterisque", () => {
    const h = html(debrief);
    expect(texte(h)).not.toContain("*");
    expect(h).toContain("<strong>hors perimetre</strong>");
    expect(h).toContain("<strong>informatique en nuage</strong>");
  });

  it("garde le texte entier de chaque puce", () => {
    expect(texte(html(debrief))).toContain(
      "Energie (electricite, reseaux de chaleur et de froid, petrole, gaz, hydrogene)",
    );
  });
});

describe("MarkdownView - citations", () => {
  const encadre = [
    "> **Ou en est la France ?** Point de novembre 2026 : la directive",
    "> NIS2 n'est pas encore transposee en droit francais. Le projet de",
    "> loi a ete vote par le Senat puis par l'Assemblee nationale, dans",
    "> des versions differentes.",
    "",
    "La directive **NIS2** est l'evolution majeure.",
  ].join("\n");

  it("rend un seul encadre pour une citation de plusieurs lignes", () => {
    const h = html(encadre);
    expect(compte(h, "blockquote")).toBe(1);
    expect(h).toContain("<strong>Ou en est la France ?</strong>");
    expect(texte(h)).toContain(
      "la directive NIS2 n'est pas encore transposee en droit francais.",
    );
  });

  it("referme le gras d'une regle d'or ecrite sur plusieurs lignes", () => {
    const h = html(
      [
        "> **NIS2 n'est pas une certification a obtenir, c'est une",
        "> demarche continue. 90 jours bien structures = bases solides",
        "> pour ameliorer dans le temps.**",
      ].join("\n"),
    );
    expect(compte(h, "blockquote")).toBe(1);
    expect(compte(h, "strong")).toBe(1);
    expect(texte(h)).not.toContain("*");
    expect(texte(h)).toBe(
      "NIS2 n'est pas une certification a obtenir, c'est une demarche continue. 90 jours bien structures = bases solides pour ameliorer dans le temps.",
    );
  });

  it("rend une liste citee comme une liste, sans chevron a l'ecran", () => {
    const h = html(
      [
        '> "Article 20 NIS2 : les organes de direction',
        "> - approuvent les mesures de gestion des risques",
        "> - supervisent leur mise en oeuvre",
        ">",
        '> Voila ce que prevoit le texte."',
      ].join("\n"),
    );
    expect(compte(h, "blockquote")).toBe(1);
    expect(compte(h, "ul")).toBe(1);
    expect(compte(h, "li")).toBe(2);
    expect(texte(h)).not.toContain(">");
    expect(texte(h)).not.toMatch(/- approuvent/);
  });

  it("laisse au texte cite la couleur de la citation", () => {
    // Le paragraphe courant porte sa couleur ; dans une citation il herite
    // de celle du <blockquote>, comme avant.
    const h = html("texte courant\n\n> texte cite");
    expect(h).toContain('<p class="text-gray-800 dark:text-gray-100">');
    expect(h).toMatch(/<blockquote[^>]*><p><span>texte cite<\/span><\/p>/);
  });
});

describe("MarkdownView - numerotation des listes", () => {
  it("fait repartir une liste du numero ecrit par l'auteur", () => {
    const h = html("1. un\n\nUn paragraphe.\n\n2. deux\n3. trois");
    expect(compte(h, "ol")).toBe(2);
    expect(h).toContain('<ol start="2"');
    // La premiere liste commence a 1 : aucun attribut.
    expect(h.match(/<ol start=/g)).toHaveLength(1);
  });

  it("garde les numeros 1, 2, 3 d'une liste citee a points separes", () => {
    const h = html(
      [
        "> **Mes volontes numeriques**",
        ">",
        "> 1. Mes comptes mail",
        ">",
        "> 2. Mes photos",
        ">",
        "> 3. Mes comptes sociaux",
      ].join("\n"),
    );
    expect(compte(h, "blockquote")).toBe(1);
    expect(compte(h, "ol")).toBe(3);
    expect(h).toContain('<ol start="2"');
    expect(h).toContain('<ol start="3"');
    expect(texte(h)).not.toContain(">");
  });
});

describe("MarkdownView - ce qui ne change pas", () => {
  it("rend toujours un tableau", () => {
    const h = html(
      "| Taille | Annexe I |\n|---|---|\n| Moyenne | importante |",
    );
    expect(compte(h, "table")).toBe(1);
    expect(compte(h, "th")).toBe(2);
    expect(compte(h, "td")).toBe(2);
  });

  it("rend toujours un lien externe dans un nouvel onglet", () => {
    const h = html("Voir [la page](https://exemple.fr/page).");
    expect(h).toContain('href="https://exemple.fr/page"');
    expect(h).toContain('rel="noopener noreferrer"');
  });

  it("garde les classes des listes hors citation", () => {
    const h = html("- un\n- deux");
    expect(h).toContain(
      'class="list-disc pl-6 space-y-1 text-gray-800 dark:text-gray-100"',
    );
  });
});
