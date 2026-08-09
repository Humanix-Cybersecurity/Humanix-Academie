// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests des gardes du mode « Voir en tant que » (#754).
//
// C'est la fonctionnalite la plus dangereuse d'un SaaS multi-tenant : elle
// donne a un admin l'acces au compte d'un autre utilisateur. Ces tests
// couvrent les GARDES, pas le chemin nominal — ce qui doit etre impossible :
//
//   - un non-admin qui demande un acces
//   - un admin qui vise un compte d'un AUTRE tenant
//   - quelqu'un qui accepte a la place de la personne ciblee
//   - un tiers qui met fin a une session qui ne le concerne pas
//   - un consentement expire ou rejoue
//
// Toutes les dependances sont mockees : ces actions sont des server actions
// (Prisma, NextAuth, mail, revalidatePath).

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    tenant: { findUnique: vi.fn() },
    impersonationSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// AuditAction est une enum Prisma : on la remplace par un Proxy qui renvoie
// le nom de la cle, suffisant pour verifier QUELLE action a ete tracee.
vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
  AuditActions: new Proxy({}, { get: (_t, prop) => String(prop) }),
}));

vi.mock("./email", () => ({ sendImpersonationRequestEmail: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  requestImpersonation,
  acceptImpersonation,
  rejectImpersonation,
  endImpersonation,
  getActiveImpersonation,
} from "./actions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const auditLogMock = auditLog as unknown as ReturnType<typeof vi.fn>;
const dbMock = db as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  impersonationSession: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

/** Session NextAuth d'un admin du tenant t1. */
function asUser(over: Record<string, unknown> = {}) {
  return {
    user: {
      id: "admin1",
      email: "admin@acme.fr",
      name: "Admin",
      role: "ADMIN",
      tenantId: "t1",
      ...over,
    },
  };
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = {
  targetEmail: "cible@acme.fr",
  reason: "Support ticket #4321 : la page facturation est vide",
  durationMinutes: "60",
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(asUser());
  dbMock.tenant.findUnique.mockResolvedValue({ name: "ACME" });
  dbMock.impersonationSession.updateMany.mockResolvedValue({ count: 0 });
  dbMock.impersonationSession.create.mockResolvedValue({ id: "imp1" });
  dbMock.impersonationSession.update.mockResolvedValue({});
});

describe("requestImpersonation — qui a le droit de demander", () => {
  it("refuse un LEARNER", async () => {
    authMock.mockResolvedValue(asUser({ role: "LEARNER" }));
    await expect(requestImpersonation(form(VALID))).rejects.toThrow(
      "forbidden",
    );
    expect(dbMock.impersonationSession.create).not.toHaveBeenCalled();
  });

  it("refuse un MANAGER (role intermediaire, pas admin)", async () => {
    authMock.mockResolvedValue(asUser({ role: "MANAGER" }));
    await expect(requestImpersonation(form(VALID))).rejects.toThrow(
      "forbidden",
    );
  });

  it("refuse un visiteur non connecte", async () => {
    authMock.mockResolvedValue(null);
    await expect(requestImpersonation(form(VALID))).rejects.toThrow(
      "unauthorized",
    );
  });

  it("accepte ADMIN, RSSI et SUPERADMIN", async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: "cible1",
      tenantId: "t1",
      email: "cible@acme.fr",
      name: "Cible",
    });
    for (const role of ["ADMIN", "RSSI", "SUPERADMIN"]) {
      vi.clearAllMocks();
      authMock.mockResolvedValue(asUser({ role }));
      dbMock.user.findUnique.mockResolvedValue({
        id: "cible1",
        tenantId: "t1",
        email: "cible@acme.fr",
        name: "Cible",
      });
      dbMock.tenant.findUnique.mockResolvedValue({ name: "ACME" });
      dbMock.impersonationSession.updateMany.mockResolvedValue({ count: 0 });
      dbMock.impersonationSession.create.mockResolvedValue({ id: "imp1" });

      const res = await requestImpersonation(form(VALID));
      expect(res, `role ${role}`).toEqual({ ok: true, mode: "requested" });
    }
  });
});

describe("requestImpersonation — isolation tenant", () => {
  it("refuse une cible d'un AUTRE tenant", async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: "cible1",
      tenantId: "AUTRE-TENANT",
      email: "cible@autre.fr",
      name: "Cible",
    });

    const res = await requestImpersonation(form(VALID));
    expect(res).toEqual({ ok: false, reason: "target_not_same_tenant" });
    expect(dbMock.impersonationSession.create).not.toHaveBeenCalled();
  });

  it("autorise le cross-tenant pour un SUPERADMIN uniquement", async () => {
    authMock.mockResolvedValue(asUser({ role: "SUPERADMIN" }));
    dbMock.user.findUnique.mockResolvedValue({
      id: "cible1",
      tenantId: "AUTRE-TENANT",
      email: "cible@autre.fr",
      name: "Cible",
    });

    const res = await requestImpersonation(form(VALID));
    expect(res).toEqual({ ok: true, mode: "requested" });
  });

  it("refuse de se cibler soi-meme", async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: "admin1", // meme id que la session
      tenantId: "t1",
      email: "admin@acme.fr",
      name: "Admin",
    });

    const res = await requestImpersonation(form(VALID));
    expect(res).toEqual({ ok: false, reason: "self_target" });
  });
});

