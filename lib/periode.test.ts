// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { instantParis, decalageParisMinutes } from "./periode";

/**
 * Rend l'instant tel qu'il s'affiche a Paris, en « AAAA-MM-JJ HH:MM:SS ».
 *
 * Construit a partir des PARTIES et non de format() : les locales rendent
 * l'heure differemment (fr-CA donne « 00 h 00 min 00 s »), et une assertion
 * ne doit pas dependre de ca.
 */
function aParis(d: Date): string {
  const p = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: "Europe/Paris",
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  // hourCycle h23 : minuit peut sortir en « 24 » selon l'implementation.
  const h = v("hour") === "24" ? "00" : v("hour");
  return `${v("year")}-${v("month")}-${v("day")} ${h}:${v("minute")}:${v("second")}`;
}

describe("decalageParisMinutes", () => {
  it("+120 en ete, +60 en hiver", () => {
    expect(decalageParisMinutes(new Date("2026-08-15T12:00:00Z"))).toBe(120);
    expect(decalageParisMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(60);
  });
});

describe("instantParis", () => {
  it("le debut d'un jour d'ete est bien minuit A PARIS", () => {
    expect(aParis(instantParis("2026-08-01")!)).toBe("2026-08-01 00:00:00");
  });

  it("la fin d'un jour d'ete est bien 23:59:59 A PARIS", () => {
    expect(aParis(instantParis("2026-08-31", true)!)).toBe("2026-08-31 23:59:59");
  });

  // LE DEFAUT CORRIGE : en UTC, cette borne tombait au 1er septembre 01 h 59
  // heure de Paris, donc l'export d'aout avalait deux heures de septembre.
  it("la fin d'aout ne deborde PAS sur septembre", () => {
    const fin = instantParis("2026-08-31", true)!;
    expect(aParis(fin).startsWith("2026-08-31")).toBe(true);
  });

  it("le debut d'aout n'ampute PAS les premieres heures", () => {
    const debut = instantParis("2026-08-01")!;
    // Une facture emise le 1er aout a 00 h 30 a Paris doit etre dans la periode.
    const facture = new Date("2026-07-31T22:30:00Z"); // = 1er aout 00 h 30 a Paris
    expect(aParis(facture).startsWith("2026-08-01")).toBe(true);
    expect(facture.getTime()).toBeGreaterThanOrEqual(debut.getTime());
  });

  it("fonctionne en hiver aussi", () => {
    expect(aParis(instantParis("2026-01-01")!)).toBe("2026-01-01 00:00:00");
    expect(aParis(instantParis("2026-12-31", true)!)).toBe("2026-12-31 23:59:59");
  });

  // Les deux jours de bascule d'heure : la borne doit rester sur le bon jour.
  it("tient le jour du passage a l'heure d'ete", () => {
    expect(aParis(instantParis("2026-03-29")!).startsWith("2026-03-29")).toBe(true);
    expect(aParis(instantParis("2026-03-29", true)!).startsWith("2026-03-29")).toBe(true);
  });

  it("tient le jour du passage a l'heure d'hiver", () => {
    expect(aParis(instantParis("2026-10-25")!).startsWith("2026-10-25")).toBe(true);
    expect(aParis(instantParis("2026-10-25", true)!).startsWith("2026-10-25")).toBe(true);
  });

  it("refuse ce qui n'est pas une date", () => {
    for (const v of ["", "nimportequoi", "01/08/2026", "2026-8-1", "2026-13-01x"]) {
      expect(instantParis(v)).toBeNull();
    }
  });
});
