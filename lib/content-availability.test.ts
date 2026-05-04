// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  countExpertEpisodes,
  hasExpertContent,
  listExpertEpisodes,
} from "./content-availability";

let tmpRoot: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;

function writeMdx(saisonSlug: string, episodeSlug: string) {
  const dir = path.join(tmpRoot, "content", "saisons", saisonSlug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${episodeSlug}.mdx`), "---\ntitle: x\n---\n");
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
});

describe("countExpertEpisodes", () => {
  it("compte le nombre d'episodes avec contenu expert", () => {
    expect(countExpertEpisodes()).toBe(0);
    writeMdx("phishing", "01-mail-du-pdg");
    writeMdx("phishing", "02-faux-rib");
    writeMdx("teletravail", "01-wifi-gare");
    expect(countExpertEpisodes()).toBe(3);
  });
});
