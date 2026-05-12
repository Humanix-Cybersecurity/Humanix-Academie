// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la machine d'etat subscription. CRITIQUE BUSINESS :
//   - Si on bloque un tenant qui paie, on perd un client.
//   - Si on laisse passer un tenant qui ne paie plus depuis 2 mois,
//     on offre du service gratuit.
// Chaque transition d'etat doit etre couverte.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { tenant: { findUnique: vi.fn() } },
}));

import {
  getSubscriptionState,
  canMutate,
  shouldShowWarning,
  GRACE_PERIOD_DAYS,
  READ_ONLY_PERIOD_DAYS,
} from "./subscription-state";
import { db } from "@/lib/db";

const dbMock = db as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
};

const NOW = new Date("2026-06-15T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) =>
  new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe("getSubscriptionState - tenant introuvable", () => {
  it("retourne state=none + restriction=blocked", async () => {
    dbMock.tenant.findUnique.mockResolvedValue(null);
    const s = await getSubscriptionState("nope", NOW);
    expect(s.state).toBe("none");
    expect(s.restriction).toBe("blocked");
  });
});

// Le pivot mai 2026 (vente directe sans essai gratuit) a supprime les etats
// `trialing` et `trial_expired`. Les tenants legacy qui auraient encore
// subscriptionStatus='trialing' en BDD doivent etre lus DEFENSIVEMENT comme
// 'active' (le code de subscription-state le fait pour eviter qu'un legacy
// se retrouve coince en suspended a cause d'un status obsolete).
describe("getSubscriptionState - legacy trial defensive read", () => {
  beforeEach(() => vi.clearAllMocks());

  it("trialing en BDD -> traite comme active (lecture defensive)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "starter",
      subscriptionStatus: "trialing",
      currentPeriodEnd: daysFromNow(20),
      trialEndsAt: daysFromNow(20),
    });
    const s = await getSubscriptionState("t1", NOW);
    expect(s.state).toBe("active");
    expect(s.restriction).toBe("none");
  });

  it("trialing avec trialEndsAt passe -> reste active (pivot vente directe)", async () => {
    // Avant pivot : ce cas aurait declenche read_only. Apres pivot : le
    // status legacy n'est plus interprete comme expiration ; seul un
    // subscriptionStatus='past_due' / 'canceled' provoque restriction.
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "starter",
      subscriptionStatus: "trialing",
      currentPeriodEnd: daysFromNow(15),
      trialEndsAt: daysAgo(5),
    });
    const s = await getSubscriptionState("t1", NOW);
    expect(s.state).toBe("active");
    expect(s.restriction).toBe("none");
  });
});

// Sanity: la constante existe toujours, on l'utilise pour past_due > 7j.
// (importee plus haut, on s'assure juste qu'elle n'a pas ete renommee)
describe("READ_ONLY_PERIOD_DAYS constante", () => {
  it("vaut 30 jours par defaut (cf. doc subscription-state.ts)", () => {
    expect(READ_ONLY_PERIOD_DAYS).toBe(30);
  });
});

describe("getSubscriptionState - subscription active", () => {
  beforeEach(() => vi.clearAllMocks());

  it("status=active : tout fonctionne", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      currentPeriodEnd: daysFromNow(15),
      trialEndsAt: null,
    });
    const s = await getSubscriptionState("t1", NOW);
    expect(s.state).toBe("active");
    expect(s.restriction).toBe("none");
    expect(s.daysLeft).toBe(15);
    expect(canMutate(s)).toBe(true);
    expect(shouldShowWarning(s)).toBe(false);
  });
});

describe("getSubscriptionState - past_due / grace period", () => {
  beforeEach(() => vi.clearAllMocks());

  it("past_due depuis 3 jours -> grace_period, restriction=warn", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "past_due",
      currentPeriodEnd: daysAgo(3),
      trialEndsAt: null,
    });
    const s = await getSubscriptionState("t1", NOW);
    expect(s.state).toBe("grace_period");
    expect(s.restriction).toBe("warn");
    expect(s.daysLeft).toBe(GRACE_PERIOD_DAYS - 3);
    expect(s.cta).toBe("renew");
    expect(canMutate(s)).toBe(true); // warn permet encore l'ecriture
  });

  it("past_due depuis 10 jours (apres grace 7j) -> read_only", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "past_due",
      currentPeriodEnd: daysAgo(10),
      trialEndsAt: null,
    });
    const s = await getSubscriptionState("t1", NOW);
    expect(s.state).toBe("read_only");
    expect(s.restriction).toBe("read_only");
    expect(canMutate(s)).toBe(false);
  });

  it("past_due depuis 50 jours (>7+30) -> suspended", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "past_due",
      currentPeriodEnd: daysAgo(50),
      trialEndsAt: null,
    });
    const s = await getSubscriptionState("t1", NOW);
    expect(s.state).toBe("suspended");
    expect(s.restriction).toBe("blocked");
  });
});

describe("getSubscriptionState - canceled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("status=canceled -> suspended immediat", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "canceled",
      currentPeriodEnd: daysFromNow(5),
      trialEndsAt: null,
    });
    const s = await getSubscriptionState("t1", NOW);
    expect(s.state).toBe("suspended");
    expect(s.restriction).toBe("blocked");
    expect(s.cta).toBe("renew");
  });
});

describe("getSubscriptionState - decouverte forever-free", () => {
  beforeEach(() => vi.clearAllMocks());

  it("plan=decouverte sans subscription -> active (forever-free)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "starter",
      subscriptionStatus: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
    });
    const s = await getSubscriptionState("t1", NOW);
    expect(s.state).toBe("active");
    expect(s.restriction).toBe("none");
    expect(s.cta).toBe(null);
  });
});

describe("helpers canMutate / shouldShowWarning", () => {
  it("canMutate true seulement pour none ou warn", () => {
    expect(canMutate({ restriction: "none" } as never)).toBe(true);
    expect(canMutate({ restriction: "warn" } as never)).toBe(true);
    expect(canMutate({ restriction: "read_only" } as never)).toBe(false);
    expect(canMutate({ restriction: "blocked" } as never)).toBe(false);
  });

  it("shouldShowWarning false seulement pour none", () => {
    expect(shouldShowWarning({ restriction: "none" } as never)).toBe(false);
    expect(shouldShowWarning({ restriction: "warn" } as never)).toBe(true);
    expect(shouldShowWarning({ restriction: "read_only" } as never)).toBe(true);
    expect(shouldShowWarning({ restriction: "blocked" } as never)).toBe(true);
  });
});
