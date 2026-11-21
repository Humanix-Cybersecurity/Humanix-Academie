// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Le chargeur de MDX cherche chaque module dans le catalogue commercial
// (content/saisons) puis dans les saisons de demo (content/saisons-demo).
//
// Le cas qui a motive ces tests : une base qui porte les saisons de demo A
// COTE du catalogue commercial, comme la production depuis juin 2026. Le
// chargeur ne lisait alors que la racine commerciale, et les 28 modules de
// demo s'affichaient en contenu generique alors que leurs MDX etaient la.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveRemediationPlan } from "@/lib/exposure/remediation";
import { CATALOG_SAISONS_DEMO } from "@/prisma/catalog-saisons-demo";

import { listEpisodes, listSaisons, loadEpisode } from "./episodes";

type Racine = "saisons" | "saisons-demo";

let tmpRoot: string;

function ecrireMdx(
  racine: Racine,
  saisonSlug: string,
  episodeSlug: string,
  titre = `${racine}/${saisonSlug}/${episodeSlug}`,
) {
  const dir = path.join(tmpRoot, "content", racine, saisonSlug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${episodeSlug}.mdx`),
    `---\ntitle: "${titre}"\nscenario: "Un courriel arrive."\n---\nCorps du module.\n`,
  );
}

function titreServi(saisonSlug: string, episodeSlug: string): string | null {
  return loadEpisode(saisonSlug, episodeSlug)?.meta.title ?? null;
}

describe("chargeur de MDX, sur un contenu de test", () => {
  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "humanix-episodes-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpRoot);
    vi.stubEnv("DEMO_MODE", "false");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe("loadEpisode, hors mode demo", () => {
    it("sert un module du catalogue commercial", () => {
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      expect(titreServi("phishing", "01-mail-du-pdg")).toBe(
        "saisons/phishing/01-mail-du-pdg",
      );
    });

    it("sert un module de demo que le catalogue commercial n'a pas", () => {
      // La forme de la production : un catalogue commercial non vide, et une
      // saison de demo qui n'existe que dans content/saisons-demo.
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      ecrireMdx("saisons-demo", "reconnaitre-phishing", "01-domaine");

      expect(titreServi("reconnaitre-phishing", "01-domaine")).toBe(
        "saisons-demo/reconnaitre-phishing/01-domaine",
      );
      // Et le catalogue commercial reste servi a cote.
      expect(titreServi("phishing", "01-mail-du-pdg")).toBe(
        "saisons/phishing/01-mail-du-pdg",
      );
    });

    it("donne la priorite au catalogue commercial quand les deux ont le module", () => {
      ecrireMdx("saisons", "maitrise-ia", "01-hallucinations");
      ecrireMdx("saisons-demo", "maitrise-ia", "01-hallucinations");
      expect(titreServi("maitrise-ia", "01-hallucinations")).toBe(
        "saisons/maitrise-ia/01-hallucinations",
      );
    });

    it("cherche module par module : une saison peut etre a cheval sur les deux racines", () => {
      // Le jour ou le catalogue commercial ecrit le module 02 d'une saison
      // de demo, les modules 01 et 03 de la demo ne doivent pas disparaitre.
      ecrireMdx("saisons", "maitrise-ia", "02-autorite-textuelle");
      ecrireMdx("saisons-demo", "maitrise-ia", "01-hallucinations");
      ecrireMdx("saisons-demo", "maitrise-ia", "03-atrophie-critique");

      expect(titreServi("maitrise-ia", "01-hallucinations")).toBe(
        "saisons-demo/maitrise-ia/01-hallucinations",
      );
      expect(titreServi("maitrise-ia", "02-autorite-textuelle")).toBe(
        "saisons/maitrise-ia/02-autorite-textuelle",
      );
      expect(titreServi("maitrise-ia", "03-atrophie-critique")).toBe(
        "saisons-demo/maitrise-ia/03-atrophie-critique",
      );
    });

    it("retourne null quand aucune racine n'a le module (contenu generique)", () => {
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      ecrireMdx("saisons-demo", "maitrise-ia", "01-hallucinations");
      expect(loadEpisode("maitrise-ia", "02-autorite-textuelle")).toBeNull();
      expect(loadEpisode("saison-fantome", "01-test")).toBeNull();
    });

    it("sert la demo quand le dossier commercial existe mais est vide", () => {
      // Sous-module pas encore initialise : content/saisons est un dossier vide.
      fs.mkdirSync(path.join(tmpRoot, "content", "saisons"), {
        recursive: true,
      });
      ecrireMdx("saisons-demo", "mots-de-passe-bases", "01-longueur");
      expect(titreServi("mots-de-passe-bases", "01-longueur")).toBe(
        "saisons-demo/mots-de-passe-bases/01-longueur",
      );
    });

    it("sert la demo quand le dossier commercial n'existe pas (fork OSS pur)", () => {
      ecrireMdx("saisons-demo", "mots-de-passe-bases", "01-longueur");
      expect(titreServi("mots-de-passe-bases", "01-longueur")).toBe(
        "saisons-demo/mots-de-passe-bases/01-longueur",
      );
    });

    it("retourne null quand aucun contenu n'est installe", () => {
      expect(loadEpisode("phishing", "01-mail-du-pdg")).toBeNull();
    });

    it("garantit debrief, choices et quiz meme absents du frontmatter", () => {
      ecrireMdx("saisons-demo", "mobile-essentiels", "01-verrouillage");
      const episode = loadEpisode("mobile-essentiels", "01-verrouillage");
      expect(episode).toMatchObject({
        saisonSlug: "mobile-essentiels",
        episodeSlug: "01-verrouillage",
        meta: {
          scenario: "Un courriel arrive.",
          debrief: "",
          choices: [],
          quiz: [],
        },
      });
      expect(episode?.body.trim()).toBe("Corps du module.");
    });

    it("refuse un slug qui n'est pas un simple nom (sortie de la racine)", () => {
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      // Un MDX hors des racines de contenu, atteignable par « .. ».
      fs.writeFileSync(
        path.join(tmpRoot, "content", "hors-racine.mdx"),
        '---\ntitle: "hors racine"\n---\n',
      );
      expect(loadEpisode("..", "hors-racine")).toBeNull();
      expect(loadEpisode("phishing", "../../hors-racine")).toBeNull();
      expect(loadEpisode("phishing/..", "hors-racine")).toBeNull();
      expect(loadEpisode("phishing", "..\\..\\hors-racine")).toBeNull();
      expect(loadEpisode("", "01-mail-du-pdg")).toBeNull();
      expect(loadEpisode("phishing", "")).toBeNull();
    });
  });

  describe("loadEpisode, en mode demo", () => {
    beforeEach(() => {
      vi.stubEnv("DEMO_MODE", "true");
    });

    it("sert les modules de demo", () => {
      ecrireMdx("saisons-demo", "reconnaitre-phishing", "01-domaine");
      expect(titreServi("reconnaitre-phishing", "01-domaine")).toBe(
        "saisons-demo/reconnaitre-phishing/01-domaine",
      );
    });

    it("ne sert jamais un MDX du catalogue commercial, meme present sur le disque", () => {
      // L'image de la demo publique contient le contenu commercial : il ne
      // doit pas sortir par /apprendre/<saison>/<module>.
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      ecrireMdx("saisons", "maitrise-ia", "01-hallucinations");
      ecrireMdx("saisons-demo", "maitrise-ia", "01-hallucinations");

      expect(loadEpisode("phishing", "01-mail-du-pdg")).toBeNull();
      expect(titreServi("maitrise-ia", "01-hallucinations")).toBe(
        "saisons-demo/maitrise-ia/01-hallucinations",
      );
    });
  });

  describe("listEpisodes", () => {
    it("liste les modules rediges d'une saison commerciale, tries", () => {
      ecrireMdx("saisons", "phishing", "02-faux-rib");
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      expect(listEpisodes("phishing")).toEqual([
        "01-mail-du-pdg",
        "02-faux-rib",
      ]);
    });

    it("liste les modules d'une saison de demo absente du catalogue commercial", () => {
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      ecrireMdx("saisons-demo", "reconnaitre-phishing", "02-urgence");
      ecrireMdx("saisons-demo", "reconnaitre-phishing", "01-domaine");
      expect(listEpisodes("reconnaitre-phishing")).toEqual([
        "01-domaine",
        "02-urgence",
      ]);
    });

    it("reunit les deux racines sans doublon", () => {
      ecrireMdx("saisons", "maitrise-ia", "02-autorite-textuelle");
      ecrireMdx("saisons", "maitrise-ia", "01-hallucinations");
      ecrireMdx("saisons-demo", "maitrise-ia", "01-hallucinations");
      ecrireMdx("saisons-demo", "maitrise-ia", "03-atrophie-critique");
      expect(listEpisodes("maitrise-ia")).toEqual([
        "01-hallucinations",
        "02-autorite-textuelle",
        "03-atrophie-critique",
      ]);
    });

    it("annonce exactement ce que loadEpisode sert", () => {
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      ecrireMdx("saisons-demo", "maitrise-ia", "01-hallucinations");
      ecrireMdx("saisons-demo", "maitrise-ia", "03-atrophie-critique");

      const annonces = listEpisodes("maitrise-ia");
      const catalogue = [
        "01-hallucinations",
        "02-autorite-textuelle",
        "03-atrophie-critique",
      ];
      for (const slug of catalogue) {
        expect(annonces.includes(slug)).toBe(
          loadEpisode("maitrise-ia", slug) !== null,
        );
      }
    });

    it("ne liste que la demo en mode demo", () => {
      vi.stubEnv("DEMO_MODE", "true");
      ecrireMdx("saisons", "maitrise-ia", "02-autorite-textuelle");
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      ecrireMdx("saisons-demo", "maitrise-ia", "01-hallucinations");
      expect(listEpisodes("maitrise-ia")).toEqual(["01-hallucinations"]);
      expect(listEpisodes("phishing")).toEqual([]);
    });

    it("ignore ce qui n'est pas un MDX", () => {
      ecrireMdx("saisons-demo", "mobile-essentiels", "01-verrouillage");
      fs.writeFileSync(
        path.join(
          tmpRoot,
          "content",
          "saisons-demo",
          "mobile-essentiels",
          "README.txt",
        ),
        "x",
      );
      expect(listEpisodes("mobile-essentiels")).toEqual(["01-verrouillage"]);
    });

    it("retourne une liste vide pour une saison sans dossier", () => {
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      expect(listEpisodes("saison-fantome")).toEqual([]);
    });

    it("ne plante pas quand un fichier porte le nom de la saison", () => {
      // Les slugs viennent de la base, saisons propres a un espace comprises.
      fs.mkdirSync(path.join(tmpRoot, "content", "saisons"), {
        recursive: true,
      });
      fs.writeFileSync(path.join(tmpRoot, "content", "saisons", "notes"), "x");
      expect(listEpisodes("notes")).toEqual([]);
    });

    it("refuse un slug qui n'est pas un simple nom", () => {
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      expect(listEpisodes("..")).toEqual([]);
      expect(listEpisodes("phishing/../phishing")).toEqual([]);
      expect(listEpisodes("")).toEqual([]);
    });
  });

  describe("listSaisons", () => {
    it("reunit le catalogue commercial et les saisons de demo, sans doublon", () => {
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      ecrireMdx("saisons", "maitrise-ia", "02-autorite-textuelle");
      ecrireMdx("saisons-demo", "maitrise-ia", "01-hallucinations");
      ecrireMdx("saisons-demo", "reconnaitre-phishing", "01-domaine");
      expect(listSaisons().sort()).toEqual([
        "maitrise-ia",
        "phishing",
        "reconnaitre-phishing",
      ]);
    });

    it("ne liste que la demo en mode demo", () => {
      vi.stubEnv("DEMO_MODE", "true");
      ecrireMdx("saisons", "phishing", "01-mail-du-pdg");
      ecrireMdx("saisons-demo", "reconnaitre-phishing", "01-domaine");
      expect(listSaisons()).toEqual(["reconnaitre-phishing"]);
    });

    it("retourne une liste vide quand aucun contenu n'est installe", () => {
      expect(listSaisons()).toEqual([]);
    });
  });
});

// -----------------------------------------------------------------------------
// Sur le VRAI contenu du depot.
//
// Le produit renvoie lui-meme vers deux saisons de demo : elles doivent
// etre servies redigees dans les deux modes, que le catalogue commercial
// soit monte (poste de dev, production) ou non (CI, fork OSS).
// -----------------------------------------------------------------------------
describe.each([
  { mode: "hors mode demo", demoMode: "false" },
  { mode: "en mode demo", demoMode: "true" },
])("les saisons auxquelles le produit renvoie, $mode", ({ demoMode }) => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", demoMode);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function modulesDuCatalogue(saisonSlug: string): string[] {
    const saison = CATALOG_SAISONS_DEMO.find((s) => s.slug === saisonSlug);
    if (!saison) throw new Error(`saison ${saisonSlug} absente du catalogue`);
    return saison.episodes.map((e) => e.slug);
  }

  it("reconnaitre-phishing est servie redigee (remediation des recidivistes)", () => {
    // lib/phishing/repeat-offenders.ts affecte le premier module publie de
    // cette saison a qui a echoue a plusieurs simulations.
    const modules = modulesDuCatalogue("reconnaitre-phishing");
    expect(modules.length).toBeGreaterThan(0);
    for (const slug of modules) {
      expect(
        loadEpisode("reconnaitre-phishing", slug),
        `reconnaitre-phishing/${slug}`,
      ).not.toBeNull();
    }
    expect(listEpisodes("reconnaitre-phishing")).toEqual([...modules].sort());
  });

  it("exposition-numerique est servie redigee (affectation apres validation RSSI)", () => {
    // lib/exposure/b2b-assign.ts affecte 02-email-dans-une-fuite ;
    // /exposition renvoie vers les autres modules de la saison.
    const modules = modulesDuCatalogue("exposition-numerique");
    expect(modules).toContain("02-email-dans-une-fuite");
    for (const slug of modules) {
      expect(
        loadEpisode("exposition-numerique", slug),
        `exposition-numerique/${slug}`,
      ).not.toBeNull();
    }
  });

  it("chaque module du plan de remediation d'exposition est servi redige", () => {
    const plan = deriveRemediationPlan({
      passwordPwned: true,
      passwordCount: 12,
      domainBreaches: 3,
      sensitiveDataInBreaches: true,
      phoneFlagged: true,
    });
    expect(plan.length).toBeGreaterThan(0);
    for (const item of plan) {
      const [saisonSlug, episodeSlug] = item.episodeSlug.split("/");
      expect(
        loadEpisode(saisonSlug, episodeSlug),
        item.episodeSlug,
      ).not.toBeNull();
    }
  });
});
