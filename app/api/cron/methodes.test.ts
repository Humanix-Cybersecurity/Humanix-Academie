// SPDX-License-Identifier: AGPL-3.0-or-later
// Chaque route de app/api/cron doit exposer POST : c'est le verbe qu'emploie
// scripts/cron-runner.sh, donc la crontab de l'hote (infra/cron/crontab.prod).
//
// rapport-comite-direction n'exposait que GET, et a repondu 405 le 1er de
// chaque mois d'aout a novembre 2026 sans que rien ne le signale : la ligne
// « ECHEC 405 » de cron.log n'etait lue par personne. Ce test lit les
// fichiers plutot que de les importer : importer douze routes chargerait
// douze graphes de dependances pour une question de surface.

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));

const routes = readdirSync(DOSSIER)
  .filter((nom) => statSync(path.join(DOSSIER, nom)).isDirectory())
  .map((nom) => ({ nom, fichier: path.join(DOSSIER, nom, "route.ts") }))
  .filter((r) => existsSync(r.fichier));

describe("routes /api/cron", () => {
  it("en trouve au moins les douze connues", () => {
    expect(routes.length).toBeGreaterThanOrEqual(12);
  });

  it.each(routes.map((r) => [r.nom, r.fichier]))(
    "%s expose POST, le verbe de scripts/cron-runner.sh",
    (_nom, fichier) => {
      const source = readFileSync(fichier, "utf8");
      expect(source).toMatch(/export async function POST\(/);
    },
  );
});
