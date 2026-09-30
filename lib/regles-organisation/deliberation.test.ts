// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { BLANC, dateLongue, enLettres, texteActe } from "./deliberation";

const base = {
  nomOrganisation: "Commune de Saint-Exemple",
  nomSignataire: "Camille Durand",
  fonctionSignataire: "Maire",
  referenceActe: "2026-042",
  dateSeance: new Date(Date.UTC(2026, 9, 12)),
  adopteeLe: new Date(Date.UTC(2026, 9, 12)),
  genereLe: new Date(Date.UTC(2026, 8, 30)),
};

describe("texteActe", () => {
  it("écrit une délibération de conseil municipal pour une commune", () => {
    const t = texteActe({ ...base, typeOrganisation: "commune" });
    expect(t.entete[0]).toBe("COMMUNE DE SAINT-EXEMPLE");
    expect(t.entete[1]).toContain("conseil municipal");
    expect(t.entete[2]).toBe("Séance du 12 octobre 2026");
    expect(t.entete[3]).toBe("Délibération n° 2026-042");
    expect(t.preambule).toContain("Camille Durand, maire");
    expect(t.visas[0]).toContain("L2121-29");
    expect(t.considerants[2]).toContain("appartient au conseil municipal");
    expect(t.decide).toBe(
      "Après en avoir délibéré, le conseil municipal DÉCIDE :",
    );
    expect(t.articles).toHaveLength(5);
    expect(t.articles[0].texte).toContain("cinq règles");
    expect(t.articles[1].texte).toContain("aux agents et aux élus");
    expect(t.articles[1].texte).toContain("le maire");
    expect(t.cloture[0]).toContain("délibéré");
    expect(t.regles).toHaveLength(5);
    expect(t.nomFichier).toBe(
      "deliberation-regles-commune-de-saint-exemple.pdf",
    );
  });

  it("met des pointillés à la place des champs vides", () => {
    const t = texteActe({
      ...base,
      typeOrganisation: "commune",
      nomSignataire: null,
      fonctionSignataire: null,
      referenceActe: null,
      dateSeance: null,
    });
    expect(t.entete[2]).toBe(`Séance du ${BLANC}`);
    expect(t.entete[3]).toBe(`Délibération n° ${BLANC}`);
    expect(t.signature).toEqual({ fonction: "Le maire", nom: BLANC });
  });

  it("devient une décision de la direction pour une entreprise", () => {
    const t = texteActe({
      ...base,
      typeOrganisation: "entreprise",
      nomOrganisation: "Braver",
    });
    expect(t.entete[1]).toBe("Décision de la direction");
    expect(t.entete[3]).toBe("Décision n° 2026-042");
    expect(t.preambule).not.toContain("convoqué");
    expect(t.preambule).toContain("en qualité de");
    expect(t.decide).toBe("DÉCIDE :");
    expect(t.visas.join(" ")).not.toContain("collectivités territoriales");
    expect(t.cloture[0]).toBe("Fait le 12 octobre 2026.");
    expect(t.articles[4].texte).toContain("diffusion");
  });

  it("cite le conseil communautaire pour une intercommunalité", () => {
    const t = texteActe({
      ...base,
      typeOrganisation: "intercommunalite",
      nomOrganisation: "Communauté de communes du Val",
    });
    expect(t.entete[1]).toContain("conseil communautaire");
    expect(t.visas[0]).toContain("L5211-1");
    expect(t.articles[1].texte).toContain("la présidence");
  });

  it("nomme le fichier sans accent ni espace", () => {
    const t = texteActe({
      ...base,
      typeOrganisation: "commune",
      nomOrganisation: "Mairie d'Étretat-sur-Mer",
    });
    expect(t.nomFichier).toBe(
      "deliberation-regles-mairie-d-etretat-sur-mer.pdf",
    );
  });
});

describe("utilitaires", () => {
  it("écrit les petits nombres en lettres et les dates en français", () => {
    expect(enLettres(5)).toBe("cinq");
    expect(enLettres(11)).toBe("11");
    expect(dateLongue(new Date(Date.UTC(2026, 0, 1)))).toBe("1 janvier 2026");
  });
});
