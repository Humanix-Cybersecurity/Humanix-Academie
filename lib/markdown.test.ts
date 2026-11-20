// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du rendu markdown inline -- critique pour anti-XSS sur les liens.

import { describe, it, expect } from "vitest";
import { renderInline, markdownToPlainText, parseMarkdown } from "./markdown";

describe("renderInline - rendu liens cliquables", () => {
  it("convertit [texte](https://...) en token link", () => {
    const tokens = renderInline(
      "Va sur [Facebook](https://facebook.com) maintenant.",
    );
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
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(
      false,
    );
    // Le contenu reste visible (en string brute) pour que l'auteur du markdown
    // voie son erreur. Le rendering peut split en plusieurs strings selon les
    // parentheses imbriquees -- pas un probleme cote affichage.
    const allText = tokens.filter((t) => typeof t === "string").join("");
    expect(allText).toContain("javascript:alert");
  });

  it("rejette data: (eviter les data URLs malveillantes)", () => {
    const tokens = renderInline(
      "[x](data:text/html,<script>alert(1)</script>)",
    );
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(
      false,
    );
  });

  it("rejette vbscript:", () => {
    const tokens = renderInline("[x](vbscript:msgbox)");
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(
      false,
    );
  });

  it("rejette file:", () => {
    const tokens = renderInline("[x](file:///etc/passwd)");
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(
      false,
    );
  });

  it("rejette about:", () => {
    const tokens = renderInline("[x](about:blank)");
    expect(tokens.some((t) => typeof t === "object" && "link" in t)).toBe(
      false,
    );
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

// Les contenus du catalogue sont ecrits avec des lignes repliees vers
// 66 colonnes. Jusqu'au 2026-11-20, la suite d'une puce ecrite sur deux
// lignes fermait la liste et devenait un paragraphe a part : dans les 476
// debriefs du catalogue, 2 587 puces etaient ainsi coupees (3 288 lignes de
// suite), un gras ouvert sur la premiere ligne gardait ses asterisques a
// l'ecran, et une liste numerotee coupee repartait de « 1. ».
describe("parseMarkdown - puce ecrite sur plusieurs lignes", () => {
  it("rattache la ligne de suite a sa puce", () => {
    const blocks = parseMarkdown(
      "- Energie (electricite, reseaux de chaleur et de froid, petrole,\n  gaz, hydrogene)\n- Transports",
    );
    expect(blocks).toEqual([
      {
        type: "ul",
        items: [
          "Energie (electricite, reseaux de chaleur et de froid, petrole, gaz, hydrogene)",
          "Transports",
        ],
      },
    ]);
  });

  it("ne coupe plus la liste en deux", () => {
    const blocks = parseMarkdown("- un\n  suite de un\n- deux\n- trois");
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as { items: string[] }).items).toEqual([
      "un suite de un",
      "deux",
      "trois",
    ]);
  });

  it("recolle une puce de trois lignes", () => {
    const blocks = parseMarkdown("- ligne une\n  ligne deux\n  ligne trois");
    expect((blocks[0] as { items: string[] }).items).toEqual([
      "ligne une ligne deux ligne trois",
    ]);
  });

  it("referme un gras a cheval sur le retour a la ligne", () => {
    const blocks = parseMarkdown(
      "- Moins de 50 personnes : **hors\n  perimetre**, sauf exceptions",
    );
    const item = (blocks[0] as { items: string[] }).items[0];
    expect(renderInline(item)).toEqual([
      "Moins de 50 personnes : ",
      { bold: "hors perimetre" },
      ", sauf exceptions",
    ]);
  });

  it("vaut aussi pour une liste numerotee", () => {
    const blocks = parseMarkdown(
      "1. **Simulateur officiel** : l'espace NIS 2\n   propose un test en ligne\n2. Enregistrement",
    );
    expect(blocks).toEqual([
      {
        type: "ol",
        items: [
          "**Simulateur officiel** : l'espace NIS 2 propose un test en ligne",
          "Enregistrement",
        ],
      },
    ]);
  });

  it("garde en paragraphe une ligne au niveau du marqueur", () => {
    // Pas d'indentation : ce n'est pas la suite de la puce.
    const blocks = parseMarkdown("- un\n- deux\nUn paragraphe qui suit.");
    expect(blocks.map((b) => b.type)).toEqual(["ul", "p"]);
    expect((blocks[0] as { items: string[] }).items).toEqual(["un", "deux"]);
  });

  it("garde en paragraphe une ligne indentee apres une ligne vide", () => {
    const blocks = parseMarkdown("- un\n\n  Texte a part.\n- deux");
    expect(blocks.map((b) => b.type)).toEqual(["ul", "p", "ul"]);
  });

  it("traite une puce indentee comme une puce, pas comme une suite", () => {
    const blocks = parseMarkdown("- parent\n  - enfant\n- autre");
    expect((blocks[0] as { items: string[] }).items).toEqual([
      "parent",
      "enfant",
      "autre",
    ]);
  });

  it("n'absorbe ni une citation ni un tableau indentes", () => {
    const quote = parseMarkdown("- un\n  > cite");
    expect(quote.map((b) => b.type)).toEqual(["ul", "quote"]);
    const table = parseMarkdown("- un\n  | a | b |\n  |---|---|\n  | 1 | 2 |");
    expect(table.map((b) => b.type)).toEqual(["ul", "table"]);
  });

  it("rattache un mot en italique en debut de ligne de suite", () => {
    // Meme piege que pour les paragraphes : « *mot* » n'est pas une puce.
    const blocks = parseMarkdown("- ce qui est visible,\n  *atteignable*");
    expect((blocks[0] as { items: string[] }).items).toEqual([
      "ce qui est visible, *atteignable*",
    ]);
  });
});

// Jusqu'au 2026-11-20, chaque ligne « > » donnait son propre bloc : une
// citation de quatre lignes s'affichait en quatre encadres, et le gras
// d'une « regle d'or » ecrite sur plusieurs lignes gardait ses asterisques.
describe("parseMarkdown - citation sur plusieurs lignes", () => {
  it("reunit les lignes qui se suivent en une seule citation", () => {
    const blocks = parseMarkdown(
      "> **Ou en est la France ?** Point de novembre 2026 : la directive\n> NIS2 n'est pas encore transposee en droit francais.",
    );
    expect(blocks).toEqual([
      {
        type: "quote",
        blocks: [
          {
            type: "p",
            text: "**Ou en est la France ?** Point de novembre 2026 : la directive NIS2 n'est pas encore transposee en droit francais.",
          },
        ],
      },
    ]);
  });

  it("referme un gras ouvert sur la premiere ligne et ferme sur la derniere", () => {
    const blocks = parseMarkdown(
      "> **NIS2 n'est pas une certification a obtenir, c'est une\n> demarche continue.**",
    );
    const inner = (blocks[0] as { blocks: { text: string }[] }).blocks;
    expect(renderInline(inner[0].text)).toEqual([
      {
        bold: "NIS2 n'est pas une certification a obtenir, c'est une demarche continue.",
      },
    ]);
  });

  it("separe deux paragraphes sur une ligne « > » vide, sans l'afficher", () => {
    const blocks = parseMarkdown("> premier\n>\n> second");
    expect(blocks).toEqual([
      {
        type: "quote",
        blocks: [
          { type: "p", text: "premier" },
          { type: "p", text: "second" },
        ],
      },
    ]);
  });

  it("garde une liste citee comme une liste", () => {
    const blocks = parseMarkdown(
      '> "Article 20 : les organes de direction\n> - approuvent les mesures\n> - supervisent leur mise en oeuvre',
    );
    expect(blocks).toEqual([
      {
        type: "quote",
        blocks: [
          { type: "p", text: '"Article 20 : les organes de direction' },
          {
            type: "ul",
            items: [
              "approuvent les mesures",
              "supervisent leur mise en oeuvre",
            ],
          },
        ],
      },
    ]);
  });

  it("ne produit rien pour des « > » sans texte", () => {
    expect(parseMarkdown(">")).toEqual([]);
    expect(parseMarkdown("avant\n\n>\n\napres").map((b) => b.type)).toEqual([
      "p",
      "p",
    ]);
  });

  it("separe la citation du paragraphe qui la precede ou la suit", () => {
    const blocks = parseMarkdown("avant\n> cite\n> encore\napres");
    expect(blocks.map((b) => b.type)).toEqual(["p", "quote", "p"]);
    expect((blocks[2] as { text: string }).text).toBe("apres");
  });

  it("ne confond pas « >= 250 » avec une citation", () => {
    // Pas d'espace apres le chevron : c'est du texte.
    const blocks = parseMarkdown("Seuil :\n>= 250 personnes");
    expect(blocks).toEqual([{ type: "p", text: "Seuil : >= 250 personnes" }]);
  });

  it("lit comme du texte un chevron en debut de ligne dans une citation", () => {
    // Cas reel (vie-privee-bureau/03) : « entreprises > 50 » replie juste
    // avant le chevron. Ce n'est pas une citation dans la citation, et le
    // gras ouvert au debut de la regle d'or doit se refermer a la fin.
    const blocks = parseMarkdown(
      "> **Droit a la deconnexion = obligation legale (entreprises\n> > 50). Pratique : pas de reponse hors horaires.**",
    );
    expect(blocks).toHaveLength(1);
    const inner = (blocks[0] as { blocks: { type: string; text: string }[] })
      .blocks;
    expect(inner).toHaveLength(1);
    expect(renderInline(inner[0].text)).toEqual([
      {
        bold: "Droit a la deconnexion = obligation legale (entreprises > 50). Pratique : pas de reponse hors horaires.",
      },
    ]);
  });
});

// Des puces numerotees separees par une ligne vide ou par un paragraphe
// donnent autant de listes. Sans le numero de depart, chacune s'affichait
// « 1. » : 53 listes de 17 debriefs repartaient ainsi de 1. Et dans une
// citation, ou l'ancien rendu montrait le texte brut « 2. ... », rendre la
// liste sans ce numero aurait fait perdre la numerotation de l'auteur.
describe("parseMarkdown - liste numerotee qui ne commence pas a 1", () => {
  it("garde le numero de la premiere puce", () => {
    expect(parseMarkdown("2. deux\n3. trois")).toEqual([
      { type: "ol", items: ["deux", "trois"], start: 2 },
    ]);
  });

  it("n'ajoute rien quand la liste commence a 1", () => {
    const blocks = parseMarkdown("1. un\n2. deux");
    expect(blocks).toEqual([{ type: "ol", items: ["un", "deux"] }]);
    expect(blocks[0]).not.toHaveProperty("start");
  });

  it("reprend la numerotation apres un paragraphe intercale", () => {
    // Forme reelle (crise-cyber/05) : un titre numerote, son texte, le
    // titre suivant.
    const blocks = parseMarkdown(
      "1. Ce qui s'est passe\n\nLes faits.\n\n2. Ce que nous savons\n\nLe detail.",
    );
    expect(blocks).toEqual([
      { type: "ol", items: ["Ce qui s'est passe"] },
      { type: "p", text: "Les faits." },
      { type: "ol", items: ["Ce que nous savons"], start: 2 },
      { type: "p", text: "Le detail." },
    ]);
  });

  it("garde les numeros d'une liste citee, puces separees par « > »", () => {
    // Forme reelle (librairie, « deces-numerique ») : un modele de lettre
    // numerote de 1 a 6, une ligne « > » vide entre deux points.
    const blocks = parseMarkdown(
      "> **Mes volontes numeriques**\n>\n> 1. Mes comptes mail\n>\n> 2. Mes photos\n>\n> 3. Mes comptes sociaux",
    );
    expect(blocks).toEqual([
      {
        type: "quote",
        blocks: [
          { type: "p", text: "**Mes volontes numeriques**" },
          { type: "ol", items: ["Mes comptes mail"] },
          { type: "ol", items: ["Mes photos"], start: 2 },
          { type: "ol", items: ["Mes comptes sociaux"], start: 3 },
        ],
      },
    ]);
  });

  it("ne garde que le premier numero d'une liste", () => {
    // Comme en HTML : la liste compte a partir de son premier numero.
    expect(parseMarkdown("3. trois\n7. quatre")).toEqual([
      { type: "ol", items: ["trois", "quatre"], start: 3 },
    ]);
  });

  it("ignore un numero trop grand pour etre un entier sur", () => {
    const blocks = parseMarkdown("99999999999999999999. demesure");
    expect(blocks).toEqual([{ type: "ol", items: ["demesure"] }]);
  });
});

describe("parseMarkdown - ce qui ne change pas", () => {
  it("recolle toujours les lignes d'un paragraphe", () => {
    const blocks = parseMarkdown("ligne une\nligne deux\n\nautre paragraphe");
    expect(blocks).toEqual([
      { type: "p", text: "ligne une ligne deux" },
      { type: "p", text: "autre paragraphe" },
    ]);
  });

  it("lit toujours un tableau, barre echappee comprise", () => {
    // La sentinelle qui protege « \| » s'ecrit en echappements : le fichier
    // source ne contient plus d'octet NUL.
    const blocks = parseMarkdown("| Cas | Regle |\n|---|---|\n| a \\| b | c |");
    expect(blocks).toEqual([
      { type: "table", headers: ["Cas", "Regle"], rows: [["a | b", "c"]] },
    ]);
  });

  it("garde une liste suivie d'un tableau comme deux blocs", () => {
    const blocks = parseMarkdown(
      "- un\n- deux\n\n| a | b |\n|---|---|\n| 1 | 2 |",
    );
    expect(blocks.map((b) => b.type)).toEqual(["ul", "table"]);
  });
});

describe("markdownToPlainText - citations et puces repliees", () => {
  it("retire les chevrons, y compris sur une ligne vide", () => {
    expect(markdownToPlainText("> premier\n>\n> second")).toBe(
      "premier\nsecond",
    );
  });

  it("garde le texte d'une puce ecrite sur deux lignes", () => {
    const plain = markdownToPlainText("- **un**\n  suite\n- deux");
    expect(plain).toContain("un");
    expect(plain).toContain("suite");
    expect(plain).toContain("deux");
    expect(plain).not.toContain("**");
  });
});
