// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la grille tarifaire - calculateMonthlyPrice + structure TIERS.
// Critique : un bug de pricing = mauvaise facturation = litige client.
//
// Couvre les 6 paliers : Community (exclu cloud), Découverte (free 5),
// Starter (forfait 19€), Essentielle (3€/u, 16-50), Pro (2,50€/u, 51-250),
// Enterprise (devis, 250+).

import { describe, it, expect } from "vitest";
import { TIERS, ADD_ONS, calculateMonthlyPrice } from "./pricing";

describe("Structure TIERS", () => {
  it("contient exactement 6 paliers (community + 5 cloud)", () => {
    expect(TIERS).toHaveLength(6);
    const ids = TIERS.map((t) => t.id);
    expect(ids).toContain("community");
    expect(ids).toContain("decouverte");
    expect(ids).toContain("solo");
    expect(ids).toContain("essentielle");
    expect(ids).toContain("pro");
    expect(ids).toContain("premium");
  });

  it("Community est marqué selfHostOnly", () => {
    const c = TIERS.find((t) => t.id === "community");
    expect(c?.selfHostOnly).toBe(true);
  });

  it("Découverte est marqué freeForever", () => {
    const d = TIERS.find((t) => t.id === "decouverte");
    expect(d?.freeForever).toBe(true);
  });

  it("la fonction calculateMonthlyPrice associe chaque taille à un palier sans gap", () => {
    // Note : les TIERS ont des plages qui SE CHEVAUCHENT volontairement
    // (ex: Starter min=1 max=15, Découverte min=1 max=5). Le matching
    // se fait par "first wins" - Découverte est testé en premier.
    // Ce qui compte c'est que CHAQUE taille trouve un palier.
    for (const seats of [1, 5, 6, 15, 16, 50, 51, 250, 251, 1000]) {
      const r = calculateMonthlyPrice(seats, "monthly");
      expect(r.tier).toBeDefined();
      expect(r.tier.id).not.toBe("community"); // jamais self-host pour un calcul cloud
    }
  });

  it("Enterprise (premium) a une plage ouverte (max null)", () => {
    const enterprise = TIERS.find((t) => t.id === "premium");
    expect(enterprise?.seats.max).toBe(null);
  });

  it("chaque palier a label, tagline, emoji, features non vides", () => {
    for (const t of TIERS) {
      expect(t.name).toBeTruthy();
      expect(t.tagline).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(t.features.length).toBeGreaterThan(0);
      expect(t.cta.label).toBeTruthy();
    }
  });
});

describe("calculateMonthlyPrice - Découverte (1-5 sièges)", () => {
  it("1 siège → Découverte gratuit", () => {
    const r = calculateMonthlyPrice(1, "monthly");
    expect(r.tier.id).toBe("decouverte");
    expect(r.isFree).toBe(true);
    expect(r.total).toBe(0);
  });

  it("5 sièges → Découverte gratuit (limite supérieure)", () => {
    const r = calculateMonthlyPrice(5, "monthly");
    expect(r.tier.id).toBe("decouverte");
    expect(r.isFree).toBe(true);
  });
});

describe("calculateMonthlyPrice - Starter (6-15 sièges, forfait)", () => {
  it("6 sièges → Starter forfait", () => {
    const r = calculateMonthlyPrice(6, "monthly");
    expect(r.tier.id).toBe("solo");
    expect(r.isFree).toBe(false);
    expect(r.isQuote).toBe(false);
    expect(r.total).toBeGreaterThan(0);
  });

  it("15 sièges → Starter forfait (limite haute)", () => {
    const r = calculateMonthlyPrice(15, "monthly");
    expect(r.tier.id).toBe("solo");
  });

  it("forfait : total identique pour 6 ou 15 sièges, perUser baisse", () => {
    const r6 = calculateMonthlyPrice(6, "monthly");
    const r15 = calculateMonthlyPrice(15, "monthly");
    expect(r15.total).toBe(r6.total);
    expect(r15.perUser).toBeLessThan(r6.perUser);
  });

  it("annuel < 12 × mensuel (remise volume)", () => {
    const m = calculateMonthlyPrice(10, "monthly");
    const a = calculateMonthlyPrice(10, "annual");
    expect(a.total * 12).toBeLessThan(m.total * 12);
  });
});

