// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du rendu markdown inline -- critique pour anti-XSS sur les liens.

import { describe, it, expect } from "vitest";
import { renderInline, markdownToPlainText, parseMarkdown } from "./markdown";

describe("renderInline - rendu liens cliquables", () => {
  it("convertit [texte](https://...) en token link", () => {
    const tokens = renderInline("Va sur [Facebook](https://facebook.com) maintenant.");
    expect(tokens).toEqual([
      "Va sur ",
      { link: { text: "Facebook", href: "https://facebook.com" } },
      " maintenant.",
    ]);
  });

  it("accepte les liens mailto + tel", () => {
    expect(renderInline("[contact](mailto:hello@x.fr)")).toEqual([
      { link: { text: "contact", href: "mailto:hello@x.fr" } },
    ]);
    expect(renderInline("[appeler](tel:+33123456789)")).toEqual([
      { link: { text: "appeler", href: "tel:+33123456789" } },
    ]);
  });

  it("accepte les liens internes (commencant par /)", () => {
    expect(renderInline("Voir [profil](/profil)")).toEqual([
      "Voir ",
      { link: { text: "profil", href: "/profil" } },
    ]);
  });
});

describe("renderInline - SECURITE anti-XSS", () => {
  // Critique : un attaquant qui peut ecrire du markdown ne doit JAMAIS
  // pouvoir creer un lien javascript:, data:, vbscript:, file:, about:
  it("rejette javascript: et fallback en texte brut", () => {
    const tokens = renderInline("[click](javascript:alert(1))");
    // GARANTIE SECURITE : aucun token de type "link" -> pas d'<a href> rendu
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(false);
    // Le contenu reste visible (en string brute) pour que l'auteur du markdown
    // voie son erreur. Le rendering peut split en plusieurs strings selon les
    // parentheses imbriquees -- pas un probleme cote affichage.
    const allText = tokens.filter((t) => typeof t === "string").join("");
    expect(allText).toContain("javascript:alert");
  });

  it("rejette data: (eviter les data URLs malveillantes)", () => {
    const tokens = renderInline("[x](data:text/html,<script>alert(1)</script>)");
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(false);
  });

  it("rejette vbscript:", () => {
    const tokens = renderInline("[x](vbscript:msgbox)");
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(false);
  });

  it("rejette file:", () => {
    const tokens = renderInline("[x](file:///etc/passwd)");
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(false);
  });

  it("rejette about:", () => {
    const tokens = renderInline("[x](about:blank)");
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(false);
  });

  it("URL avec espaces / chars bizarres -> traite ou rejette safely", () => {
    // Pas de crash sur input nonsense
    expect(() => renderInline("[x](htp:/not.url)")).not.toThrow();
  });
});

describe("renderInline - autres patterns", () => {
  it("convertit **gras** en token bold", () => {
    expect(renderInline("c'est **important** la")).toEqual([
      "c'est ",
      { bold: "important" },
      " la",
    ]);
  });

  it("convertit *italique* en token italic", () => {
    expect(renderInline("Note *importante*")).toEqual([
      "Note ",
      { italic: "importante" },
    ]);
  });

  it("convertit _italique_ en token italic", () => {
    expect(renderInline("Note _importante_")).toEqual([
      "Note ",
      { italic: "importante" },
    ]);
  });

  it("convertit `code` inline en token code", () => {
    expect(renderInline("utilise `npm run dev`")).toEqual([
      "utilise ",
      { code: "npm run dev" },
    ]);
  });

  it("mix tous les patterns", () => {
    const tokens = renderInline(
      "Voir [docs](https://x.fr) avec **bold** et *italic* et `code`",
    );
    expect(tokens).toEqual([
      "Voir ",
      { link: { text: "docs", href: "https://x.fr" } },
      " avec ",
      { bold: "bold" },
      " et ",
      { italic: "italic" },
      " et ",
      { code: "code" },
    ]);
  });

  it("texte sans aucun pattern reste tel quel", () => {
    expect(renderInline("juste du texte normal")).toEqual([
      "juste du texte normal",
    ]);
  });

  it("chaine vide -> tableau vide", () => {
    expect(renderInline("")).toEqual([]);
  });
});

describe("markdownToPlainText - strip propre des liens", () => {
  it("strip les liens markdown en gardant le texte", () => {
    expect(markdownToPlainText("Voir [Facebook](https://facebook.com)")).toBe(
      "Voir Facebook",
    );
  });

  it("strip plusieurs liens dans le meme paragraphe", () => {
    expect(
      markdownToPlainText("Lis [un](u1) et [deux](u2) et [trois](u3)"),
    ).toBe("Lis un et deux et trois");
  });
});

describe("parseMarkdown - regression : italique en debut de ligne", () => {
  // Bug historique : un paragraphe dont une ligne commence par
  // *italique* etait coupe, et la ligne droppee silencieusement
  // (cf. brief de l'enquete photo-bureau-ouvert.mdx).
  // La regex de break exigeait `\s?` (espace optionnel) apres le
  // marqueur, donc `*atteignable*` etait detecte comme debut de
  // liste alors que ce n'en est pas une.

  it("conserve un mot en italique en debut de ligne dans un paragraphe", () => {
    const blocks = parseMarkdown(
      "Astuce : ce qui est *visible*, ce qui est\n*atteignable*, et ce qui est *exploitable* par quelqu'un qui\npasserait devant ce bureau sans etre surveille.",
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("p");
    expect((blocks[0] as { text: string }).text).toContain("atteignable");
    expect((blocks[0] as { text: string }).text).toContain("exploitable");
    expect((blocks[0] as { text: string }).text).toContain("passerait");
  });

  it("conserve un mot en gras en debut de ligne dans un paragraphe", () => {
    const blocks = parseMarkdown(
      "Note importante :\n**Bravo, detective.** Tu viens d'analyser un phishing.",
    );
    // On accepte deux paragraphes (un par ligne) OU un seul, tant
    // que le texte gras est conserve quelque part.
    const allText = blocks
      .filter((b) => b.type === "p")
      .map((b) => (b as { text: string }).text)
      .join(" ");
    expect(allText).toContain("Bravo, detective.");
  });

  it("detecte toujours correctement une vraie liste a puces", () => {
    const blocks = parseMarkdown("* item un\n* item deux");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("ul");
    expect((blocks[0] as { items: string[] }).items).toEqual([
      "item un",
      "item deux",
    ]);
  });

  it("detecte toujours correctement une vraie liste ordonnee", () => {
    const blocks = parseMarkdown("1. premier\n2. deuxieme");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("ol");
  });

  it("detecte toujours correctement un titre h2", () => {
    const blocks = parseMarkdown("## Mon titre");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("h2");
  });
});
