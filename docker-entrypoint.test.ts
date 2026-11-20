// SPDX-License-Identifier: AGPL-3.0-or-later
//
// docker-entrypoint.sh est le premier code qui tourne dans le conteneur. On
// l'exécute ici pour de bon, avec sh, dans un bac à sable : `prisma` et `next`
// y sont des doublures qui journalisent leur appel et rendent la main.
//
// Ce que ces tests protègent : la garde sur les secrets. Le compose
// d'auto-hébergement écrivait AUTH_SECRET en dur, avec une valeur de
// démonstration publiée dans le dépôt, et ne lisait pas le `.env` que le guide
// fait remplir. Une instance pouvait donc signer ses sessions avec un secret
// connu de tous. Le conteneur refuse maintenant de démarrer dans ce cas, et il
// doit refuser AVANT d'avoir touché à la base.

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(import.meta.dirname, "docker-entrypoint.sh");
const SH_DISPONIBLE = spawnSync("sh", ["-c", "exit 0"]).status === 0;

// Ce que produit `openssl rand -base64 32` : 44 caractères.
const SECRET_SOLIDE = "k3V9mQ2xT7pL0aZ8bN4cR6dW1eY5fU3gH7iJ9oK2sM4=";

// Les valeurs que le dépôt a publiées pour AUTH_SECRET, et d'où elles viennent.
const EXEMPLES_PUBLIES: [string, string][] = [
  [
    "l'ancien docker-compose.yml",
    "demo-secret-change-me-in-prod-d3m0-s3cr3t-1234567890",
  ],
  [
    ".env.example",
    "REMPLACE_MOI_PAR_UN_SECRET_GENERE_AVEC_OPENSSL_RAND_BASE64_32",
  ],
  ["docs/installation.md", "remplace-moi-par-un-secret-genere"],
  ["docs/configuration.md", "...32+ caractères aléatoires base64..."],
  [
    "l'exemple de sortie d'openssl dans docs/configuration.md",
    "Iqx9Ot/tCBmrFqkAcLqxdj9DZpvEBALMqoqW2Bxxxxx=",
  ],
  ["la construction de l'image", "build-time-only-not-a-real-secret"],
];

const CRON_PUBLIE = "demo-cron-secret-change-me-32-chars-minimum-pour-prod";

function doublure(nom: string): string {
  return `#!/bin/sh\necho "${nom} $*" >> "$BAC/journal"\nexit 0\n`;
}

const bacs: string[] = [];

function creerBac(): string {
  const bac = mkdtempSync(join(tmpdir(), "entrypoint-"));
  bacs.push(bac);
  const bin = join(bac, "node_modules", ".bin");
  mkdirSync(bin, { recursive: true });
  for (const nom of ["prisma", "next"]) {
    writeFileSync(join(bin, nom), doublure(nom));
    chmodSync(join(bin, nom), 0o755);
  }
  writeFileSync(join(bac, "journal"), "");
  return bac;
}

type Resultat = {
  code: number | null;
  /** Sortie standard et sortie d'erreur du script. */
  sortie: string;
  /** Un appel de doublure par ligne, dans l'ordre. */
  journal: string[];
};

function lancer(
  variables: Record<string, string>,
  ...args: string[]
): Resultat {
  const bac = creerBac();
  const r = spawnSync("sh", [SCRIPT, ...args], {
    // Le script appelle ./node_modules/.bin/prisma et next par chemin relatif.
    cwd: bac,
    encoding: "utf8",
    // Environnement fermé : rien de ce que le poste ou la CI définit par
    // ailleurs (un AUTH_SECRET de développement, par exemple) ne doit décider
    // du résultat.
    env: {
      PATH: process.env.PATH ?? "",
      // Comme dans l'image, qui le fixe par ENV.
      NODE_ENV: "production",
      BAC: bac,
      // Démarrage sans préparation : le script vérifie le schéma avec la
      // doublure de prisma puis lance la doublure de next, sans appeler node.
      HUMANIX_PREPARER_AU_DEMARRAGE: "false",
      ...variables,
    },
  });
  return {
    code: r.status,
    sortie: `${r.stdout}${r.stderr}`,
    journal: readFileSync(join(bac, "journal"), "utf8")
      .split("\n")
      .filter(Boolean),
  };
}

afterEach(() => {
  for (const bac of bacs.splice(0)) {
    rmSync(bac, { recursive: true, force: true });
  }
});

