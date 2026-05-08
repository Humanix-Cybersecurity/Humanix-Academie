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

  it("retourne 5/10 a 50% pour un tenant Solo avec 5 users", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "solo" });
    dbMock.user.count.mockResolvedValue(5);

    const u = await getSeatUsage("t1");
    expect(u).toMatchObject({
      used: 5,
      max: 10,
      plan: "solo",
      percent: 50,
      canAdd: true,
      remaining: 5,
      approaching: false,
      atLimit: false,
    });
  });

  it("flag approaching=true a 80%+ (8/10)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "solo" });
    dbMock.user.count.mockResolvedValue(8);

    const u = await getSeatUsage("t1");
    expect(u.approaching).toBe(true);
    expect(u.atLimit).toBe(false);
    expect(u.canAdd).toBe(true);
  });

  it("flag atLimit=true et canAdd=false a 100% (10/10)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "solo" });
    dbMock.user.count.mockResolvedValue(10);

    const u = await getSeatUsage("t1");
    expect(u.atLimit).toBe(true);
    expect(u.canAdd).toBe(false);
    expect(u.remaining).toBe(0);
  });

  it("Premium = illimite : remaining=Infinity, percent=0, atLimit=false meme a 1000 users", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "premium" });
    dbMock.user.count.mockResolvedValue(1000);

    const u = await getSeatUsage("t1");
    expect(u.canAdd).toBe(true);
    expect(u.atLimit).toBe(false);
    expect(u.remaining).toBe(Infinity);
    expect(u.percent).toBe(0);
  });

  it("tenant introuvable -> fallback plan trial (5 sieges)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue(null);
    dbMock.user.count.mockResolvedValue(0);

    const u = await getSeatUsage("nope");
    expect(u.plan).toBe("trial");
    expect(u.max).toBe(5);
  });
});

describe("enforceSeatQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ne lance rien quand on peut ajouter", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "solo" });
    dbMock.user.count.mockResolvedValue(5);
    await expect(enforceSeatQuota("t1")).resolves.toBeUndefined();
  });

  it("lance SeatQuotaError quand on est deja au max", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "solo" });
    dbMock.user.count.mockResolvedValue(10);

    await expect(enforceSeatQuota("t1")).rejects.toThrow(SeatQuotaError);
    await expect(enforceSeatQuota("t1")).rejects.toMatchObject({
      used: 10,
      max: 10,
      plan: "solo",
    });
  });

  it("supporte un count > 1 (import CSV)", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "solo" });
    dbMock.user.count.mockResolvedValue(7);

    // 7 + 3 = 10 -> OK
    await expect(enforceSeatQuota("t1", 3)).resolves.toBeUndefined();
    // 7 + 4 = 11 -> KO
    await expect(enforceSeatQuota("t1", 4)).rejects.toThrow(SeatQuotaError);
  });

  it("Premium = illimite : count enorme passe", async () => {
    dbMock.tenant.findUnique.mockResolvedValue({ plan: "premium" });
    dbMock.user.count.mockResolvedValue(500);
    await expect(enforceSeatQuota("t1", 10000)).resolves.toBeUndefined();
  });
});

describe("formatSeatUsage", () => {
  it("format ratio + percent classique", () => {
    expect(
      formatSeatUsage({
        used: 5,
        max: 10,
        plan: "solo",
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
        plan: "premium",
        percent: 0,
        canAdd: true,
        remaining: Infinity,
        approaching: false,
        atLimit: false,
      }),
    ).toBe("1000 sieges utilises (illimite)");
  });
});
