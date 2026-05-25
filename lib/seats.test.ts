// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des quotas de sieges. Critique pour le SaaS : un bug ici = client
// qui paie pour 50 sieges et en utilise 100, OU client qui ne peut pas
// inviter le 11e employe alors qu'il a paye le plan Solo (10 sieges).

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma db avant l'import de seats.ts
vi.mock("@/lib/db", () => ({
  db: {
    tenant: { findUnique: vi.fn() },
    user: { count: vi.fn() },
  },
}));

import {
  enforceSeatQuota,
  getSeatUsage,
  formatSeatUsage,
  SeatQuotaError,
} from "./seats";
import { db } from "@/lib/db";

const dbMock = db as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  user: { count: ReturnType<typeof vi.fn> };
};

describe("getSeatUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne 5/15 a 33% pour un tenant Starter avec 5 users", async () => {
    // Starter (pivot 4-tiers mai 2026) : 15 sieges max (free <=5, paye 6-15).
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "starter" });
    dbMock.user.count.mockResolvedValue(5);

    const u = await getSeatUsage("t1");
    expect(u).toMatchObject({
      used: 5,
      max: 15,
      plan: "starter",
      percent: 33,
      canAdd: true,
      remaining: 10,
      approaching: false,
      atLimit: false,
    });
  });

  it("flag approaching=true a 80%+ (12/15)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "starter" });
    dbMock.user.count.mockResolvedValue(12);

    const u = await getSeatUsage("t1");
    expect(u.approaching).toBe(true);
    expect(u.atLimit).toBe(false);
    expect(u.canAdd).toBe(true);
  });

  it("flag atLimit=true et canAdd=false a 100% (15/15)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "starter" });
    dbMock.user.count.mockResolvedValue(15);

    const u = await getSeatUsage("t1");
    expect(u.atLimit).toBe(true);
    expect(u.canAdd).toBe(false);
    expect(u.remaining).toBe(0);
  });

  it("Premium = illimite : remaining=Infinity, percent=0, atLimit=false meme a 1000 users", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "enterprise" });
    dbMock.user.count.mockResolvedValue(1000);

    const u = await getSeatUsage("t1");
    expect(u.canAdd).toBe(true);
    expect(u.atLimit).toBe(false);
    expect(u.remaining).toBe(Infinity);
    expect(u.percent).toBe(0);
  });

  it("tenant introuvable -> fallback plan starter (15 sieges)", async () => {
    // Pivot 4-tiers mai 2026 : "trial" supprime, le fallback `normalizePlan(null)`
    // tombe sur "starter". PLAN_SEATS.starter = 15 (cf. lib/plans.ts).
    dbMock.tenant.findUnique.mockResolvedValue(null);
    dbMock.user.count.mockResolvedValue(0);

    const u = await getSeatUsage("nope");
    expect(u.plan).toBe("starter");
    expect(u.max).toBe(15);
  });

  it("tenant Communaute (humanix-community) = illimite meme sur plan starter", async () => {
    // Tous les apprenants gratuits du cloud sont rattaches a ce tenant unique :
    // aucun plafond de sieges ne doit s'appliquer (cf. lib/tenant-community.ts).
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "starter",
      slug: "humanix-community",
    });
    dbMock.user.count.mockResolvedValue(5000);

    const u = await getSeatUsage("community");
    expect(u.max).toBe(Infinity);
    expect(u.canAdd).toBe(true);
    expect(u.atLimit).toBe(false);
    expect(u.remaining).toBe(Infinity);
    expect(u.percent).toBe(0);
  });
});

describe("enforceSeatQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ne lance rien quand on peut ajouter", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "starter" });
    dbMock.user.count.mockResolvedValue(5);
    await expect(enforceSeatQuota("t1")).resolves.toBeUndefined();
  });

  it("lance SeatQuotaError quand on est deja au max", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "starter" });
    dbMock.user.count.mockResolvedValue(15);

    await expect(enforceSeatQuota("t1")).rejects.toThrow(SeatQuotaError);
    await expect(enforceSeatQuota("t1")).rejects.toMatchObject({
      used: 15,
      max: 15,
      plan: "starter",
    });
  });

  it("supporte un count > 1 (import CSV)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "starter" });
    dbMock.user.count.mockResolvedValue(12);

    // 12 + 3 = 15 -> OK (juste au plafond)
    await expect(enforceSeatQuota("t1", 3)).resolves.toBeUndefined();
    // 12 + 4 = 16 -> KO (depasse)
    await expect(enforceSeatQuota("t1", 4)).rejects.toThrow(SeatQuotaError);
  });

  it("Premium = illimite : count enorme passe", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "enterprise" });
    dbMock.user.count.mockResolvedValue(500);
    await expect(enforceSeatQuota("t1", 10000)).resolves.toBeUndefined();
  });

  it("tenant Communaute = aucun plafond, on peut ajouter 10000 learners gratuits", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({
      plan: "starter",
      slug: "humanix-community",
    });
    dbMock.user.count.mockResolvedValue(5000);
    await expect(enforceSeatQuota("community", 10000)).resolves.toBeUndefined();
  });
});

describe("formatSeatUsage", () => {
  it("format ratio + percent classique", () => {
    expect(
      formatSeatUsage({
        used: 5,
        max: 10,
        plan: "starter",
        percent: 50,
        canAdd: true,
        remaining: 5,
        approaching: false,
        atLimit: false,
      }),
    ).toBe("5 / 10 sieges utilises (50%)");
  });

  it("format illimite pour Premium", () => {
    expect(
      formatSeatUsage({
        used: 1000,
        max: Infinity,
        plan: "enterprise",
        percent: 0,
        canAdd: true,
        remaining: Infinity,
        approaching: false,
        atLimit: false,
      }),
    ).toBe("1000 sieges utilises (illimite)");
  });
});
