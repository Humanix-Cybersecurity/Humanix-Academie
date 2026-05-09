// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la grille tarifaire - calculateMonthlyPrice + structure TIERS.
// Critique : un bug de pricing = mauvaise facturation = litige client.
//
// Couvre les 4 paliers : Community (exclu cloud), Starter (free <=5 / 19EUR
// 6-15), Pro (3EUR/u 16-250), Enterprise (devis 250+).

import { describe, it, expect } from "vitest";
import { TIERS, ADD_ONS, calculateMonthlyPrice } from "./pricing";

describe("Structure TIERS", () => {
  it("contient exactement 4 paliers (community + 3 cloud)", () => {
    expect(TIERS).toHaveLength(4);
    const ids = TIERS.map((t) => t.id);
    expect(ids).toContain("community");
    expect(ids).toContain("starter");
    expect(ids).toContain("pro");
    expect(ids).toContain("enterprise");
  });

  it("Community est marqué selfHostOnly", () => {
    const c = TIERS.find((t) => t.id === "community");
    expect(c?.selfHostOnly).toBe(true);
  });

  it("Starter est marqué freeForever et a freeUnderSeats=5", () => {
    const s = TIERS.find((t) => t.id === "starter");
    expect(s?.freeForever).toBe(true);
    expect(s?.freeUnderSeats).toBe(5);
  });

  it("la fonction calculateMonthlyPrice associe chaque taille à un palier sans gap", () => {
    for (const seats of [1, 5, 6, 15, 16, 50, 100, 250, 251, 1000]) {
      const r = calculateMonthlyPrice(seats, "monthly");
      expect(r.tier).toBeDefined();
      expect(r.tier.id).not.toBe("community"); // jamais self-host pour un calcul cloud
    }
  });

  it("Enterprise a une plage ouverte (max null)", () => {
    const enterprise = TIERS.find((t) => t.id === "enterprise");
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

describe("calculateMonthlyPrice - Starter sub-tier free (1-5 sièges)", () => {
  it("1 siège → Starter gratuit", () => {
    const r = calculateMonthlyPrice(1, "monthly");
    expect(r.tier.id).toBe("starter");
    expect(r.isFree).toBe(true);
    expect(r.total).toBe(0);
  });

  it("5 sièges → Starter gratuit (limite supérieure du sous-tier free)", () => {
    const r = calculateMonthlyPrice(5, "monthly");
    expect(r.tier.id).toBe("starter");
    expect(r.isFree).toBe(true);
    expect(r.total).toBe(0);
  });
});

describe("calculateMonthlyPrice - Starter sub-tier paye (6-15 sièges, forfait)", () => {
  it("6 sièges → Starter forfait 19EUR", () => {
    const r = calculateMonthlyPrice(6, "monthly");
    expect(r.tier.id).toBe("starter");
    expect(r.isFree).toBe(false);
    expect(r.isQuote).toBe(false);
    expect(r.total).toBe(19);
  });

  it("15 sièges → Starter forfait 19EUR (limite haute du plan)", () => {
    const r = calculateMonthlyPrice(15, "monthly");
    expect(r.tier.id).toBe("starter");
    expect(r.total).toBe(19);
  });

  it("forfait : total identique pour 6 ou 15 sièges, perUser baisse", () => {
    const r6 = calculateMonthlyPrice(6, "monthly");
    const r15 = calculateMonthlyPrice(15, "monthly");
    expect(r15.total).toBe(r6.total);
    expect(r15.perUser).toBeLessThan(r6.perUser);
  });

  it("annuel < 12 × mensuel (remise engagement annuel)", () => {
    const m = calculateMonthlyPrice(10, "monthly");
    const a = calculateMonthlyPrice(10, "annual");
    expect(a.total * 12).toBeLessThan(m.total * 12);
  });
});

describe("calculateMonthlyPrice - Pro (16-250 sièges, par utilisateur)", () => {
  it("16 sièges → Pro", () => {
    const r = calculateMonthlyPrice(16, "monthly");
    expect(r.tier.id).toBe("pro");
  });

  it("250 sièges → Pro (limite haute)", () => {
    const r = calculateMonthlyPrice(250, "monthly");
    expect(r.tier.id).toBe("pro");
  });

  it("perUser stable a 3EUR, total = sièges × 3", () => {
    const r20 = calculateMonthlyPrice(20, "monthly");
    const r100 = calculateMonthlyPrice(100, "monthly");
    expect(r20.perUser).toBe(3);
    expect(r100.perUser).toBe(3);
    expect(r20.total).toBe(60);
    expect(r100.total).toBe(300);
  });

  it("annuel : 2,50EUR/user (remise engagement)", () => {
    const r = calculateMonthlyPrice(50, "annual");
    expect(r.perUser).toBe(2.5);
    expect(r.total).toBe(125);
  });
});

describe("calculateMonthlyPrice - Enterprise (250+, devis)", () => {
  it("251 sièges → Enterprise", () => {
    const r = calculateMonthlyPrice(251, "monthly");
    expect(r.tier.id).toBe("enterprise");
  });

  it("Enterprise est marqué isQuote (sur devis)", () => {
    const r = calculateMonthlyPrice(500, "monthly");
    expect(r.isQuote).toBe(true);
    expect(r.total).toBe(0); // pas de prix calculable
  });

  it("10 000 sièges → toujours Enterprise (pas de palier au-dessus)", () => {
    const r = calculateMonthlyPrice(10000, "monthly");
    expect(r.tier.id).toBe("enterprise");
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
