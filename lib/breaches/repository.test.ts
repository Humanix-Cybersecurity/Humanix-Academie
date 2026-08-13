// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { versBigInt } from "./repository";

// Ces tests couvrent le passage de `recordsExposed` de Int a BigInt
// (2026-08-13). Le defaut corrige n'etait pas un plantage visible : int4
// plafonne a 2 147 483 647, une insertion au-dela levait une erreur, et
// upsertScraped() l'attrapait par item. L'observatoire laissait donc tomber
// EN SILENCE les fuites les plus massives.
describe("versBigInt", () => {
  it("laisse passer l'absence de valeur", () => {
    expect(versBigInt(null)).toBeNull();
    expect(versBigInt(undefined)).toBeNull();
  });

  it("refuse les valeurs non finies plutot que de lever", () => {
    // BigInt(NaN) leve un RangeError. Sans ce garde-fou, l'exception
    // remonterait dans le catch par item : une fuite perdue en silence,
    // exactement le defaut qu'on corrige.
    expect(versBigInt(Number.NaN)).toBeNull();
    expect(versBigInt(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("convertit les entiers ordinaires", () => {
    expect(versBigInt(0)).toBe(0n);
    expect(versBigInt(1_500_000)).toBe(1_500_000n);
  });

  it("franchit la borne d'int4, ce que la colonne refusait", () => {
    expect(versBigInt(2_147_483_647)).toBe(2_147_483_647n);
    // La valeur qui echouait : parseRecordsExposed() produit ceci des qu'un
    // titre mentionne « 3 milliards ».
    expect(versBigInt(3_000_000_000)).toBe(3_000_000_000n);
  });

  it("arrondit les non-entiers au lieu de lever", () => {
    // BigInt(3.5) leve un RangeError. Les parseurs arrondissent deja, mais
    // une source future pourrait ne pas le faire.
    expect(versBigInt(3.5)).toBe(4n);
    expect(versBigInt(2.4)).toBe(2n);
  });
});
