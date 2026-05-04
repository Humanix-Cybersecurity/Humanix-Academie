// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests d'intégrité — computeContentHash, shortHash.
// Sécurité critique : un hash incorrect = injection de payload après modération.
// Le hash DOIT être déterministe (même input → même output, peu importe l'ordre des clés)
// et collision-resistant via SHA-256.

import { describe, it, expect } from "vitest";
import { computeContentHash, shortHash } from "./integrity";

describe("computeContentHash", () => {
  it("produit un hash hex SHA-256 (64 caractères)", () => {
    const h = computeContentHash({ foo: "bar" });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it("est déterministe : mêmes objets → même hash", () => {
    const obj = { a: 1, b: 2 };
    expect(computeContentHash(obj)).toBe(computeContentHash(obj));
  });

  it("est insensible à l'ordre des clés (canonicalisation)", () => {
    const a = { foo: 1, bar: 2, baz: 3 };
    const b = { baz: 3, foo: 1, bar: 2 };
    expect(computeContentHash(a)).toBe(computeContentHash(b));
  });

  it("canonicalise récursivement (objets imbriqués)", () => {
    const a = { x: { a: 1, b: 2 } };
    const b = { x: { b: 2, a: 1 } };
    expect(computeContentHash(a)).toBe(computeContentHash(b));
  });

  it("préserve l'ordre des arrays (tableaux non triés)", () => {
    // Important : ne pas trier les arrays sinon on perd la sémantique
    // (ex: liste ordonnée d'épisodes)
    const h1 = computeContentHash({ list: [1, 2, 3] });
    const h2 = computeContentHash({ list: [3, 2, 1] });
    expect(h1).not.toBe(h2);
  });

  it("différencie payloads similaires (collision-resistant)", () => {
    expect(computeContentHash({ foo: "bar" })).not.toBe(
      computeContentHash({ foo: "baz" }),
    );
    expect(computeContentHash({ a: 1 })).not.toBe(computeContentHash({ b: 1 }));
    expect(computeContentHash({ a: "1" })).not.toBe(
      computeContentHash({ a: 1 }),
    );
  });

  it("gère null sans crasher", () => {
    expect(() => computeContentHash(null)).not.toThrow();
  });

  it("rejette undefined (limite connue : JSON.stringify(undefined) = undefined)", () => {
    // DETTE TECHNIQUE — TODO post-launch : faire que computeContentHash(undefined)
    // hash une valeur sentinelle plutôt que de crasher. Pour l'instant, le code
    // appelant ne doit jamais passer undefined (contrat documenté).
    expect(() => computeContentHash(undefined)).toThrow();
  });

  it("gère les types primitifs", () => {
    expect(computeContentHash(42)).toMatch(/^[a-f0-9]{64}$/);
    expect(computeContentHash("hello")).toMatch(/^[a-f0-9]{64}$/);
    expect(computeContentHash(true)).toMatch(/^[a-f0-9]{64}$/);
    expect(computeContentHash(false)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("gère les objets profondément imbriqués sans déborder", () => {
    const deep = {
      level1: { level2: { level3: { level4: { value: "deep" } } } },
    };
    expect(() => computeContentHash(deep)).not.toThrow();
  });

  it("résiste à la mutation de l'objet après hashing", () => {
    const obj: { x: number; y?: number } = { x: 1 };
    const h1 = computeContentHash(obj);
    obj.y = 2;
    const h2 = computeContentHash(obj);
    expect(h1).not.toBe(h2); // confirme qu'on ne stocke pas une réf
  });

  it("payload réaliste — module marketplace complet", () => {
    const payload = {
      episodes: [
        {
          title: "Phishing classique",
          durationMinutes: 5,
          scenario: "Vous recevez un email...",
          choices: [
            {
              id: "a",
              label: "Cliquer",
              outcome: "bad",
              feedback: "Mauvaise idée",
              points: -10,
            },
          ],
        },
      ],
    };
    const h = computeContentHash(payload);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    // Re-test : doit être stable
    expect(computeContentHash(payload)).toBe(h);
  });
});

describe("shortHash", () => {
  it("formate un hash long en 8…8 (17 caractères avec ellipsis)", () => {
    const full =
      "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    expect(shortHash(full)).toBe("abcdef01…23456789");
  });

  it("retourne tel quel si la chaîne est trop courte", () => {
    expect(shortHash("short")).toBe("short");
    expect(shortHash("")).toBe("");
    expect(shortHash("0123456789012345")).toMatch(/…/); // 16 chars : à la limite
  });

  it("ne perd pas d'information au début ni à la fin", () => {
    const full = "1111111122222222ffffffffeeeeeeee";
    const short = shortHash(full);
    expect(short.startsWith("11111111")).toBe(true);
    expect(short.endsWith("eeeeeeee")).toBe(true);
  });
});
