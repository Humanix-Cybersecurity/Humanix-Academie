// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests de la detection d'exfiltration (pentest fix #8).
//
// On verifie :
//   - Export normal : pas d'alerte
//   - Plusieurs exports cumules sous seuil : pas d'alerte
//   - Cumul rows > ROW_THRESHOLD : alerte (reason: row_threshold)
//   - 20+ exports distincts : alerte (reason: export_count_threshold)
//   - Debounce : 2e alerte dans < 1 min ne se declenche pas
//   - Cleanup tracker : reset propre

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordExportAccess,
  resetExfiltrationTracker,
  getTrackerSnapshot,
  EXFILTRATION_THRESHOLDS,
} from "./exfiltration-detection";

// Mock auditLog pour ne pas hit la BDD pendant les tests
vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(async () => true),
  AuditActions: {
    EXFILTRATION_SUSPECTED: "EXFILTRATION_SUSPECTED",
  },
}));

const TEST_TENANT = "tenant_test";
const TEST_USER = "user_test";
const COMMON_PARAMS = {
  tenantId: TEST_TENANT,
  userId: TEST_USER,
  userEmail: "test@example.fr",
  userRole: "ADMIN",
  endpoint: "/api/admin/test/export",
};

describe("recordExportAccess", () => {
  beforeEach(() => {
    // Reset tracker between tests
    resetExfiltrationTracker(TEST_TENANT, TEST_USER);
  });

  it("autorise un export normal sans alerte", async () => {
    const result = await recordExportAccess({
      ...COMMON_PARAMS,
      rowCount: 100,
    });
    expect(result.allowed).toBe(true);
    expect(result.alerted).toBe(false);
    expect(result.totalRowsInWindow).toBe(100);
    expect(result.totalExportsInWindow).toBe(1);
  });

  it("plusieurs petits exports sous seuil : pas d'alerte", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await recordExportAccess({
        ...COMMON_PARAMS,
        rowCount: 500,
      });
      expect(result.alerted).toBe(false);
    }
    // Cumul 5 × 500 = 2500 rows < 5000 ROW_THRESHOLD
  });

  it("declenche l'alerte ROW_THRESHOLD a 5000+ rows cumulees", async () => {
    // Export 1 : 2000 rows
    const r1 = await recordExportAccess({
      ...COMMON_PARAMS,
      rowCount: 2000,
    });
    expect(r1.alerted).toBe(false);

    // Export 2 : 2000 rows (cumul 4000)
    const r2 = await recordExportAccess({
      ...COMMON_PARAMS,
      rowCount: 2000,
    });
    expect(r2.alerted).toBe(false);

    // Export 3 : 2000 rows (cumul 6000 > 5000)
    const r3 = await recordExportAccess({
      ...COMMON_PARAMS,
      rowCount: 2000,
    });
    expect(r3.alerted).toBe(true);
    expect(r3.reason).toBe("row_threshold");
    expect(r3.totalRowsInWindow).toBe(6000);
  });

  it("declenche l'alerte EXPORT_COUNT_THRESHOLD a 20+ exports", async () => {
    // 19 exports de 10 rows chacun (cumul rows = 190, sous seuil)
    for (let i = 0; i < 19; i++) {
      const r = await recordExportAccess({
        ...COMMON_PARAMS,
        rowCount: 10,
      });
      expect(r.alerted).toBe(false);
    }
    // 20e export : declenche
    const r20 = await recordExportAccess({
      ...COMMON_PARAMS,
      rowCount: 10,
    });
    expect(r20.alerted).toBe(true);
    expect(r20.reason).toBe("export_count_threshold");
    expect(r20.totalExportsInWindow).toBe(20);
  });

  it("debounce : 2e alerte ne se declenche pas dans la fenetre 1 min", async () => {
    // 1er depassement
    await recordExportAccess({ ...COMMON_PARAMS, rowCount: 3000 });
    const r1 = await recordExportAccess({ ...COMMON_PARAMS, rowCount: 3000 });
    expect(r1.alerted).toBe(true);

    // Tentative immediate -> debounce empeche
    const r2 = await recordExportAccess({ ...COMMON_PARAMS, rowCount: 1000 });
    expect(r2.alerted).toBe(false);
    // Mais totalRowsInWindow continue d'augmenter
    expect(r2.totalRowsInWindow).toBe(7000);
  });

  it("scope par (tenantId, userId) : pas de leak entre users", async () => {
    // User A depasse le seuil
    for (let i = 0; i < 3; i++) {
      await recordExportAccess({ ...COMMON_PARAMS, rowCount: 2000 });
    }
    // 3 × 2000 = 6000 > 5000 (mais sur user_test)

    // User B sur le meme tenant -> compteur independant
    const userB = await recordExportAccess({
      ...COMMON_PARAMS,
      userId: "user_other",
      userEmail: "other@example.fr",
      rowCount: 100,
    });
    expect(userB.alerted).toBe(false);
    expect(userB.totalRowsInWindow).toBe(100);

    // Cleanup
    resetExfiltrationTracker(TEST_TENANT, "user_other");
  });

  it("getTrackerSnapshot retourne l'etat courant", async () => {
    await recordExportAccess({ ...COMMON_PARAMS, rowCount: 500 });
    const snap = getTrackerSnapshot();
    const entry = snap.find((s) => s.key === `${TEST_TENANT}:${TEST_USER}`);
    expect(entry).toBeDefined();
    expect(entry?.eventsCount).toBe(1);
    expect(entry?.totalRows).toBe(500);
  });

  it("EXFILTRATION_THRESHOLDS expose les constantes", () => {
    expect(EXFILTRATION_THRESHOLDS.WINDOW_MS).toBe(5 * 60 * 1000);
    expect(EXFILTRATION_THRESHOLDS.ROW_THRESHOLD).toBe(5000);
    expect(EXFILTRATION_THRESHOLDS.EXPORT_COUNT_THRESHOLD).toBe(20);
    expect(EXFILTRATION_THRESHOLDS.ALERT_DEBOUNCE_MS).toBe(60 * 1000);
  });
});
