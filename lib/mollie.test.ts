// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests unitaires lib/mollie.ts - couvre uniquement les helpers purs
// (pricing, plan validation, status mapping) qui ne font pas d'appel
// reseau au SDK Mollie. Les flows checkout/webhook sont testes via les
// tests d'integration (TODO post-launch).

import { describe, expect, it } from "vitest";
import {
  MOLLIE_BUYABLE_PLANS,
  isPlanBuyable,
  mollieAmountForPlan,
  mollieStatusToSubscription,
  molliePaymentIsPaid,
  molliePaymentIsFailed,
  validateMollieSetup,
  prochaineEcheance,
} from "./mollie";

describe("MOLLIE_BUYABLE_PLANS", () => {
  it("contient starter et pro mais pas enterprise", () => {
    expect(MOLLIE_BUYABLE_PLANS).toContain("starter");
    expect(MOLLIE_BUYABLE_PLANS).toContain("pro");
    expect(MOLLIE_BUYABLE_PLANS).not.toContain("enterprise");
  });
});

describe("isPlanBuyable", () => {
  it("accepte starter et pro", () => {
    expect(isPlanBuyable("starter")).toBe(true);
    expect(isPlanBuyable("pro")).toBe(true);
  });
  it("refuse enterprise (sur devis manuel)", () => {
    expect(isPlanBuyable("enterprise")).toBe(false);
  });
});

describe("mollieAmountForPlan", () => {
  describe("plan starter (forfait 19 EUR/mois)", () => {
    it("monthly = 19.00 EUR / 1 mois", () => {
      const r = mollieAmountForPlan("starter", "monthly", 1);
      expect(r.amount.value).toBe("19.00");
      expect(r.amount.currency).toBe("EUR");
      expect(r.interval).toBe("1 month");
    });
    it("annual = 228.00 EUR / 12 mois (pas de remise sur starter)", () => {
      const r = mollieAmountForPlan("starter", "annual", 1);
      expect(r.amount.value).toBe("228.00");
      expect(r.interval).toBe("12 months");
    });
    it("description compatible Mollie (<= 22 chars)", () => {
      const r = mollieAmountForPlan("starter", "monthly", 1);
      expect(r.description.length).toBeLessThanOrEqual(22);
    });
  });

  describe("plan pro (3 EUR/siege/mois, -10% annuel)", () => {
    it("monthly 25 sieges = 75.00 EUR", () => {
      const r = mollieAmountForPlan("pro", "monthly", 25);
      expect(r.amount.value).toBe("75.00");
    });
    it("annual 25 sieges = 75 * 12 * 0.9 = 810.00 EUR", () => {
      const r = mollieAmountForPlan("pro", "annual", 25);
      expect(r.amount.value).toBe("810.00");
    });
    it("monthly 100 sieges = 300.00 EUR", () => {
      const r = mollieAmountForPlan("pro", "monthly", 100);
      expect(r.amount.value).toBe("300.00");
    });
  });

  describe("plan enterprise (sur devis, pas via Mollie)", () => {
    it("throw : enterprise n'est pas achetable", () => {
      expect(() => mollieAmountForPlan("enterprise", "monthly", 50)).toThrow(
        /enterprise/i,
      );
    });
  });
});

describe("mollieStatusToSubscription", () => {
  it("active -> active", () => {
    expect(mollieStatusToSubscription("active")).toBe("active");
  });
  it("pending -> trialing", () => {
    expect(mollieStatusToSubscription("pending")).toBe("trialing");
  });
  it("suspended -> past_due", () => {
    expect(mollieStatusToSubscription("suspended")).toBe("past_due");
  });
  it("canceled / completed -> canceled", () => {
    expect(mollieStatusToSubscription("canceled")).toBe("canceled");
    expect(mollieStatusToSubscription("completed")).toBe("canceled");
  });
  it("status inconnu -> active (fallback safe)", () => {
    expect(mollieStatusToSubscription("zorglub")).toBe("active");
  });
});

describe("molliePaymentIs*", () => {
  it("paid", () => {
    expect(molliePaymentIsPaid("paid")).toBe(true);
    expect(molliePaymentIsPaid("open")).toBe(false);
  });
  it("failed / canceled / expired", () => {
    expect(molliePaymentIsFailed("failed")).toBe(true);
    expect(molliePaymentIsFailed("canceled")).toBe(true);
    expect(molliePaymentIsFailed("expired")).toBe(true);
    expect(molliePaymentIsFailed("paid")).toBe(false);
  });
});

describe("validateMollieSetup", () => {
  it("warning si key test_*", () => {
    const prev = process.env.MOLLIE_API_KEY;
    process.env.MOLLIE_API_KEY = "test_xxxxxxxxxxxxxxxx";
    const r = validateMollieSetup();
    expect(r.enabled).toBe(true);
    expect(r.liveMode).toBe(false);
    expect(r.warnings.some((w) => w.includes("test"))).toBe(true);
    if (prev === undefined) delete process.env.MOLLIE_API_KEY;
    else process.env.MOLLIE_API_KEY = prev;
  });

  it("liveMode si key live_*", () => {
    const prev = process.env.MOLLIE_API_KEY;
    process.env.MOLLIE_API_KEY = "live_xxxxxxxxxxxxxxxx";
    const r = validateMollieSetup();
    expect(r.enabled).toBe(true);
    expect(r.liveMode).toBe(true);
    if (prev === undefined) delete process.env.MOLLIE_API_KEY;
    else process.env.MOLLIE_API_KEY = prev;
  });

  it("disabled si key absente", () => {
    const prev = process.env.MOLLIE_API_KEY;
    delete process.env.MOLLIE_API_KEY;
    const r = validateMollieSetup();
    expect(r.enabled).toBe(false);
    if (prev !== undefined) process.env.MOLLIE_API_KEY = prev;
  });
});

// ---------------------------------------------------------------------------
// prochaineEcheance - la date qui evite le double prelevement.
//
// Ces tests gardent de l'incident du 2026-08-17 : le premier client a paye
// 96 EUR pour un abonnement a 48 EUR/mois, parce que la Subscription creee
// apres le paiement `first` demarrait immediatement.
// ---------------------------------------------------------------------------
describe("prochaineEcheance", () => {
  it("mensuel : un mois apres le paiement initial", () => {
    const d = prochaineEcheance("1 month", new Date("2026-08-17T23:32:51Z"));
    expect(d.toISOString().slice(0, 10)).toBe("2026-09-17");
  });

  it("annuel : douze mois apres", () => {
    const d = prochaineEcheance("12 months", new Date("2026-08-17T23:32:51Z"));
    expect(d.toISOString().slice(0, 10)).toBe("2027-08-17");
  });

  it("ramene au dernier jour du mois quand le quantieme n'existe pas", () => {
    // Sans garde, `setUTCMonth` deborderait sur le 3 mars : le client serait
    // preleve APRES la fin de la periode qu'il a payee.
    const d = prochaineEcheance("1 month", new Date("2026-01-31T10:00:00Z"));
    expect(d.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("est TOUJOURS posterieure au paiement initial", () => {
    // La propriete qui compte : quelle que soit la date, on ne prelevera
    // jamais le jour meme.
    for (const jour of [
      "2026-01-31",
      "2026-02-28",
      "2026-03-15",
      "2026-12-31",
    ]) {
      const initial = new Date(`${jour}T12:00:00Z`);
      expect(prochaineEcheance("1 month", initial).getTime()).toBeGreaterThan(
        initial.getTime(),
      );
    }
  });
});
