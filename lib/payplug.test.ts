// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests sur les helpers purs (mapping plans, signature webhook).
// Aligne sur la grille mai 2026 (3 paliers : starter / pro / enterprise).
// Seuls starter et pro sont buyable self-service ; enterprise est sur devis.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  isPayplugConfigured,
  payplugPlanIdForTier,
  tierFromPayplugPlanId,
  isPlanBuyable,
  PAYPLUG_BUYABLE_PLANS,
  verifyWebhookSignature,
  validatePayplugSetup,
} from "./payplug";

describe("Payplug helpers", () => {
  let envSnapshot: NodeJS.ProcessEnv;
  beforeEach(() => {
    envSnapshot = { ...process.env };
  });
  afterEach(() => {
    process.env = envSnapshot;
  });

  describe("isPayplugConfigured", () => {
    it("false sans cle", () => {
      delete process.env.PAYPLUG_SECRET_KEY;
      expect(isPayplugConfigured()).toBe(false);
    });
    it("true avec cle", () => {
      process.env.PAYPLUG_SECRET_KEY = "sk_test_xxx";
      expect(isPayplugConfigured()).toBe(true);
    });
  });

  describe("payplugPlanIdForTier", () => {
    it("null pour enterprise (sur devis, pas de plan Payplug)", () => {
      expect(payplugPlanIdForTier("enterprise")).toBeNull();
    });
    it("null si env absente", () => {
      delete process.env.PAYPLUG_PLAN_STARTER;
      expect(payplugPlanIdForTier("starter")).toBeNull();
    });
    it("retourne le plan ID Payplug quand configure", () => {
      process.env.PAYPLUG_PLAN_PRO = "pln_payplug_pro";
      expect(payplugPlanIdForTier("pro")).toBe("pln_payplug_pro");
    });
  });

  describe("tierFromPayplugPlanId", () => {
    it("retrouve le tier depuis l'ID Payplug", () => {
      process.env.PAYPLUG_PLAN_STARTER = "pln_starter";
      expect(tierFromPayplugPlanId("pln_starter")).toBe("starter");
    });
    it("null pour ID inconnu", () => {
      expect(tierFromPayplugPlanId("pln_unknown")).toBeNull();
    });
  });

  describe("isPlanBuyable", () => {
    beforeEach(() => {
      process.env.PAYPLUG_PLAN_STARTER = "pln_starter";
      process.env.PAYPLUG_PLAN_PRO = "pln_pro";
    });
    it("vrai pour starter et pro (configures)", () => {
      expect(isPlanBuyable("starter")).toBe(true);
      expect(isPlanBuyable("pro")).toBe(true);
    });
    it("faux pour enterprise (pas de plan Payplug, sur devis)", () => {
      expect(isPlanBuyable("enterprise")).toBe(false);
    });
  });

  describe("PAYPLUG_BUYABLE_PLANS", () => {
    it("inclut starter et pro, exclut enterprise", () => {
      expect(PAYPLUG_BUYABLE_PLANS).toEqual(
        expect.arrayContaining(["starter", "pro"]),
      );
      expect(PAYPLUG_BUYABLE_PLANS).not.toContain("enterprise");
    });
  });

  describe("verifyWebhookSignature", () => {
    const SECRET = "whsec_test_super_secret";
    const BODY = JSON.stringify({ type: "subscription.updated", id: "evt_xxx" });

    beforeEach(() => {
      process.env.PAYPLUG_WEBHOOK_SECRET = SECRET;
    });

    it("accepte une signature HMAC-SHA256 valide", () => {
      const sig = createHmac("sha256", SECRET).update(BODY).digest("hex");
      expect(verifyWebhookSignature(BODY, sig)).toBe(true);
    });

    it("refuse une signature falsifiee", () => {
      expect(verifyWebhookSignature(BODY, "0".repeat(64))).toBe(false);
    });

    it("refuse une signature absente", () => {
      expect(verifyWebhookSignature(BODY, null)).toBe(false);
    });

    it("refuse si le secret n'est pas configure", () => {
      delete process.env.PAYPLUG_WEBHOOK_SECRET;
      const sig = createHmac("sha256", SECRET).update(BODY).digest("hex");
      expect(verifyWebhookSignature(BODY, sig)).toBe(false);
    });

    it("refuse si le body a ete modifie", () => {
      const sig = createHmac("sha256", SECRET).update(BODY).digest("hex");
      const tampered = BODY.replace("subscription.updated", "subscription.created");
      expect(verifyWebhookSignature(tampered, sig)).toBe(false);
    });
  });

  describe("validatePayplugSetup", () => {
    it("enabled=false si pas de cle (pas d'avertissements)", () => {
      delete process.env.PAYPLUG_SECRET_KEY;
      delete process.env.PAYPLUG_WEBHOOK_SECRET;
      const r = validatePayplugSetup();
      expect(r.enabled).toBe(false);
      expect(r.warnings).toHaveLength(0);
    });

    it("enabled=true, plansConfigured liste les tiers bindes", () => {
      process.env.PAYPLUG_SECRET_KEY = "sk_test_xxx";
      process.env.PAYPLUG_PLAN_STARTER = "plan_starter_xxx";
      process.env.PAYPLUG_PLAN_PRO = "plan_pro_xxx";
      process.env.PAYPLUG_WEBHOOK_SECRET = "whsec_xxx";
      const r = validatePayplugSetup();
      expect(r.enabled).toBe(true);
      expect(r.plansConfigured.sort()).toEqual(["pro", "starter"]);
      expect(r.plansMissing).toHaveLength(0);
      expect(r.webhookSecretSet).toBe(true);
    });

    it("warning si plan manquant", () => {
      process.env.PAYPLUG_SECRET_KEY = "sk_test_xxx";
      process.env.PAYPLUG_PLAN_STARTER = "plan_starter_xxx";
      delete process.env.PAYPLUG_PLAN_PRO;
      process.env.PAYPLUG_WEBHOOK_SECRET = "whsec_xxx";
      const r = validatePayplugSetup();
      expect(r.plansMissing).toEqual(["pro"]);
      expect(r.warnings.some((w) => w.includes("non defini"))).toBe(true);
    });

    it("warning critique si webhook secret absent quand Payplug actif", () => {
      process.env.PAYPLUG_SECRET_KEY = "sk_test_xxx";
      delete process.env.PAYPLUG_WEBHOOK_SECRET;
      const r = validatePayplugSetup();
      expect(r.webhookSecretSet).toBe(false);
      expect(r.warnings.some((w) => w.includes("webhook"))).toBe(true);
    });

    it("toujours un warning sur les endpoints non documentes quand Payplug actif", () => {
      process.env.PAYPLUG_SECRET_KEY = "sk_test_xxx";
      process.env.PAYPLUG_PLAN_STARTER = "plan_starter_xxx";
      process.env.PAYPLUG_PLAN_PRO = "plan_pro_xxx";
      process.env.PAYPLUG_WEBHOOK_SECRET = "whsec_xxx";
      const r = validatePayplugSetup();
      // Setup nominal mais on rappelle quand meme la dette d'integration
      expect(r.warnings.some((w) => w.includes("non documentes"))).toBe(true);
    });
  });
});
