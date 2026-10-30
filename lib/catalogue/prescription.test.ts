// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    tenantSaisonGroupe: { findMany: vi.fn() },
    userGroup: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import {
  chargerContextePrescription,
  etatPrescription,
  filtrerSaisonsPrescrites,
  groupesParSaison,
} from "./prescription";

const dbMock = db as unknown as {
  tenantSaisonGroupe: { findMany: ReturnType<typeof vi.fn> };
  userGroup: { findMany: ReturnType<typeof vi.fn> };
};

describe("etatPrescription", () => {
  it("une saison sans affectation s'adresse a tout l'espace", () => {
    const etat = etatPrescription({
      isMandatory: true,
      groupesSaison: [],
      groupesUtilisateur: new Set(),
    });
    expect(etat).toEqual({ ciblee: false, prescrite: true, obligatoire: true });
  });

  it("une saison affectee a la compta est prescrite a la compta", () => {
    const etat = etatPrescription({
      isMandatory: false,
      groupesSaison: ["g-compta"],
      groupesUtilisateur: new Set(["g-compta", "g-direction"]),
    });
    expect(etat).toEqual({ ciblee: true, prescrite: true, obligatoire: false });
  });

  it("une saison affectee a la compta n'est pas prescrite aux RH, et jamais obligatoire pour eux", () => {
    const etat = etatPrescription({
      isMandatory: true,
      groupesSaison: ["g-compta"],
      groupesUtilisateur: new Set(["g-rh"]),
    });
    expect(etat).toEqual({
      ciblee: true,
      prescrite: false,
      obligatoire: false,
    });
  });

  it("une personne sans groupe ne recoit que les saisons de tout l'espace", () => {
    expect(
      etatPrescription({
        isMandatory: true,
        groupesSaison: ["g-compta"],
        groupesUtilisateur: new Set(),
      }).prescrite,
    ).toBe(false);
    expect(
      etatPrescription({
        isMandatory: true,
        groupesSaison: [],
        groupesUtilisateur: new Set(),
      }).obligatoire,
    ).toBe(true);
  });

  it("il suffit d'un groupe en commun", () => {
    expect(
      etatPrescription({
        isMandatory: true,
        groupesSaison: ["g-compta", "g-rh", "g-it"],
        groupesUtilisateur: new Set(["g-it"]),
      }),
    ).toEqual({ ciblee: true, prescrite: true, obligatoire: true });
  });
});

describe("groupesParSaison et filtrerSaisonsPrescrites", () => {
  const affectations = [
    { saisonId: "s-fraude", groupId: "g-compta" },
    { saisonId: "s-fraude", groupId: "g-direction" },
    { saisonId: "s-dev", groupId: "g-dev" },
  ];

  it("regroupe les affectations par saison", () => {
    const m = groupesParSaison(affectations);
    expect(m.get("s-fraude")).toEqual(["g-compta", "g-direction"]);
    expect(m.get("s-dev")).toEqual(["g-dev"]);
    expect(m.get("s-mdp")).toBeUndefined();
  });

  it("garde les saisons de tout l'espace et celles des groupes de la personne", () => {
    const obligatoires = [
      { saisonId: "s-mdp", titre: "Mots de passe" },
      { saisonId: "s-fraude", titre: "Fraude au president" },
      { saisonId: "s-dev", titre: "Cyber dev" },
    ];
    const pourCompta = filtrerSaisonsPrescrites(obligatoires, {
      affectations,
      groupesUtilisateur: new Set(["g-compta"]),
    });
    expect(pourCompta.map((s) => s.saisonId)).toEqual(["s-mdp", "s-fraude"]);

    const pourPersonneSansGroupe = filtrerSaisonsPrescrites(obligatoires, {
      affectations,
      groupesUtilisateur: new Set(),
    });
    expect(pourPersonneSansGroupe.map((s) => s.saisonId)).toEqual(["s-mdp"]);
  });

  it("sans aucune affectation dans l'espace, rien ne change", () => {
    const obligatoires = [{ saisonId: "s-a" }, { saisonId: "s-b" }];
    expect(
      filtrerSaisonsPrescrites(obligatoires, {
        affectations: [],
        groupesUtilisateur: new Set(),
      }),
    ).toEqual(obligatoires);
  });
});

describe("chargerContextePrescription", () => {
  beforeEach(() => {
    dbMock.tenantSaisonGroupe.findMany.mockReset();
    dbMock.userGroup.findMany.mockReset();
  });

  it("charge les affectations de l'espace et les groupes de la personne", async () => {
    dbMock.tenantSaisonGroupe.findMany.mockResolvedValue([
      { saisonId: "s-fraude", groupId: "g-compta" },
    ]);
    dbMock.userGroup.findMany.mockResolvedValue([{ groupId: "g-compta" }]);
    const ctx = await chargerContextePrescription("t1", "u1");
    expect(ctx.affectations).toEqual([
      { saisonId: "s-fraude", groupId: "g-compta" },
    ]);
    expect(ctx.groupesUtilisateur).toEqual(new Set(["g-compta"]));
    expect(dbMock.tenantSaisonGroupe.findMany).toHaveBeenCalledWith({
      where: { tenantId: "t1" },
      select: { saisonId: true, groupId: true },
    });
    expect(dbMock.userGroup.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: { groupId: true },
    });
  });
});