describe("requestImpersonation — validation de la demande", () => {
  beforeEach(() => {
    dbMock.user.findUnique.mockResolvedValue({
      id: "cible1",
      tenantId: "t1",
      email: "cible@acme.fr",
      name: "Cible",
    });
  });

  it("exige une raison d'au moins 10 caracteres (tracabilite RGPD)", async () => {
    const res = await requestImpersonation(form({ ...VALID, reason: "bug" }));
    expect(res).toEqual({ ok: false, reason: "invalid_reason" });
    expect(dbMock.impersonationSession.create).not.toHaveBeenCalled();
  });

  it("refuse une duree hors bornes (< 5 min, > 24 h, ou non numerique)", async () => {
    for (const durationMinutes of ["4", "1441", "abc", "-60"]) {
      const res = await requestImpersonation(
        form({ ...VALID, durationMinutes }),
      );
      expect(res, `duree ${durationMinutes}`).toEqual({
        ok: false,
        reason: "invalid_duration",
      });
    }
  });

  it("accepte les bornes exactes 5 min et 24 h", async () => {
    for (const durationMinutes of ["5", "1440"]) {
      const res = await requestImpersonation(
        form({ ...VALID, durationMinutes }),
      );
      expect(res, `duree ${durationMinutes}`).toEqual({
        ok: true,
        mode: "requested",
      });
    }
  });

  it("refuse une adresse vide ou malformee sans requeter la BDD", async () => {
    const res = await requestImpersonation(
      form({ ...VALID, targetEmail: "pasunemail" }),
    );
    expect(res).toEqual({ ok: false, reason: "target_not_found" });
    expect(dbMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("revoque les demandes PENDING precedentes pour ce couple admin/cible", async () => {
    await requestImpersonation(form(VALID));
    expect(dbMock.impersonationSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adminUserId: "admin1",
          targetUserId: "cible1",
          status: "PENDING",
        }),
        data: { status: "EXPIRED" },
      }),
    );
  });

  it("genere un token de consentement non devinable et a duree limitee", async () => {
    await requestImpersonation(form(VALID));
    const { data } = dbMock.impersonationSession.create.mock.calls[0][0];
    // 32 octets en base64url : ni sequentiel, ni derive de donnees connues.
    expect(data.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(data.consentExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("acceptImpersonation — seule la personne ciblee peut consentir", () => {
  const pending = {
    id: "imp1",
    status: "PENDING",
    token: "tok",
    targetEmail: "cible@acme.fr",
    adminUserId: "admin1",
    adminTenantId: "t1",
    requestedDurationMinutes: 60,
    consentExpiresAt: new Date(Date.now() + 3600_000),
  };

  it("refuse un compte tiers qui tente d'accepter a la place de la cible", async () => {
    authMock.mockResolvedValue(asUser({ email: "quelquun@autre.fr" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue(pending);

    const res = await acceptImpersonation("tok");
    expect(res).toEqual({ ok: false, reason: "wrong_account" });
    expect(dbMock.impersonationSession.update).not.toHaveBeenCalled();
  });

  it("refuse un visiteur non connecte", async () => {
    authMock.mockResolvedValue(null);
    const res = await acceptImpersonation("tok");
    expect(res).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("accepte la cible et fixe endsAt = maintenant + duree demandee", async () => {
    authMock.mockResolvedValue(
      asUser({ id: "cible1", email: "cible@acme.fr" }),
    );
    dbMock.impersonationSession.findUnique.mockResolvedValue(pending);

    const res = await acceptImpersonation("tok");
    expect(res).toMatchObject({ ok: true, action: "accepted" });

    const { data } = dbMock.impersonationSession.update.mock.calls[0][0];
    expect(data.status).toBe("ACTIVE");
    const durationMs = data.endsAt.getTime() - data.grantedAt.getTime();
    expect(durationMs).toBe(60 * 60 * 1000);
  });

  it("compare les emails sans tenir compte de la casse", async () => {
    authMock.mockResolvedValue(asUser({ email: "Cible@ACME.fr" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue(pending);

    const res = await acceptImpersonation("tok");
    expect(res).toMatchObject({ ok: true });
  });

  it("refuse un consentement expire et marque la session EXPIRED", async () => {
    authMock.mockResolvedValue(asUser({ email: "cible@acme.fr" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue({
      ...pending,
      consentExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await acceptImpersonation("tok");
    expect(res).toEqual({ ok: false, reason: "expired" });
    expect(dbMock.impersonationSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "EXPIRED" } }),
    );
  });

  it("refuse de rejouer un token deja traite", async () => {
    authMock.mockResolvedValue(asUser({ email: "cible@acme.fr" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue({
      ...pending,
      status: "ACTIVE",
    });

    const res = await acceptImpersonation("tok");
    expect(res).toEqual({ ok: false, reason: "already_processed" });
  });

  it("refuse un token inconnu", async () => {
    authMock.mockResolvedValue(asUser({ email: "cible@acme.fr" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue(null);

    const res = await acceptImpersonation("inconnu");
    expect(res).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("rejectImpersonation", () => {
  const pending = {
    id: "imp1",
    status: "PENDING",
    targetEmail: "cible@acme.fr",
    adminUserId: "admin1",
    adminTenantId: "t1",
    requestedDurationMinutes: 60,
    consentExpiresAt: new Date(Date.now() + 3600_000),
  };

  it("refuse qu'un compte tiers connecte rejette a la place de la cible", async () => {
    authMock.mockResolvedValue(asUser({ email: "quelquun@autre.fr" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue(pending);

    const res = await rejectImpersonation("tok");
    expect(res).toEqual({ ok: false, reason: "wrong_account" });
  });

  it("autorise le refus depuis le lien du mail sans etre connecte", async () => {
    // Le refus est le sens SUR : on ne force pas la cible a se loguer pour
    // dire non (le token du mail fait foi).
    authMock.mockResolvedValue(null);
    dbMock.impersonationSession.findUnique.mockResolvedValue(pending);

    const res = await rejectImpersonation("tok");
    expect(res).toMatchObject({ ok: true, action: "rejected" });
    const { data } = dbMock.impersonationSession.update.mock.calls[0][0];
    expect(data.status).toBe("REJECTED");
    expect(data.endedReason).toBe("user_rejected");
  });
});

describe("endImpersonation — qui peut clore une session active", () => {
  const active = {
    id: "imp1",
    status: "ACTIVE",
    adminUserId: "admin1",
    targetUserId: "cible1",
    adminTenantId: "t1",
    targetEmail: "cible@acme.fr",
  };

  it("refuse un tiers qui n'est ni l'admin ni la cible", async () => {
    authMock.mockResolvedValue(asUser({ id: "intrus" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue(active);

    const res = await endImpersonation("imp1", "admin_ended");
    expect(res).toEqual({ ok: false, reason: "unauthorized" });
    expect(dbMock.impersonationSession.update).not.toHaveBeenCalled();
  });

  it("laisse l'admin proprietaire clore la session (ENDED)", async () => {
    authMock.mockResolvedValue(asUser({ id: "admin1" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue(active);

    const res = await endImpersonation("imp1", "admin_ended");
    expect(res).toMatchObject({ ok: true, action: "ended" });
    const { data } = dbMock.impersonationSession.update.mock.calls[0][0];
    expect(data.status).toBe("ENDED");
  });

  it("requalifie en REVOKED quand c'est la cible qui coupe, meme si l'appelant dit admin_ended", async () => {
    authMock.mockResolvedValue(asUser({ id: "cible1", role: "LEARNER" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue(active);

    const res = await endImpersonation("imp1", "admin_ended");
    expect(res).toMatchObject({ ok: true });
    const { data } = dbMock.impersonationSession.update.mock.calls[0][0];
    expect(data.status).toBe("REVOKED");
    expect(data.endedReason).toBe("user_revoked");
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "IMPERSONATION_REVOKED" }),
    );
  });

  it("refuse de clore une session qui ne l'est plus", async () => {
    authMock.mockResolvedValue(asUser({ id: "admin1" }));
    dbMock.impersonationSession.findUnique.mockResolvedValue({
      ...active,
      status: "ENDED",
    });

    const res = await endImpersonation("imp1", "admin_ended");
    expect(res).toEqual({ ok: false, reason: "already_processed" });
  });

  it("refuse un visiteur non connecte", async () => {
    authMock.mockResolvedValue(null);
    const res = await endImpersonation("imp1", "admin_ended");
    expect(res).toEqual({ ok: false, reason: "unauthorized" });
  });
});

describe("getActiveImpersonation", () => {
  it("ne retourne que les sessions ACTIVE non expirees de l'admin courant", async () => {
    dbMock.impersonationSession.findFirst.mockResolvedValue({ id: "imp1" });

    await getActiveImpersonation();
    const { where } = dbMock.impersonationSession.findFirst.mock.calls[0][0];
    expect(where.adminUserId).toBe("admin1");
    expect(where.status).toBe("ACTIVE");
    expect(where.endsAt.gt).toBeInstanceOf(Date);
  });

  it("cloture les sessions ACTIVE perimees quand il n'y en a plus de valide", async () => {
    dbMock.impersonationSession.findFirst.mockResolvedValue(null);
    dbMock.impersonationSession.updateMany.mockResolvedValue({ count: 1 });

    expect(await getActiveImpersonation()).toBeNull();
    expect(dbMock.impersonationSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ENDED",
          endedReason: "expired",
        }),
      }),
    );
  });

  it("retourne null sans requeter si personne n'est connecte", async () => {
    authMock.mockResolvedValue(null);
    expect(await getActiveImpersonation()).toBeNull();
    expect(dbMock.impersonationSession.findFirst).not.toHaveBeenCalled();
  });
});
