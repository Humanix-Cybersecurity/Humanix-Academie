// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests sur les helpers purs (pas le client Stripe lui-meme).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isStripeConfigured,
  priceIdForPlan,
  planFromPriceId,
  isPlanBuyable,
  STRIPE_BUYABLE_PLANS,
} from "./stripe";

describe("Stripe helpers", () => {
  // Snapshot de l'env pour restaurer apres chaque test
  let envSnapshot: NodeJS.ProcessEnv;
  beforeEach(() => {
    envSnapshot = { ...process.env };
  });
  afterEach(() => {
    process.env = envSnapshot;
  });

  describe("isStripeConfigured", () => {
    it("false si STRIPE_SECRET_KEY absent", () => {
      delete process.env.STRIPE_SECRET_KEY;
      expect(isStripeConfigured()).toBe(false);
    });
    it("true si STRIPE_SECRET_KEY pose", () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
      expect(isStripeConfigured()).toBe(true);
    });
  });

  describe("priceIdForPlan", () => {
    it("retourne null pour les plans gratuits", () => {
      expect(priceIdForPlan("trial")).toBeNull();
      expect(priceIdForPlan("decouverte")).toBeNull();
    });
    it("retourne null si la variable d'env n'est pas posee", () => {
      delete process.env.STRIPE_PRICE_SOLO;
      expect(priceIdForPlan("solo")).toBeNull();
    });
    it("retourne le price ID quand l'env est pose", () => {
      process.env.STRIPE_PRICE_PRO = "price_abc123";
      expect(priceIdForPlan("pro")).toBe("price_abc123");
    });
    it("retourne null pour env vide", () => {
      process.env.STRIPE_PRICE_PRO = "";
      expect(priceIdForPlan("pro")).toBeNull();
    });
  });

  describe("planFromPriceId", () => {
    it("retrouve le plan a partir du price ID", () => {
      process.env.STRIPE_PRICE_ESSENTIELLE = "price_essent";
      process.env.STRIPE_PRICE_PRO = "price_pro_xxx";
      expect(planFromPriceId("price_essent")).toBe("essentielle");
      expect(planFromPriceId("price_pro_xxx")).toBe("pro");
    });
    it("retourne null pour price ID inconnu", () => {
      expect(planFromPriceId("price_unknown")).toBeNull();
    });
  });

  describe("isPlanBuyable", () => {
    beforeEach(() => {
      process.env.STRIPE_PRICE_SOLO = "price_solo";
      process.env.STRIPE_PRICE_ESSENTIELLE = "price_ess";
      process.env.STRIPE_PRICE_PRO = "price_pro";
    });
    it("plans buyables avec env configure", () => {
      expect(isPlanBuyable("solo")).toBe(true);
      expect(isPlanBuyable("essentielle")).toBe(true);
      expect(isPlanBuyable("pro")).toBe(true);
    });
    it("decouverte / trial pas buyables", () => {
      expect(isPlanBuyable("decouverte")).toBe(false);
      expect(isPlanBuyable("trial")).toBe(false);
    });
    it("premium pas buyable par defaut (sur devis)", () => {
      delete process.env.STRIPE_PRICE_PREMIUM;
      expect(isPlanBuyable("premium")).toBe(false);
    });
    it("plan listed mais env absent => non buyable", () => {
      delete process.env.STRIPE_PRICE_SOLO;
      expect(isPlanBuyable("solo")).toBe(false);
    });
  });

  describe("STRIPE_BUYABLE_PLANS", () => {
    it("inclut solo, essentielle, pro", () => {
      expect(STRIPE_BUYABLE_PLANS).toEqual(
        expect.arrayContaining(["solo", "essentielle", "pro"]),
      );
      expect(STRIPE_BUYABLE_PLANS).not.toContain("decouverte");
      expect(STRIPE_BUYABLE_PLANS).not.toContain("trial");
    });
  });
});
