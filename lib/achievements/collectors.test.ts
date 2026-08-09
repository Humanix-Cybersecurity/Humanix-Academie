// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du classement des collectionneurs (#752).
//
// Enjeux : un classement faux est visible de toute l'organisation. On
// verifie le tri (points, puis nb de badges, puis anteriorite), l'exclusion
// des comptes qui ne doivent pas y figurer, et la robustesse aux badges
// retires du catalogue.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { userAchievement: { findMany: vi.fn() } },
}));

import { getCollectorsRanking, getCollectorPosition } from "./collectors";
import { db } from "@/lib/db";
import { ACHIEVEMENTS_CATALOG } from "./catalog";

const dbMock = db as unknown as {
  userAchievement: { findMany: ReturnType<typeof vi.fn> };
};

// Deux badges reels du catalogue, avec leurs points reels : le test suit
// le catalogue plutot que de figer des valeurs qui deriveraient.
const A = ACHIEVEMENTS_CATALOG[0];
const B = ACHIEVEMENTS_CATALOG[1];

/** Ligne UserAchievement telle que la retourne le select de collectors.ts */
function unlock(
  userId: string,
  slug: string,
  unlockedAt: Date,
  name = userId,
  service: string | null = null,
) {
  return {
    userId,
    unlockedAt,
    achievement: { slug },
    user: { name, service },
  };
}

const T0 = new Date("2026-01-01T00:00:00Z");
const T1 = new Date("2026-02-01T00:00:00Z");
const T2 = new Date("2026-03-01T00:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCollectorsRanking", () => {
  it("agrege points et nombre de badges par user, et classe par points", async () => {
    dbMock.userAchievement.findMany.mockResolvedValue([
      unlock("u1", A.slug, T0),
      unlock("u2", A.slug, T0),
      unlock("u2", B.slug, T1),
    ]);

    const rows = await getCollectorsRanking("t1");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rank: 1,
      userId: "u2",
      badgeCount: 2,
      points: A.points + B.points,
    });
    expect(rows[1]).toMatchObject({ rank: 2, userId: "u1", points: A.points });
  });

  it("departage les ex aequo par nombre de badges", async () => {
    // Meme total de points, obtenu differemment : un badge a 20 pts d'un
    // cote, deux badges a 10 pts de l'autre. Le collectionneur (2 badges)
    // passe devant — c'est un classement de COLLECTION, pas de rendement.
    const twenty = ACHIEVEMENTS_CATALOG.find((a) => a.points === 20)!;
    const tens = ACHIEVEMENTS_CATALOG.filter((a) => a.points === 10).slice(
      0,
      2,
    );
    expect(tens).toHaveLength(2); // garde-fou si le catalogue change

    dbMock.userAchievement.findMany.mockResolvedValue([
      unlock("gros_badge", twenty.slug, T0),
      unlock("collectionneur", tens[0].slug, T0),
      unlock("collectionneur", tens[1].slug, T0),
    ]);

    const rows = await getCollectorsRanking("t1");
    expect(rows[0].points).toBe(rows[1].points); // vraie egalite de points
    expect(rows.map((r) => r.userId)).toEqual(["collectionneur", "gros_badge"]);
    expect(rows[0].badgeCount).toBe(2);
  });

  it("a points et badges egaux, celui qui a fini en premier passe devant", async () => {
    dbMock.userAchievement.findMany.mockResolvedValue([
      unlock("tardif", A.slug, T2),
      unlock("precoce", A.slug, T0),
    ]);

    const rows = await getCollectorsRanking("t1");
    expect(rows.map((r) => r.userId)).toEqual(["precoce", "tardif"]);
  });

  it("retient la date du DERNIER badge pour departager", async () => {
    dbMock.userAchievement.findMany.mockResolvedValue([
      unlock("u1", A.slug, T0),
      unlock("u1", B.slug, T2), // dernier deblocage = T2
    ]);

    const rows = await getCollectorsRanking("t1");
    expect(rows[0].lastUnlockedAt).toEqual(T2);
  });

  it("ignore les badges absents du catalogue (badge retire)", async () => {
    dbMock.userAchievement.findMany.mockResolvedValue([
      unlock("u1", A.slug, T0),
      unlock("u1", "badge_supprime_du_catalogue", T1),
    ]);

    const rows = await getCollectorsRanking("t1");
    expect(rows[0]).toMatchObject({ badgeCount: 1, points: A.points });
  });

  it("filtre sur le tenant et n'inclut que les membres actifs LEARNER/MANAGER", async () => {
    dbMock.userAchievement.findMany.mockResolvedValue([]);
    await getCollectorsRanking("t42");

    expect(dbMock.userAchievement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "t42",
          user: { isActive: true, role: { in: ["LEARNER", "MANAGER"] } },
        }),
      }),
    );
  });

  it("tronque au nombre de places demande", async () => {
    dbMock.userAchievement.findMany.mockResolvedValue([
      unlock("u1", A.slug, T0),
      unlock("u2", A.slug, T1),
      unlock("u3", A.slug, T2),
    ]);

    expect(await getCollectorsRanking("t1", 2)).toHaveLength(2);
  });

  it("retourne un tableau vide si personne n'a de badge", async () => {
    dbMock.userAchievement.findMany.mockResolvedValue([]);
    expect(await getCollectorsRanking("t1")).toEqual([]);
  });
});

describe("getCollectorPosition", () => {
  it("donne le rang sur le classement COMPLET, pas seulement le top", async () => {
    // 25 users : le dernier est hors du top 20 affiche mais doit connaitre
    // sa position reelle.
    const rows = Array.from({ length: 25 }, (_, i) =>
      unlock(`u${i}`, A.slug, new Date(T0.getTime() + i * 86_400_000)),
    );
    dbMock.userAchievement.findMany.mockResolvedValue(rows);

    const pos = await getCollectorPosition("t1", "u24");
    expect(pos).toEqual({ rank: 25, total: 25, points: A.points });
  });

  it("retourne null pour un user sans aucun badge", async () => {
    dbMock.userAchievement.findMany.mockResolvedValue([
      unlock("u1", A.slug, T0),
    ]);

    expect(await getCollectorPosition("t1", "inconnu")).toBeNull();
  });
});
