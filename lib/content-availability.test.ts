// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CATALOGUE_CHIFFRES } from "./catalogue-chiffres";
import {
  countExpertEpisodes,
  hasExpertContent,
  listExpertEpisodes,
  NON_SAISON_SUBDIRS,
} from "./content-availability";

let tmpRoot: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;

function writeMdx(saisonSlug: string, episodeSlug: string) {
  const dir = path.join(tmpRoot, "content", "saisons", saisonSlug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${episodeSlug}.mdx`),
    "---\ntitle: x\n---\n",
  );
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "humanix-content-"));
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmpRoot);
});

afterEach(() => {
  cwdSpy.mockRestore();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("hasExpertContent", () => {
  it("retourne true quand le MDX existe", () => {
    writeMdx("phishing", "01-mail-du-pdg");
    expect(hasExpertContent("phishing", "01-mail-du-pdg")).toBe(true);
  });

  it("retourne false quand le MDX n'existe pas", () => {
    expect(hasExpertContent("phishing", "99-inexistant")).toBe(false);
  });

  it("retourne false quand le dossier saison n'existe pas", () => {
    expect(hasExpertContent("saison-fantome", "01-test")).toBe(false);
  });

  it("rejette les slugs avec caracteres dangereux (path traversal)", () => {
    writeMdx("phishing", "01-mail-du-pdg");
    expect(hasExpertContent("..", "passwd")).toBe(false);
    expect(hasExpertContent("phishing", "../../etc/passwd")).toBe(false);
    expect(hasExpertContent("phishing", "01/with/slash")).toBe(false);
    expect(hasExpertContent("phishing", "")).toBe(false);
  });

  it("rejette les slugs avec majuscules ou caracteres speciaux", () => {
    expect(hasExpertContent("Phishing", "01-test")).toBe(false);
    expect(hasExpertContent("phishing", "01_test")).toBe(false);
    expect(hasExpertContent("phishing", "01.test")).toBe(false);
  });

  it("rejette les slugs trop longs (DoS prevention)", () => {
    const long = "a".repeat(100);
    expect(hasExpertContent(long, "01-test")).toBe(false);
  });

  it("ne prend pas une enquete pour un module", () => {
    writeMdx("enquetes", "email-fournisseur-rib");
    expect(hasExpertContent("enquetes", "email-fournisseur-rib")).toBe(false);
  });
});

describe("listExpertEpisodes", () => {
  it("liste tous les MDX trouves, tries par saison puis episode", () => {
    writeMdx("phishing", "02-faux-rib");
    writeMdx("phishing", "01-mail-du-pdg");
    writeMdx("mots-de-passe", "01-collection-postit");

    expect(listExpertEpisodes()).toEqual([
      { saisonSlug: "mots-de-passe", episodeSlug: "01-collection-postit" },
      { saisonSlug: "phishing", episodeSlug: "01-mail-du-pdg" },
      { saisonSlug: "phishing", episodeSlug: "02-faux-rib" },
    ]);
  });

  it("ignore les fichiers non-MDX", () => {
    writeMdx("phishing", "01-mail-du-pdg");
    fs.writeFileSync(
      path.join(tmpRoot, "content", "saisons", "phishing", "README.txt"),
      "x",
    );
    expect(listExpertEpisodes()).toEqual([
      { saisonSlug: "phishing", episodeSlug: "01-mail-du-pdg" },
    ]);
  });

  it("retourne une liste vide quand le dossier n'existe pas", () => {
    expect(listExpertEpisodes()).toEqual([]);
  });

  it("saute les dossiers qui ne sont pas des saisons", () => {
    // content/saisons pointe sur content-pro/content, qui porte aussi les
    // enquetes du Mode Enqueteur : ce ne sont pas des modules du catalogue.
    writeMdx("phishing", "01-mail-du-pdg");
    writeMdx("enquetes", "email-fournisseur-rib");
    writeMdx("enquetes", "sms-livraison");
    expect(listExpertEpisodes()).toEqual([
      { saisonSlug: "phishing", episodeSlug: "01-mail-du-pdg" },
    ]);
  });

  it("garde une saison dont le nom ressemble a un dossier ecarte", () => {
    writeMdx("enquetes-internes", "01-signaler");
    expect(listExpertEpisodes()).toEqual([
      { saisonSlug: "enquetes-internes", episodeSlug: "01-signaler" },
    ]);
  });
});

describe("countExpertEpisodes", () => {
  it("compte le nombre d'episodes avec contenu expert", () => {
    expect(countExpertEpisodes()).toBe(0);
    writeMdx("phishing", "01-mail-du-pdg");
    writeMdx("phishing", "02-faux-rib");
    writeMdx("teletravail", "01-wifi-gare");
    expect(countExpertEpisodes()).toBe(3);
  });

  it("ne compte pas les enquetes : 476 modules et 27 enquetes font 476", () => {
    // La note de /comparatif a affiche « 503 episodes » rediges pour un
    // catalogue de 476 modules jusqu'au 2026-11-20.
    writeMdx("phishing", "01-mail-du-pdg");
    writeMdx("phishing", "02-faux-rib");
    for (const enquete of ["email-fournisseur-rib", "sms-livraison", "photo"]) {
      writeMdx("enquetes", enquete);
    }
    expect(countExpertEpisodes()).toBe(2);
  });
});

describe("NON_SAISON_SUBDIRS", () => {
  it("ecarte le dossier des enquetes", () => {
    expect([...NON_SAISON_SUBDIRS]).toContain("enquetes");
  });
});

// -----------------------------------------------------------------------------
// Sur le VRAI contenu commercial, quand le sous-module content-pro est la.
//
// C'est le garde-fou du compteur : tout MDX compte doit etre un module du
// catalogue. Un nouveau dossier hors saisons, ou un MDX orphelin, fait
// echouer ce test au lieu de gonfler un chiffre public sans bruit.
// -----------------------------------------------------------------------------
const racine = path.join(__dirname, "..");
// Le vrai fichier, pas le lien prisma/catalog-saisons.ts : en CI le
// sous-module prive est absent.
const catalogueCommercial = path.join(
  racine,
  "content-pro",
  "prisma",
  "catalog-saisons.ts",
);
const contentProPresent = fs.existsSync(catalogueCommercial);

describe("compteur de modules rediges, sur le contenu commercial reel", () => {
  it.skipIf(!contentProPresent)(
    "ne compte que des modules du catalogue, et jamais plus que lui",
    async () => {
      cwdSpy.mockRestore();
      // Chemin variable : tsc ne doit pas resoudre ce module, absent en CI.
      const mod = (await import(/* @vite-ignore */ catalogueCommercial)) as {
        CATALOG_SAISONS: { slug: string; episodes: { slug: string }[] }[];
      };
      const catalogue = new Set(
        mod.CATALOG_SAISONS.flatMap((s) =>
          s.episodes.map((e) => `${s.slug}/${e.slug}`),
        ),
      );
      const comptes = listExpertEpisodes().map(
        (e) => `${e.saisonSlug}/${e.episodeSlug}`,
      );

      expect(comptes.length).toBeGreaterThan(0);
      expect(comptes.filter((cle) => !catalogue.has(cle))).toEqual([]);
      expect(countExpertEpisodes()).toBeLessThanOrEqual(
        CATALOGUE_CHIFFRES.modules,
      );
    },
  );
});
