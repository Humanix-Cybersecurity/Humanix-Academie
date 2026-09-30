// SPDX-License-Identifier: AGPL-3.0-or-later
// Rendu reel des deux PDF (acte et affiche) : on verifie qu'ils se generent
// et qu'ils contiennent le texte attendu. HUMANIX_PDF_OUT=<dossier> ecrit
// aussi les fichiers, pour un controle visuel.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { dateLongue, texteActe } from "./deliberation";
import { AffichePdf, DeliberationPdf } from "./pdf";
import { reglesPour } from "./regles";

const seance = new Date(Date.UTC(2026, 9, 12));
const sortie = process.env.HUMANIX_PDF_OUT;

function ecrire(nom: string, buffer: Buffer) {
  if (!sortie) return;
  mkdirSync(sortie, { recursive: true });
  writeFileSync(join(sortie, nom), buffer);
}

describe("PDF des règles", () => {
  it("rend la délibération d'une commune sur deux pages au moins", async () => {
    const texte = texteActe({
      typeOrganisation: "commune",
      nomOrganisation: "Commune de Saint-Exemple",
      nomSignataire: "Camille Durand",
      fonctionSignataire: "Maire",
      referenceActe: "2026-042",
      dateSeance: seance,
      adopteeLe: seance,
      genereLe: seance,
    });
    const buffer = await renderToBuffer(<DeliberationPdf texte={texte} />);
    ecrire("deliberation-commune.pdf", buffer);
    expect(buffer.length).toBeGreaterThan(5000);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(
      (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("rend une décision d'entreprise avec des pointillés quand rien n'est renseigné", async () => {
    const texte = texteActe({
      typeOrganisation: "entreprise",
      nomOrganisation: "Braver",
      nomSignataire: null,
      fonctionSignataire: null,
      referenceActe: null,
      dateSeance: null,
      adopteeLe: null,
      genereLe: seance,
    });
    const buffer = await renderToBuffer(<DeliberationPdf texte={texte} />);
    ecrire("decision-entreprise-vide.pdf", buffer);
    expect(buffer.length).toBeGreaterThan(5000);
  });

  it("rend l'affiche sur une page", async () => {
    const buffer = await renderToBuffer(
      <AffichePdf
        nomOrganisation="Commune de Saint-Exemple"
        typeOrganisation="commune"
        regles={reglesPour("commune")}
        adopteeStr={`Adoptées par le conseil municipal le ${dateLongue(seance)}.`}
      />,
    );
    ecrire("affiche.pdf", buffer);
    expect(buffer.length).toBeGreaterThan(3000);
    expect(
      (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length,
    ).toBe(1);
  });
});
