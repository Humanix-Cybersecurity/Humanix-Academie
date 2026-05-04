// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du parser SCIM filter v2 (RFC 7644 §3.4.2.2).
// Critique : un parser permissif = filter injection sur la BDD via SCIM.

import { describe, it, expect } from "vitest";
import { parseScimFilter, filterToPrismaWhere } from "./filter";

describe("parseScimFilter", () => {
  it("parse 'userName eq \"alice@x.fr\"'", () => {
    const f = parseScimFilter('userName eq "alice@x.fr"');
    expect(f).toEqual({
      attribute: "userName",
      op: "eq",
      value: "alice@x.fr",
    });
  });

  it("parse 'active eq true' (booléen)", () => {
    const f = parseScimFilter("active eq true");
    expect(f?.value).toBe(true);
    expect(typeof f?.value).toBe("boolean");
  });

  it("parse 'active eq false'", () => {
    const f = parseScimFilter("active eq false");
    expect(f?.value).toBe(false);
  });

  it("parse les nombres", () => {
    const f = parseScimFilter("age eq 42");
    expect(f?.value).toBe(42);
    expect(typeof f?.value).toBe("number");
  });

  it("parse 'pr' (presence) sans valeur", () => {
    const f = parseScimFilter("title pr");
    expect(f?.op).toBe("pr");
    expect(f?.value).toBe(null);
  });

  it("supporte tous les opérateurs RFC 7644", () => {
    expect(parseScimFilter('a eq "x"')?.op).toBe("eq");
    expect(parseScimFilter('a ne "x"')?.op).toBe("ne");
    expect(parseScimFilter('a co "x"')?.op).toBe("co");
    expect(parseScimFilter('a sw "x"')?.op).toBe("sw");
    expect(parseScimFilter('a ew "x"')?.op).toBe("ew");
    expect(parseScimFilter('a gt "2026-01-01"')?.op).toBe("gt");
    expect(parseScimFilter('a ge "2026-01-01"')?.op).toBe("ge");
    expect(parseScimFilter('a lt "2026-01-01"')?.op).toBe("lt");
    expect(parseScimFilter('a le "2026-01-01"')?.op).toBe("le");
  });

  it("normalise les opérateurs en minuscules (case-insensitive)", () => {
    expect(parseScimFilter('userName EQ "x"')?.op).toBe("eq");
    expect(parseScimFilter('userName Eq "x"')?.op).toBe("eq");
  });

  it("retourne null pour input vide ou null", () => {
    expect(parseScimFilter(null)).toBe(null);
    expect(parseScimFilter("")).toBe(null);
    expect(parseScimFilter("   ")).toBe(null);
  });

  it("retourne null pour syntaxe invalide", () => {
    expect(parseScimFilter("invalid")).toBe(null);
    expect(parseScimFilter("userName == 'x'")).toBe(null); // wrong op
    expect(parseScimFilter("userName eq")).toBe(null); // missing value
  });

  it("ne supporte pas les filtres composés and/or (refus volontaire)", () => {
    expect(parseScimFilter('userName eq "a" and active eq true')).toBe(null);
    expect(parseScimFilter('a eq "x" or b eq "y"')).toBe(null);
  });

  it("gère les guillemets échappés dans la valeur", () => {
    const f = parseScimFilter('userName eq "alice \\"the boss\\" smith"');
    expect(f?.value).toBe('alice "the boss" smith');
  });

  it("supporte les attributs avec points (meta.lastModified)", () => {
    const f = parseScimFilter('meta.lastModified gt "2026-01-01T00:00:00Z"');
    expect(f?.attribute).toBe("meta.lastModified");
    expect(f?.op).toBe("gt");
  });

  it("supporte les attributs avec deux-points (extension URN)", () => {
    const f = parseScimFilter(
      'urn:humanix:scim:schemas:extension:User:1.0:role eq "ADMIN"',
    );
    expect(f?.attribute).toContain("humanix");
    expect(f?.value).toBe("ADMIN");
  });
});

describe("filterToPrismaWhere", () => {
  it("mappe userName → email", () => {
    const where = filterToPrismaWhere({
      attribute: "userName",
      op: "eq",
      value: "x@y.fr",
    });
    expect(where).toEqual({ email: "x@y.fr" });
  });

  it("mappe id → id (passthrough)", () => {
    const where = filterToPrismaWhere({
      attribute: "id",
      op: "eq",
      value: "user_42",
    });
    expect(where).toEqual({ id: "user_42" });
  });

  it("mappe active → isActive", () => {
    const where = filterToPrismaWhere({
      attribute: "active",
      op: "eq",
      value: true,
    });
    expect(where).toEqual({ isActive: true });
  });

  it("mappe displayName → name", () => {
    const where = filterToPrismaWhere({
      attribute: "displayName",
      op: "eq",
      value: "Alice",
    });
    expect(where).toEqual({ name: "Alice" });
  });

  it("op 'co' (contains) génère un Prisma contains insensitive", () => {
    const where = filterToPrismaWhere({
      attribute: "userName",
      op: "co",
      value: "@humanix",
    });
    expect(where).toEqual({
      email: { contains: "@humanix", mode: "insensitive" },
    });
  });

  it("op 'sw' (starts with) génère un Prisma startsWith insensitive", () => {
    const where = filterToPrismaWhere({
      attribute: "userName",
      op: "sw",
      value: "alice",
    });
    expect(where).toEqual({
      email: { startsWith: "alice", mode: "insensitive" },
    });
  });

  it("op 'ne' génère un Prisma not", () => {
    const where = filterToPrismaWhere({
      attribute: "active",
      op: "ne",
      value: false,
    });
    expect(where).toEqual({ isActive: { not: false } });
  });

  it("op 'pr' (presence) génère 'not: null'", () => {
    const where = filterToPrismaWhere({
      attribute: "displayName",
      op: "pr",
      value: null,
    });
    expect(where).toEqual({ name: { not: null } });
  });

  it("retourne null pour attribut non mappé (refuse l'inconnu)", () => {
    expect(
      filterToPrismaWhere({
        attribute: "unknownField",
        op: "eq",
        value: "x",
      }),
    ).toBe(null);
  });

  it("retourne null pour op 'co' sans string (sécurité)", () => {
    expect(
      filterToPrismaWhere({
        attribute: "userName",
        op: "co",
        value: 42,
      }),
    ).toBe(null);
  });
});

describe("Integration parseScimFilter → filterToPrismaWhere", () => {
  it("flow complet : 'userName eq \"alice@humanix.fr\"' → where Prisma", () => {
    const filter = parseScimFilter('userName eq "alice@humanix.fr"');
    expect(filter).not.toBe(null);
    const where = filterToPrismaWhere(filter!);
    expect(where).toEqual({ email: "alice@humanix.fr" });
  });

  it("flow complet : 'active eq true' → where Prisma", () => {
    const filter = parseScimFilter("active eq true");
    expect(filter).not.toBe(null);
    const where = filterToPrismaWhere(filter!);
    expect(where).toEqual({ isActive: true });
  });
});
