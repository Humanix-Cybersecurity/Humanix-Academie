// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du rendu markdown inline -- critique pour anti-XSS sur les liens.

import { describe, it, expect } from "vitest";
import { renderInline, markdownToPlainText } from "./markdown";

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
