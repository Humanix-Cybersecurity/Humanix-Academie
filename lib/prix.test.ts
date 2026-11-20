// SPDX-License-Identifier: AGPL-3.0-or-later
// La table des prix et ses quatre calculs. Les montants attendus sont ecrits
// en dur : ce sont ceux de la grille publique (README, /tarifs). Changer un
// prix, c'est changer lib/prix.ts ET ce fichier, en connaissance de cause.

import { describe, expect, it } from "vitest";
import {
  formaterPrix,
  libellePrixPlan,
  montantEcheanceCentimes,
  prixMensuelCentimes,
  remiseAnnuellePourcent,
} from "./prix";

describe("prixMensuelCentimes - le chiffre « par mois » de la grille", () => {
  it("Pro sans engagement : 3 EUR par siege", () => {
    expect(prixMensuelCentimes("pro", "monthly", 1)).toBe(300);
    expect(prixMensuelCentimes("pro", "monthly", 16)).toBe(4800);
    expect(prixMensuelCentimes("pro", "monthly", 250)).toBe(75000);
  });

  it("Pro en engagement annuel : 2,50 EUR par siege", () => {
    expect(prixMensuelCentimes("pro", "annual", 1)).toBe(250);
    expect(prixMensuelCentimes("pro", "annual", 80)).toBe(20000);
  });

  it("Starter : un forfait, quel que soit le nombre de sieges", () => {
    for (const sieges of [1, 6, 15]) {
      expect(prixMensuelCentimes("starter", "monthly", sieges)).toBe(1900);
      expect(prixMensuelCentimes("starter", "annual", sieges)).toBe(1500);
    }
  });

  it("Enterprise : sur devis, aucun prix", () => {
    expect(prixMensuelCentimes("enterprise", "monthly", 300)).toBeNull();
    expect(prixMensuelCentimes("enterprise", "annual", 300)).toBeNull();
  });

  it("reste en centimes entiers sur toute la plage Pro", () => {
    for (let sieges = 16; sieges <= 250; sieges++) {
      for (const cycle of ["monthly", "annual"] as const) {
        expect(
          Number.isInteger(prixMensuelCentimes("pro", cycle, sieges)),
        ).toBe(true);
      }
    }
  });
});

describe("montantEcheanceCentimes - ce qui est preleve en une fois", () => {
  it("mensuel : un mois", () => {
    expect(montantEcheanceCentimes("pro", "monthly", 16)).toBe(4800);
    expect(montantEcheanceCentimes("starter", "monthly", 10)).toBe(1900);
  });

  it("annuel : douze mois au prix de l'engagement annuel", () => {
    // Le cas du 2026-11-20 : 80 sieges, 2 400 EUR, et non 2 592.
    expect(montantEcheanceCentimes("pro", "annual", 80)).toBe(240000);
    expect(montantEcheanceCentimes("pro", "annual", 16)).toBe(48000);
    // 15 EUR par mois affiches, donc 180 EUR, et non 228.
    expect(montantEcheanceCentimes("starter", "annual", 10)).toBe(18000);
  });

  it("Enterprise : sur devis", () => {
    expect(montantEcheanceCentimes("enterprise", "annual", 300)).toBeNull();
  });
});

describe("remiseAnnuellePourcent", () => {
  it("Pro : -17 %", () => {
    expect(remiseAnnuellePourcent("pro")).toBe(17);
  });
  it("Starter : -21 %", () => {
    expect(remiseAnnuellePourcent("starter")).toBe(21);
  });
  it("Enterprise : pas de remise chiffree", () => {
    expect(remiseAnnuellePourcent("enterprise")).toBeNull();
  });
});

describe("formaterPrix", () => {
  it("n'affiche les centimes que s'il y en a", () => {
    expect(formaterPrix(1900)).toBe("19");
    expect(formaterPrix(250)).toBe("2,50");
    expect(formaterPrix(4805)).toBe("48,05");
    expect(formaterPrix(0)).toBe("0");
  });

  it("separe les milliers par une espace insecable", () => {
    expect(formaterPrix(240000)).toBe("2 400");
    expect(formaterPrix(123456789)).toBe("1 234 567,89");
  });

  it("garde le signe", () => {
    expect(formaterPrix(-250)).toBe("-2,50");
  });
});

describe("libellePrixPlan - le prix public, toujours TTC", () => {
  it("Starter : forfait", () => {
    expect(libellePrixPlan("starter")).toBe("19 €/mois TTC · forfait");
  });
  it("Pro : par utilisateur, et pas « sur devis »", () => {
    expect(libellePrixPlan("pro")).toBe("3 €/utilisateur/mois TTC");
  });
  it("Enterprise : sur devis", () => {
    expect(libellePrixPlan("enterprise")).toBe("Tarif sur devis");
  });
  it("aucun libelle ne dit « HT »", () => {
    for (const plan of ["starter", "pro", "enterprise"] as const) {
      expect(libellePrixPlan(plan)).not.toMatch(/\bHT\b/);
    }
  });
});
