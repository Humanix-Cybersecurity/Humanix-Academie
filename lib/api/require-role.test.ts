// SPDX-License-Identifier: AGPL-3.0-or-later
// @ts-nocheck - Ce fichier mocke `auth` de NextAuth v5 qui a 3 overloads
// (Server Action / Middleware / API Route). TypeScript peine a resoudre
// le bon overload sur `vi.mocked(auth).mockResolvedValue(...)`. Vitest
// execute le test tel quel sans tsc (validation par les assertions
// runtime). Si NextAuth ajoute un overload qui casse le test, vitest
// rouge nous le dira.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Session } from "next-auth";

// Les modules avec I/O (auth, audit, db) sont mockes pour tester
// la logique pure de require-role : qui passe, qui est refuse, qui
// produit un audit log.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(async () => true),
}));
// L'espace actif et les acces externes viennent de modules qui lisent les
// en-tetes de la requete : mockes aussi. Par defaut, aucun contexte (null) :
// requireRole retombe sur le role de la session, comme avant les acces croises.
vi.mock("@/lib/current-tenant", () => ({
  getCurrentTenantAccess: vi.fn(async () => null),
}));
vi.mock("@/lib/tenant-membership", () => ({
  hasTenantAccess: vi.fn(async () => false),
}));

import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { getCurrentTenantAccess } from "@/lib/current-tenant";
import { hasTenantAccess } from "@/lib/tenant-membership";
import {
  requireSession,
  requireRole,
  requireSuperadmin,
  requireAdmin,
  requireTenantMember,
} from "./require-role";

function fakeSession(
  partial: Partial<Session["user"]> & { id?: string },
): Session {
  return {
    expires: new Date(Date.now() + 3600_000).toISOString(),
    user: {
      id: partial.id ?? "u_test",
      name: partial.name ?? null,
      email: partial.email ?? "test@example.com",
      role: partial.role,
      tenantId: partial.tenantId,
    },
  } as Session;
}

describe("requireSession", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("retourne {response: 401} si aucune session", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const g = await requireSession();
    expect("response" in g).toBe(true);
    if ("response" in g) {
      expect(g.response.status).toBe(401);
    }
  });

  it("retourne {response: 401} si session.user.id absent", async () => {
    vi.mocked(auth).mockResolvedValue({
      expires: "",
      user: { id: undefined as unknown as string },
    } as Session);
    const g = await requireSession();
    expect("response" in g).toBe(true);
  });

  it("retourne {session} si auth OK", async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession({ id: "u1" }));
    const g = await requireSession();
    expect("session" in g).toBe(true);
    if ("session" in g) {
      expect(g.session.user.id).toBe("u1");
    }
  });
});

describe("requireRole", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("401 si pas de session", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const g = await requireRole(["ADMIN"]);
    expect("response" in g).toBe(true);
    if ("response" in g) expect(g.response.status).toBe(401);
  });

  it("403 si role insuffisant + audit log DENIED appele", async () => {
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "LEARNER" }),
    );
    const g = await requireRole(["ADMIN", "RSSI"]);
    expect("response" in g).toBe(true);
    if ("response" in g) expect(g.response.status).toBe(403);

    expect(auditLog).toHaveBeenCalledOnce();
    const call = vi.mocked(auditLog).mock.calls[0][0];
    expect(call.outcome).toBe("DENIED");
    expect(call.message).toContain("LEARNER");
  });

  it("autorise si role exact", async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession({ id: "u1", role: "ADMIN" }));
    const g = await requireRole(["ADMIN", "RSSI"]);
    expect("session" in g).toBe(true);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("audit log capture IP depuis x-forwarded-for", async () => {
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "LEARNER" }),
    );
    const req = new Request("https://test.local/api/admin", {
      headers: {
        "x-forwarded-for": "203.0.113.42, 10.0.0.1",
        "user-agent": "TestAgent/1.0",
      },
    });
    await requireRole(["ADMIN"], req);
    const call = vi.mocked(auditLog).mock.calls[0][0];
    expect(call.ip).toBe("203.0.113.42");
    expect(call.userAgent).toBe("TestAgent/1.0");
  });

  it("403 meme si role est string aleatoire (defense profondeur)", async () => {
    vi.mocked(auth).mockResolvedValue(
      fakeSession({
        id: "u1",
        role: "HACKER" as unknown as Session["user"]["role"],
      }),
    );
    const g = await requireRole(["ADMIN"]);
    expect("response" in g).toBe(true);
    if ("response" in g) expect(g.response.status).toBe(403);
  });
});

describe("requireSuperadmin / requireAdmin", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("requireSuperadmin : seul SUPERADMIN passe", async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession({ id: "u1", role: "ADMIN" }));
    const g = await requireSuperadmin();
    expect("response" in g).toBe(true);

    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "SUPERADMIN" }),
    );
    const g2 = await requireSuperadmin();
    expect("session" in g2).toBe(true);
  });

  it("requireAdmin : ADMIN, RSSI, SUPERADMIN passent ; LEARNER non", async () => {
    for (const role of ["ADMIN", "RSSI", "SUPERADMIN"] as const) {
      vi.mocked(auth).mockResolvedValue(fakeSession({ id: "u1", role }));
      const g = await requireAdmin();
      expect("session" in g).toBe(true);
    }
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "LEARNER" }),
    );
    const denied = await requireAdmin();
    expect("response" in denied).toBe(true);
  });
});

