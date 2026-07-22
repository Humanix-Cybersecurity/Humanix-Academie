// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  coverageToAnswer,
  exercicesToAnswer,
  MEASURED_OBJECTIFS,
  OBJ_FORMATION,
  OBJ_EXERCICES,
} from "./recyf-tenant";
import { RECYF_BY_ID } from "./recyf";

describe("coverageToAnswer", () => {
  it("seuils 70 / 30", () => {
    expect(coverageToAnswer(100)).toBe("oui");
    expect(coverageToAnswer(70)).toBe("oui");
    expect(coverageToAnswer(69)).toBe("en_partie");
    expect(coverageToAnswer(30)).toBe("en_partie");
    expect(coverageToAnswer(29)).toBe("non");
    expect(coverageToAnswer(0)).toBe("non");
  });
});

describe("exercicesToAnswer", () => {
  it("un exercice terminé sur 12 mois = oui", () => {
    expect(exercicesToAnswer(1, 3)).toBe("oui");
    expect(exercicesToAnswer(2, 2)).toBe("oui");
  });
  it("des exercices mais aucun terminé récemment = en_partie", () => {
    expect(exercicesToAnswer(0, 1)).toBe("en_partie");
  });
  it("aucun exercice = non", () => {
    expect(exercicesToAnswer(0, 0)).toBe("non");
  });
});

describe("objectifs auto-mesures", () => {
  it("pointent vers des objectifs ReCyF existants", () => {
    expect(RECYF_BY_ID[OBJ_FORMATION]).toBeDefined();
    expect(RECYF_BY_ID[OBJ_EXERCICES]).toBeDefined();
    expect(MEASURED_OBJECTIFS).toEqual([OBJ_FORMATION, OBJ_EXERCICES]);
  });
  it("l'objectif formation dispose de saisons mappées", () => {
    expect(RECYF_BY_ID[OBJ_FORMATION].saisons.length).toBeGreaterThan(0);
  });
});