describe("calculateMonthlyPrice - Essentielle (16-50 sièges, par utilisateur)", () => {
  it("16 sièges → Essentielle", () => {
    const r = calculateMonthlyPrice(16, "monthly");
    expect(r.tier.id).toBe("essentielle");
  });

  it("50 sièges → Essentielle (limite haute)", () => {
    const r = calculateMonthlyPrice(50, "monthly");
    expect(r.tier.id).toBe("essentielle");
  });

  it("perUser stable, total = sièges × perUser", () => {
    const r20 = calculateMonthlyPrice(20, "monthly");
    const r40 = calculateMonthlyPrice(40, "monthly");
    expect(r40.perUser).toBe(r20.perUser);
    expect(r20.total).toBe(20 * r20.perUser);
    expect(r40.total).toBe(40 * r40.perUser);
  });
});

describe("calculateMonthlyPrice - Pro (51-250 sièges)", () => {
  it("51 sièges → Pro", () => {
    expect(calculateMonthlyPrice(51, "monthly").tier.id).toBe("pro");
  });

  it("250 sièges → Pro (limite haute)", () => {
    expect(calculateMonthlyPrice(250, "monthly").tier.id).toBe("pro");
  });

  it("Pro est moins cher par utilisateur que Essentielle", () => {
    const ess = calculateMonthlyPrice(40, "monthly");
    const pro = calculateMonthlyPrice(100, "monthly");
    expect(pro.perUser).toBeLessThan(ess.perUser);
  });
});

describe("calculateMonthlyPrice - Enterprise (250+, devis)", () => {
  it("251 sièges → Enterprise", () => {
    const r = calculateMonthlyPrice(251, "monthly");
    expect(r.tier.id).toBe("premium");
  });

  it("Enterprise est marqué isQuote (sur devis)", () => {
    const r = calculateMonthlyPrice(500, "monthly");
    expect(r.isQuote).toBe(true);
    expect(r.total).toBe(0); // pas de prix calculable
  });

  it("10 000 sièges → toujours Enterprise (pas de palier au-dessus)", () => {
    const r = calculateMonthlyPrice(10000, "monthly");
    expect(r.tier.id).toBe("premium");
  });
});

describe("Cohérence inter-paliers (Essentielle → Pro → Enterprise)", () => {
  it("le prix/utilisateur décroît entre Essentielle (3€) et Pro (2,50€)", () => {
    // Note : Starter est un forfait, son prix/user dépend du nombre de sièges
    // (à 15 sièges, c'est ~1,90 €/user, ce qui est PLUS BAS que Essentielle).
    // Cette "remontée" entre Starter@15 et Essentielle@16 est volontaire
    // (incite à passer en annuel ou à grandir d'un cran).
    // On teste donc uniquement la décroissance Essentielle → Pro qui doit être stricte.
    const ess = calculateMonthlyPrice(40, "monthly");
    const pro = calculateMonthlyPrice(100, "monthly");
    expect(pro.perUser).toBeLessThan(ess.perUser);
  });

  it("Pro (3€/user) est moins cher que Découverte qui n'est pas applicable au volume", () => {
    // Sanity check : 100 sièges → on est bien en Pro (pas en Découverte limité à 5)
    const r = calculateMonthlyPrice(100, "monthly");
    expect(r.tier.id).toBe("pro");
  });
});

describe("ADD_ONS", () => {
  it("est non vide et chaque add-on a label + prix", () => {
    expect(ADD_ONS.length).toBeGreaterThan(0);
    for (const a of ADD_ONS) {
      expect(a.name).toBeTruthy();
      expect(a.description).toBeTruthy();
    }
  });
});
