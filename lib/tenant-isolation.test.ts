// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests d'isolation multi-tenant — invariant critique #1 d'un SaaS B2B.
//
// Pour chaque server action admin tenant-scoped, on simule :
//   - Un admin du tenant A authentifie (via mock auth())
//   - Une ressource cible appartenant au tenant B (via mock db.findUnique)
//   - On verifie que l'action throw "not_found" SANS muter quoi que ce soit
//
// Si un de ces tests passe, c'est qu'il y a une fuite cross-tenant et le
// code DOIT etre corrige avant merge.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Role } from "@prisma/client";

// ----------------------------------------------------------------------------
// Constantes de test (TENANT_A vs TENANT_B)
// ----------------------------------------------------------------------------
const TENANT_A = "tenant-A";
const TENANT_B = "tenant-B";
const ADMIN_A = "admin-A-id";
const USER_B = "user-B-id";
const GROUP_B = "group-B-id";

// vi.mock() est hoisted top-level. Pour reutiliser les mocks dans les tests
// on les declare via vi.hoisted() qui s'execute aussi au top.
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    userGroup: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(
      async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
    ),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({
    user: {
      id: "admin-A-id",
      email: "admin@tenant-a.fr",
      role: "ADMIN",
      tenantId: "tenant-A",
    },
  })),
}));

vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(async () => true),
  AuditActions: new Proxy(
    {},
    { get: (_t, prop) => String(prop) },
  ),
  AuditOutcomes: new Proxy(
    {},
    { get: (_t, prop) => String(prop) },
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// Import APRES les mocks
import {
  toggleUserActive,
  changeUserRole,
  deleteUser,
  forceUserMfa,
  unlockUser,
  adminResetUserMfa,
  setUserGroups,
  deleteGroup,
  updateGroup,
} from "@/app/admin/actions";

// ----------------------------------------------------------------------------
// Helpers de scenarios
// ----------------------------------------------------------------------------
function userInTenantB() {
  return {
    id: USER_B,
    email: "victim@tenant-b.fr",
    role: Role.LEARNER,
    tenantId: TENANT_B,
    isActive: true,
  };
}
function groupInTenantB() {
  return {
    id: GROUP_B,
    name: "Compta tenant B",
    slug: "compta",
    tenantId: TENANT_B,
    isSystem: false,
    emoji: "🧮",
    color: null,
    description: null,
    isActive: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ----------------------------------------------------------------------------
// TESTS — chaque action admin doit refuser un target d'un autre tenant
// ----------------------------------------------------------------------------
describe("Isolation tenant : actions sur User cross-tenant", () => {
  it("toggleUserActive : refuse un user d'un autre tenant", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(userInTenantB());
    await expect(toggleUserActive(USER_B, false)).rejects.toThrow("not_found");
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("changeUserRole : refuse un user d'un autre tenant", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(userInTenantB());
    await expect(changeUserRole(USER_B, Role.ADMIN)).rejects.toThrow(
      "not_found",
    );
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("deleteUser : refuse un user d'un autre tenant", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(userInTenantB());
    await expect(deleteUser(USER_B)).rejects.toThrow("not_found");
    expect(mockDb.user.delete).not.toHaveBeenCalled();
  });

  it("forceUserMfa : refuse un user d'un autre tenant", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(userInTenantB());
    await expect(forceUserMfa(USER_B, true)).rejects.toThrow("not_found");
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("unlockUser : refuse un user d'un autre tenant", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(userInTenantB());
    await expect(unlockUser(USER_B)).rejects.toThrow("not_found");
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("adminResetUserMfa : refuse un user d'un autre tenant", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(userInTenantB());
    await expect(adminResetUserMfa(USER_B)).rejects.toThrow("not_found");
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("setUserGroups : refuse un user d'un autre tenant", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(userInTenantB());
    await expect(setUserGroups(USER_B, [])).rejects.toThrow("not_found");
    expect(mockDb.userGroup.deleteMany).not.toHaveBeenCalled();
    expect(mockDb.userGroup.createMany).not.toHaveBeenCalled();
  });
});

describe("Isolation tenant : actions sur Group cross-tenant", () => {
  it("deleteGroup : refuse un groupe d'un autre tenant", async () => {
    mockDb.group.findUnique.mockResolvedValueOnce(groupInTenantB());
    await expect(deleteGroup(GROUP_B)).rejects.toThrow("not_found");
    expect(mockDb.group.delete).not.toHaveBeenCalled();
  });

  it("updateGroup : refuse un groupe d'un autre tenant", async () => {
    mockDb.group.findUnique.mockResolvedValueOnce(groupInTenantB());
    const fd = new FormData();
    fd.set("name", "rename attack");
    await expect(updateGroup(GROUP_B, fd)).rejects.toThrow("not_found");
    expect(mockDb.group.update).not.toHaveBeenCalled();
  });
});

describe("Isolation tenant : setUserGroups filtre les group IDs hostiles", () => {
  it("ne lie pas un user a un groupe d'un autre tenant", async () => {
    // L'user du tenant A est trouve correctement
    mockDb.user.findUnique.mockResolvedValueOnce({
      id: "user-A-id",
      tenantId: TENANT_A,
      email: "u@tenant-a.fr",
    });
    // L'attaquant passe un groupId du tenant B + un groupId du tenant A
    // db.group.findMany retourne uniquement ceux qui matchent
    // where: { id: in [list], tenantId: TENANT_A } -> seul le tenantA passe
    mockDb.group.findMany.mockResolvedValueOnce([
      { id: "group-A-id" }, // legitime, tenant A
      // le group de tenant B a ete filtre par le where: { tenantId } cote prisma
    ]);

    await setUserGroups("user-A-id", ["group-A-id", GROUP_B]);

    // Verifie que createMany ne contient PAS le group du tenant B
    expect(mockDb.userGroup.createMany).toHaveBeenCalled();
    const createManyCall = mockDb.userGroup.createMany.mock.calls[0]?.[0];
    const groupIds = (
      createManyCall as { data: { groupId: string }[] }
    )?.data?.map((d) => d.groupId);
    expect(groupIds).toContain("group-A-id");
    expect(groupIds).not.toContain(GROUP_B);
  });
});

describe("Isolation tenant : protection self (anti-self-foot-shot)", () => {
  it("toggleUserActive : refuse de desactiver son propre compte", async () => {
    await expect(toggleUserActive(ADMIN_A, false)).rejects.toThrow(
      "cannot_disable_self",
    );
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("changeUserRole : refuse de changer son propre role", async () => {
    await expect(changeUserRole(ADMIN_A, Role.LEARNER)).rejects.toThrow(
      "cannot_change_own_role",
    );
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("deleteUser : refuse de se supprimer", async () => {
    await expect(deleteUser(ADMIN_A)).rejects.toThrow("cannot_delete_self");
    expect(mockDb.user.delete).not.toHaveBeenCalled();
  });
});
