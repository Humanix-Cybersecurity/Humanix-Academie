// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests purs de computeGlobalKpis. La fonction computeTenantHealth depend
// de Prisma, on la couvre via les tests d'integration (futurs) plutot que
// de mocker chaque appel ici.
import { describe, it, expect } from "vitest";
import { computeGlobalKpis, type TenantHealth } from "./tenant-health";

function fakeHealth(overrides: Partial<TenantHealth>): TenantHealth {
  return {
    tenantId: "t1",
    tenantName: "Tenant",
    tenantSlug: "tenant",
    plan: "decouverte",
    createdAt: new Date(),
    totalUsers: 0,
    activeUsers: 0,
    adminCount: 0,
    groupCount: 0,
    adminActif: false,
    adminVerified: false,
    admin2FA: false,
    hasGroups: false,
    hasUsers: false,
    hasProgress: false,
    lastActivityAt: null,
    lastActivityDays: null,
    planMismatches: [],
    signal: "ok",
    issues: [],
    ...overrides,
  };
}

describe("computeGlobalKpis", () => {
  it("compte 0 partout sur liste vide", () => {
    const k = computeGlobalKpis([]);
    expect(k.totalTenants).toBe(0);
    expect(k.totalUsers).toBe(0);
    expect(k.bySignal).toEqual({ ok: 0, warn: 0, error: 0 });
  });

  it("aggrege les compteurs par plan, signal, et users", () => {
    const k = computeGlobalKpis([
      fakeHealth({ plan: "decouverte", signal: "ok", totalUsers: 5, activeUsers: 4 }),
      fakeHealth({ plan: "pro", signal: "warn", totalUsers: 25, activeUsers: 20 }),
      fakeHealth({ plan: "pro", signal: "error", totalUsers: 12, activeUsers: 0 }),
    ]);
    expect(k.totalTenants).toBe(3);
    expect(k.totalUsers).toBe(42);
    expect(k.totalActiveUsers).toBe(24);
    expect(k.byPlan.decouverte).toBe(1);
    expect(k.byPlan.pro).toBe(2);
    expect(k.bySignal).toEqual({ ok: 1, warn: 1, error: 1 });
  });

  it("compte les nouveaux tenants 7j et 30j", () => {
    const now = Date.now();
    const k = computeGlobalKpis([
      fakeHealth({ createdAt: new Date(now - 1 * 24 * 3600 * 1000) }),  // 1j
      fakeHealth({ createdAt: new Date(now - 6 * 24 * 3600 * 1000) }),  // 6j
      fakeHealth({ createdAt: new Date(now - 8 * 24 * 3600 * 1000) }),  // 8j
      fakeHealth({ createdAt: new Date(now - 35 * 24 * 3600 * 1000) }), // 35j
    ]);
    expect(k.newTenantsLast7d).toBe(2);
    expect(k.newTenantsLast30d).toBe(3);
  });
});
