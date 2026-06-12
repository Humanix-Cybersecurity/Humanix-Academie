// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { toVectorLiteral, EMBED_DIMS } from "./pgvector";

// Note : isPgvectorAvailable / queryNearest / upsertChunk font des
// $queryRawUnsafe - testes en integration post-launch. Ici on couvre
// la validation des inputs (notre defense contre l'injection SQL puisque
// le vector literal est concatene en SQL et non passe en parametre).

describe("toVectorLiteral", () => {
  it("formate un vecteur simple en literal pgvector [a,b,c]", () => {
    expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
  });

  it("supporte les entiers, negatifs, zero", () => {
    expect(toVectorLiteral([0, -1, 2, -3.5])).toBe("[0,-1,2,-3.5]");
  });

  it("rejette NaN (anti-injection)", () => {
    expect(() => toVectorLiteral([0.1, NaN, 0.3])).toThrow(/non-numerique/);
  });

  it("rejette Infinity et -Infinity (anti-injection)", () => {
    expect(() => toVectorLiteral([Infinity])).toThrow(/non-numerique/);
    expect(() => toVectorLiteral([-Infinity])).toThrow(/non-numerique/);
  });

  it("rejette undefined dans l'array (typage runtime)", () => {
    expect(() => toVectorLiteral([0.1, undefined as unknown as number])).toThrow(
      /non-numerique/,
    );
  });

  it("rejette string deguisee en number (anti-injection)", () => {
    expect(() =>
      toVectorLiteral([0.1, "0.2" as unknown as number]),
    ).toThrow(/non-numerique/);
  });

  it("supporte un vecteur de dimension EMBED_DIMS (1024)", () => {
    const v = new Array(EMBED_DIMS).fill(0.001);
    const lit = toVectorLiteral(v);
    expect(lit.startsWith("[")).toBe(true);
    expect(lit.endsWith("]")).toBe(true);
    // 1024 valeurs + 1023 virgules + crochets
    const commas = (lit.match(/,/g) ?? []).length;
    expect(commas).toBe(EMBED_DIMS - 1);
  });

  it("ne contient AUCUN caractere SQL dangereux dans le literal sortant", () => {
    const v = new Array(10).fill(0.5);
    const lit = toVectorLiteral(v);
    // Aucun ", ', ;, espace, --, --
    expect(lit).not.toMatch(/['";\s]/);
    expect(lit).not.toContain("--");
  });

  it("vecteur vide retourne []", () => {
    expect(toVectorLiteral([])).toBe("[]");
  });
});

describe("EMBED_DIMS (constante publique)", () => {
  it("vaut 1024 (mistral-embed)", () => {
    expect(EMBED_DIMS).toBe(1024);
  });
});
