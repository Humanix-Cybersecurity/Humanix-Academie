// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests pour lib/audit.ts - audit log centralise (RGPD/NIS2/ISO 27001).
//
// auditLog() est best-effort par contrat (jamais throw). On verifie ici :
//   - Le happy-path : ecriture en BDD avec valeurs par defaut sensees
//   - La resilience : un crash db ne propage pas, retourne false
//   - Snapshot d'identite : actorEmail/actorRole sont bien persistes
//   - Severite par defaut : actions sensibles -> WARNING/CRITICAL
//   - readIpFromHeaders : pure logic, extraction multi-headers
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuditAction, AuditOutcome, AuditSeverity } from "@prisma/client";

const { mockDb, mockHashIp } = vi.hoisted(() => ({
  mockDb: {
    auditLog: {
      create: vi.fn(),
    },
  },
  mockHashIp: vi.fn((ip: string) => `hashed:${ip}`),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/password-reset", () => ({ hashIp: mockHashIp }));

import { auditLog, readIpFromHeaders, AuditActions } from "./audit";

beforeEach(() => {
  mockDb.auditLog.create.mockReset();
  mockHashIp.mockClear();
});

describe("auditLog - happy path", () => {
  it("ecrit un log avec les defauts (SUCCESS / INFO si action neutre)", async () => {
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const ok = await auditLog({
      action: AuditAction.USER_LOGIN_SUCCESS,
      tenantId: "t1",
      actor: { userId: "u1", email: "u@x.fr", role: "ADMIN" },
    });

    expect(ok).toBe(true);
    expect(mockDb.auditLog.create).toHaveBeenCalledTimes(1);
    const arg = mockDb.auditLog.create.mock.calls[0][0];
    expect(arg.data.action).toBe(AuditAction.USER_LOGIN_SUCCESS);
    expect(arg.data.outcome).toBe(AuditOutcome.SUCCESS);
    expect(arg.data.severity).toBe(AuditSeverity.INFO);
    expect(arg.data.actorEmail).toBe("u@x.fr");
    expect(arg.data.actorRole).toBe("ADMIN");
  });

  it("conserve un snapshot d'identite (actorEmail/actorRole) meme si user supprime plus tard", async () => {
    mockDb.auditLog.create.mockResolvedValue({});

    await auditLog({
      action: AuditAction.USER_DELETED,
      actor: { userId: "deleted-user", email: "ghost@x.fr", role: "LEARNER" },
      target: { type: "user", id: "deleted-user", label: "ghost@x.fr" },
    });

    const arg = mockDb.auditLog.create.mock.calls[0][0];
    expect(arg.data.actorEmail).toBe("ghost@x.fr");
    expect(arg.data.actorRole).toBe("LEARNER");
    expect(arg.data.targetLabel).toBe("ghost@x.fr");
  });

  it("hashe l'IP via hashIp avant insertion (RGPD pseudonymisation)", async () => {
    mockDb.auditLog.create.mockResolvedValue({});

    await auditLog({
      action: AuditAction.USER_LOGIN_SUCCESS,
      ip: "1.2.3.4",
    });

    expect(mockHashIp).toHaveBeenCalledWith("1.2.3.4");
    const arg = mockDb.auditLog.create.mock.calls[0][0];
    expect(arg.data.ipHash).toBe("hashed:1.2.3.4");
  });

  it("ipHash null si pas d'IP fournie", async () => {
    mockDb.auditLog.create.mockResolvedValue({});
    await auditLog({ action: AuditAction.USER_LOGIN_SUCCESS });
    expect(mockHashIp).not.toHaveBeenCalled();
    const arg = mockDb.auditLog.create.mock.calls[0][0];
    expect(arg.data.ipHash).toBeNull();
  });

  it("tronque les champs trop longs (userAgent 1000, message 2000)", async () => {
    mockDb.auditLog.create.mockResolvedValue({});

    const longUA = "A".repeat(2000);
    const longMsg = "B".repeat(5000);
    await auditLog({
      action: AuditAction.USER_LOGIN_SUCCESS,
      userAgent: longUA,
      message: longMsg,
    });

    const arg = mockDb.auditLog.create.mock.calls[0][0];
    expect(arg.data.userAgent).toHaveLength(1000);
    expect(arg.data.message).toHaveLength(2000);
  });

  it("permet d'override severity et outcome explicitement", async () => {
    mockDb.auditLog.create.mockResolvedValue({});

    await auditLog({
      action: AuditAction.USER_LOGIN_SUCCESS,
      outcome: AuditOutcome.FAILURE,
      severity: AuditSeverity.WARNING,
    });

    const arg = mockDb.auditLog.create.mock.calls[0][0];
    expect(arg.data.outcome).toBe(AuditOutcome.FAILURE);
    expect(arg.data.severity).toBe(AuditSeverity.WARNING);
  });
});

describe("auditLog - severite par defaut", () => {
  it("USER_LOGIN_FAILED -> NOTICE", async () => {
    mockDb.auditLog.create.mockResolvedValue({});
    await auditLog({ action: AuditAction.USER_LOGIN_FAILED });
    expect(mockDb.auditLog.create.mock.calls[0][0].data.severity).toBe(
      AuditSeverity.NOTICE,
    );
  });

  it("USER_DELETED -> WARNING", async () => {
    mockDb.auditLog.create.mockResolvedValue({});
    await auditLog({ action: AuditAction.USER_DELETED });
    expect(mockDb.auditLog.create.mock.calls[0][0].data.severity).toBe(
      AuditSeverity.WARNING,
    );
  });

  it("DATA_ERASURE_COMPLETED -> CRITICAL", async () => {
    mockDb.auditLog.create.mockResolvedValue({});
    await auditLog({ action: AuditAction.DATA_ERASURE_COMPLETED });
    expect(mockDb.auditLog.create.mock.calls[0][0].data.severity).toBe(
      AuditSeverity.CRITICAL,
    );
  });

  it("TENANT_DELETED -> CRITICAL", async () => {
    mockDb.auditLog.create.mockResolvedValue({});
    await auditLog({ action: AuditAction.TENANT_DELETED });
    expect(mockDb.auditLog.create.mock.calls[0][0].data.severity).toBe(
      AuditSeverity.CRITICAL,
    );
  });
});

describe("auditLog - resilience (best-effort)", () => {
  it("ne throw pas si la BDD crash, retourne false", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDb.auditLog.create.mockRejectedValue(new Error("db down"));

    const ok = await auditLog({ action: AuditAction.USER_LOGIN_SUCCESS });

    expect(ok).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("ne propage pas l'exception au caller (DoS-safe)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDb.auditLog.create.mockRejectedValue(new Error("constraint violation"));

    // Ne doit pas throw - utilise dans des paths critiques (login, etc.)
    await expect(
      auditLog({ action: AuditAction.USER_LOGIN_SUCCESS }),
    ).resolves.toBe(false);

    consoleSpy.mockRestore();
  });
});

describe("AuditActions helper", () => {
  it("re-exporte AuditAction sous un nom semantique", () => {
    expect(AuditActions.USER_LOGIN_SUCCESS).toBe(AuditAction.USER_LOGIN_SUCCESS);
    expect(AuditActions.DATA_EXPORTED).toBe(AuditAction.DATA_EXPORTED);
  });
});

describe("readIpFromHeaders", () => {
  it("extrait depuis x-forwarded-for (premiere IP de la chaine)", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(readIpFromHeaders(h)).toBe("1.2.3.4");
  });

  it("trim les espaces", () => {
    const h = new Headers({ "x-forwarded-for": "  1.2.3.4  , 10.0.0.1" });
    expect(readIpFromHeaders(h)).toBe("1.2.3.4");
  });

  it("fallback x-real-ip si x-forwarded-for absent", () => {
    const h = new Headers({ "x-real-ip": "5.6.7.8" });
    expect(readIpFromHeaders(h)).toBe("5.6.7.8");
  });

  it("retourne null si aucun header connu", () => {
    const h = new Headers({});
    expect(readIpFromHeaders(h)).toBeNull();
  });

  it("priorise x-forwarded-for sur x-real-ip", () => {
    const h = new Headers({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "9.9.9.9",
    });
    expect(readIpFromHeaders(h)).toBe("1.2.3.4");
  });
});
