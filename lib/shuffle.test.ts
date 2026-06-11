// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { seededShuffle } from "./shuffle";

const ITEMS = ["a", "b", "c", "d"];

describe("seededShuffle", () => {
  it("est déterministe : même seed -> même ordre", () => {
    expect(seededShuffle(ITEMS, "user1:ep1")).toEqual(
      seededShuffle(ITEMS, "user1:ep1"),
    );
  });

  it("préserve tous les éléments (aucune perte ni doublon)", () => {
    const out = seededShuffle(ITEMS, "seed-x");
    expect([...out].sort()).toEqual([...ITEMS].sort());
    expect(out).toHaveLength(ITEMS.length);
  });

  it("ne mute pas le tableau d'origine", () => {
    const copy = [...ITEMS];
    seededShuffle(ITEMS, "seed-y");
    expect(ITEMS).toEqual(copy);
  });

  it("varie selon le seed (anti-corrigé : ordres différents entre users)", () => {
    // Sur un échantillon de seeds, l'ordre ne doit pas être identique partout
    // (sinon la position de la bonne réponse resterait prévisible).
    const orders = new Set(
      Array.from({ length: 12 }, (_, i) =>
        seededShuffle(ITEMS, `user${i}:ep1`).join(""),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("gère les tableaux vides et singletons", () => {
    expect(seededShuffle([], "s")).toEqual([]);
    expect(seededShuffle(["solo"], "s")).toEqual(["solo"]);
  });
});
