// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { csvEscape, buildCsv, CSV_BOM } from "./csv";

describe("csvEscape", () => {
  it("laisse passer les valeurs simples", () => {
    expect(csvEscape("alice")).toBe("alice");
    expect(csvEscape(42)).toBe("42");
  });

  it("retourne une chaine vide pour null/undefined", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });

  it("quote les cellules contenant virgule, guillemet ou saut de ligne", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('dit "salut"')).toBe('"dit ""salut"""');
    expect(csvEscape("l1\nl2")).toBe('"l1\nl2"');
  });

  it("neutralise les formules Excel/Sheets (CSV injection)", () => {
    expect(csvEscape("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvEscape("+331234")).toBe("'+331234");
    expect(csvEscape("-cmd")).toBe("'-cmd");
    expect(csvEscape("@import")).toBe("'@import");
  });

  it("neutralise aussi tab et CR en debut de cellule", () => {
    expect(csvEscape("\tx")).toBe("'\tx");
    // Le CR initial est prefixe PUIS la cellule est quotee (contient CR).
    expect(csvEscape("\rx")).toBe('"\'\rx"');
  });
});

describe("buildCsv", () => {
  it("prefixe le BOM, joint en CRLF et termine par CRLF", () => {
    const csv = buildCsv(["A", "B"], [["1", "2"]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}A,B\r\n1,2\r\n`);
  });

  it("echappe les cellules des rows", () => {
    const csv = buildCsv(["A"], [["=1+1"], ["x,y"]]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain('"x,y"');
  });
});