describe.skipIf(!SH_DISPONIBLE)(
  "docker-entrypoint.sh : la garde sur les secrets",
  { timeout: 30_000 },
  () => {
    it("démarre Next.js avec un secret généré", () => {
      const r = lancer({ AUTH_SECRET: SECRET_SOLIDE });

      expect(r.sortie).toContain("[garde] Secrets : aucune valeur d'exemple.");
      expect(r.sortie).not.toContain("AVERTISSEMENT");
      expect(r.journal.at(-1)).toBe("next start -H 0.0.0.0 -p 3000");
      expect(r.code).toBe(0);
    });

    it.each(EXEMPLES_PUBLIES)(
      "refuse la valeur d'exemple de %s",
      (_origine, valeur) => {
        const r = lancer({ AUTH_SECRET: valeur });

        expect(r.sortie).toContain("DEMARRAGE REFUSE");
        expect(r.sortie).toContain("AUTH_SECRET est une valeur d'exemple");
        expect(r.code).toBe(1);
        // Ni la base ni Next.js n'ont été approchés.
        expect(r.journal).toEqual([]);
        // Le journal du conteneur ne répète pas la valeur d'un secret.
        expect(r.sortie).not.toContain(valeur);
      },
    );

    it("refuse un AUTH_SECRET absent", () => {
      const r = lancer({});

      expect(r.sortie).toContain("AUTH_SECRET est vide.");
      expect(r.code).toBe(1);
      expect(r.journal).toEqual([]);
    });

    it("refuse un AUTH_SECRET vide", () => {
      const r = lancer({ AUTH_SECRET: "" });

      expect(r.sortie).toContain("AUTH_SECRET est vide.");
      expect(r.code).toBe(1);
      expect(r.journal).toEqual([]);
    });

    it("refuse un AUTH_SECRET de moins de 16 caractères", () => {
      const r = lancer({ AUTH_SECRET: "a".repeat(15) });

      expect(r.sortie).toContain("AUTH_SECRET est trop court : 15 caracteres");
      expect(r.code).toBe(1);
      expect(r.journal).toEqual([]);
    });

    it("démarre en le signalant quand AUTH_SECRET fait de 16 à 31 caractères", () => {
      const r = lancer({ AUTH_SECRET: SECRET_SOLIDE.slice(0, 16) });

      expect(r.sortie).toContain(
        "AVERTISSEMENT : AUTH_SECRET fait 16 caracteres",
      );
      expect(r.journal.at(-1)).toBe("next start -H 0.0.0.0 -p 3000");
      expect(r.code).toBe(0);
    });

    it("ne signale rien à partir de 32 caractères", () => {
      const r = lancer({ AUTH_SECRET: SECRET_SOLIDE.slice(0, 32) });

      expect(r.sortie).not.toContain("AVERTISSEMENT");
      expect(r.code).toBe(0);
    });

    it("refuse la valeur d'exemple de CRON_SECRET", () => {
      const r = lancer({
        AUTH_SECRET: SECRET_SOLIDE,
        CRON_SECRET: CRON_PUBLIE,
      });

      expect(r.sortie).toContain("DEMARRAGE REFUSE");
      expect(r.sortie).toContain("CRON_SECRET est la valeur d'exemple");
      expect(r.sortie).not.toContain("AUTH_SECRET est");
      expect(r.code).toBe(1);
      expect(r.journal).toEqual([]);
      expect(r.sortie).not.toContain(CRON_PUBLIE);
    });

    it("nomme les deux secrets quand les deux sont des exemples", () => {
      const r = lancer({
        AUTH_SECRET: EXEMPLES_PUBLIES[0][1],
        CRON_SECRET: CRON_PUBLIE,
      });

      expect(r.sortie).toContain("AUTH_SECRET est une valeur d'exemple");
      expect(r.sortie).toContain("CRON_SECRET est la valeur d'exemple");
      expect(r.code).toBe(1);
    });

    it("accepte un CRON_SECRET vide : les routes cron refusent alors tout appel", () => {
      const r = lancer({ AUTH_SECRET: SECRET_SOLIDE, CRON_SECRET: "" });

      expect(r.code).toBe(0);
    });

    it("accepte un CRON_SECRET généré", () => {
      const r = lancer({
        AUTH_SECRET: SECRET_SOLIDE,
        CRON_SECRET:
          "9f2c4e6a8b0d1f3a5c7e9b2d4f6a8c0e1b3d5f7a9c2e4b6d8f0a1c3e5b7d9f2a",
      });

      expect(r.code).toBe(0);
    });

    it("ne fait pas d'exception pour le mode démonstration", () => {
      const r = lancer({
        AUTH_SECRET: EXEMPLES_PUBLIES[0][1],
        DEMO_MODE: "true",
      });

      expect(r.sortie).toContain("DEMARRAGE REFUSE");
      expect(r.code).toBe(1);
      expect(r.journal).toEqual([]);
    });

    it("refuse aussi en mode « preparer », avant de toucher à la base", () => {
      const r = lancer({ AUTH_SECRET: EXEMPLES_PUBLIES[0][1] }, "preparer");

      expect(r.sortie).toContain("DEMARRAGE REFUSE");
      expect(r.code).toBe(1);
      expect(r.journal).toEqual([]);
    });

    it("ne cherche pas de motif : seule une valeur publiée est refusée", () => {
      // Un motif (« change-me », « remplace ») refuserait un jour un vrai
      // secret, et changer AUTH_SECRET sur une instance qui a servi n'est pas
      // gratuit.
      const r = lancer({
        AUTH_SECRET: "k3V9mQ2xT7pL-change-me-0aZ8bN4cR6dW1eY5fU3gH7",
      });

      expect(r.code).toBe(0);
    });
  },
);