describe("requireTenantMember (anti cross-tenant)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("autorise si user appartient au tenant", async () => {
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "ADMIN", tenantId: "t1" }),
    );
    const g = await requireTenantMember("t1");
    expect("session" in g).toBe(true);
  });

  it("REFUSE 404 si user du tenant t1 essaie d'acceder a t2", async () => {
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "ADMIN", tenantId: "t1" }),
    );
    const g = await requireTenantMember("t2");
    expect("response" in g).toBe(true);
    if ("response" in g) {
      // 404 plutot que 403 (anti-enumeration : on ne leak pas
      // l'existence du tenant)
      expect(g.response.status).toBe(404);
    }
    expect(auditLog).toHaveBeenCalledOnce();
    const call = vi.mocked(auditLog).mock.calls[0][0];
    expect(call.message).toContain("cross-tenant");
  });

  it("SUPERADMIN bypass cross-tenant (peut acceder partout)", async () => {
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u_super", role: "SUPERADMIN", tenantId: "t1" }),
    );
    const g = await requireTenantMember("t2");
    expect("session" in g).toBe(true);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("refuse 401 si pas de session", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const g = await requireTenantMember("t1");
    expect("response" in g).toBe(true);
    if ("response" in g) expect(g.response.status).toBe(401);
  });

  it("combine avec allowedRoles : LEARNER refuse meme sur son tenant", async () => {
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "LEARNER", tenantId: "t1" }),
    );
    const g = await requireTenantMember("t1", ["ADMIN", "RSSI"]);
    expect("response" in g).toBe(true);
    if ("response" in g) expect(g.response.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Acces croise : l'espace vise par la requete n'est pas l'espace d'origine.
// Le role juge est le role EFFECTIF dans l'espace vise (lib/current-tenant),
// pas celui de la session. Ajoute le 2026-11-02 avec la fin de la migration
// vers l'espace actif.
// ---------------------------------------------------------------------------
function acces(
  status: "home" | "cross" | "mismatch" | "downgraded",
  role: string | null,
) {
  return {
    userId: "u1",
    homeTenantId: "t1",
    homeRole: "ADMIN",
    tenantId: status === "home" ? "t1" : "t2",
    role,
    status,
    redirectTo: null,
  };
}

describe("requireRole en acces croise (espace vise != espace d'origine)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentTenantAccess).mockResolvedValue(null);
    vi.mocked(hasTenantAccess).mockResolvedValue(false);
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "ADMIN", tenantId: "t1" }),
    );
  });

  it("juge le role effectif : un acces externe MANAGER n'ouvre pas une route ADMIN", async () => {
    vi.mocked(getCurrentTenantAccess).mockResolvedValue(
      acces("cross", "MANAGER"),
    );
    const g = await requireAdmin();
    expect("response" in g).toBe(true);
    if ("response" in g) expect(g.response.status).toBe(403);
    expect(auditLog).toHaveBeenCalledOnce();
  });

  it("laisse passer un acces externe ADMIN", async () => {
    vi.mocked(getCurrentTenantAccess).mockResolvedValue(
      acces("cross", "ADMIN"),
    );
    const g = await requireAdmin();
    expect("session" in g).toBe(true);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("refuse sans acces a l'espace du sous-domaine (mismatch), meme ADMIN chez soi", async () => {
    vi.mocked(getCurrentTenantAccess).mockResolvedValue(
      acces("mismatch", null),
    );
    const g = await requireAdmin();
    expect("response" in g).toBe(true);
    if ("response" in g) expect(g.response.status).toBe(403);
  });

  it("refuse un acces externe de rang inferieur au role d'origine (downgraded)", async () => {
    vi.mocked(getCurrentTenantAccess).mockResolvedValue(
      acces("downgraded", "MANAGER"),
    );
    const g = await requireRole(["MANAGER", "ADMIN"]);
    expect("response" in g).toBe(true);
  });

  it("sur l'espace d'origine, le role est celui de la session", async () => {
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "MANAGER", tenantId: "t1" }),
    );
    vi.mocked(getCurrentTenantAccess).mockResolvedValue(
      acces("home", "MANAGER"),
    );
    expect("session" in (await requireRole(["MANAGER"]))).toBe(true);
    expect("response" in (await requireAdmin())).toBe(true);
  });
});

describe("requireTenantMember avec acces externe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentTenantAccess).mockResolvedValue(null);
    vi.mocked(auth).mockResolvedValue(
      fakeSession({ id: "u1", role: "ADMIN", tenantId: "t1" }),
    );
  });

  it("un acces externe au tenant cible vaut appartenance", async () => {
    vi.mocked(hasTenantAccess).mockResolvedValue(true);
    const g = await requireTenantMember("t2");
    expect("session" in g).toBe(true);
    expect(hasTenantAccess).toHaveBeenCalledWith("u1", "t2");
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("sans acces externe, 404 et audit comme avant", async () => {
    vi.mocked(hasTenantAccess).mockResolvedValue(false);
    const g = await requireTenantMember("t2");
    expect("response" in g).toBe(true);
    if ("response" in g) expect(g.response.status).toBe(404);
    expect(auditLog).toHaveBeenCalledOnce();
  });
});
