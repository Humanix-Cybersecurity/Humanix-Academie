// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it } from "vitest";
import { dateHeureParis, dateLongueParis, dateParis } from "./date-paris";

const FUSEAU_INITIAL = process.env.TZ;

/** Execute `f` avec le fuseau du processus change, comme sur un autre hote. */
function dansLeFuseau<T>(tz: string, f: () => T): T {
  process.env.TZ = tz;
  return f();
}

afterEach(() => {
  if (FUSEAU_INITIAL === undefined) delete process.env.TZ;
  else process.env.TZ = FUSEAU_INITIAL;
});

describe("dateHeureParis", () => {
  it("rend l'instant a l'heure de Paris, en hiver comme en ete", () => {
    expect(dateHeureParis("2026-10-31T13:12:52.000Z")).toBe(
      "31/10/2026 14:12:52",
    );
    expect(dateHeureParis("2026-07-14T22:30:00.000Z")).toBe(
      "15/07/2026 00:30:00",
    );
  });

  it("ecrit minuit 00, jamais 24", () => {
    expect(dateHeureParis("2026-01-01T23:00:00.000Z")).toBe(
      "02/01/2026 00:00:00",
    );
  });

  it("accepte un Date comme une chaine ISO", () => {
    const d = new Date("2026-10-31T13:12:52.000Z");
    expect(dateHeureParis(d)).toBe(dateHeureParis(d.toISOString()));
  });

  it("peut taire les secondes", () => {
    expect(
      dateHeureParis("2026-10-31T13:12:52.000Z", { secondes: false }),
    ).toBe("31/10/2026 14:12");
  });

  it("rend une chaine vide pour une date invalide", () => {
    expect(dateHeureParis("n'importe quoi")).toBe("");
    expect(dateHeureParis(new Date(Number.NaN))).toBe("");
  });

  it("ne depend pas du fuseau du processus, contrairement a toLocaleString", () => {
    const iso = "2026-10-31T13:12:52.000Z";
    const fuseaux = ["UTC", "Europe/Paris", "America/New_York", "Asia/Tokyo"];
    const naifs = fuseaux.map((tz) =>
      dansLeFuseau(tz, () => new Date(iso).toLocaleString("fr-FR")),
    );
    const fixes = fuseaux.map((tz) =>
      dansLeFuseau(tz, () => dateHeureParis(iso)),
    );
    // Garde-fou : le changement de fuseau est effectif dans ce processus,
    // sinon la comparaison qui suit ne prouverait rien.
    expect(new Set(naifs).size).toBe(fuseaux.length);
    expect(fixes).toEqual(fuseaux.map(() => "31/10/2026 14:12:52"));
  });
});

describe("dateParis", () => {
  it("rend le jour civil a Paris, pas le jour UTC", () => {
    expect(dateParis("2026-10-31T13:12:52.000Z")).toBe("31/10/2026");
    // 22 h 30 UTC un soir d'ete : deja le lendemain a Paris.
    expect(dateParis("2026-07-14T22:30:00.000Z")).toBe("15/07/2026");
  });

  it("rend une chaine vide pour une date invalide", () => {
    expect(dateParis("")).toBe("");
  });
});

describe("dateLongueParis", () => {
  it("ecrit le jour civil a Paris en toutes lettres", () => {
    expect(dateLongueParis("2026-11-02T10:00:00.000Z")).toBe("2 novembre 2026");
    expect(dateLongueParis("2026-07-14T22:30:00.000Z")).toBe("15 juillet 2026");
  });

  it("ne depend pas du fuseau du processus", () => {
    const iso = "2026-07-14T22:30:00.000Z";
    const rendus = ["UTC", "Asia/Tokyo"].map((tz) =>
      dansLeFuseau(tz, () => dateLongueParis(iso)),
    );
    expect(rendus).toEqual(["15 juillet 2026", "15 juillet 2026"]);
  });

  it("rend une chaine vide pour une date invalide", () => {
    expect(dateLongueParis("hier")).toBe("");
  });
});
