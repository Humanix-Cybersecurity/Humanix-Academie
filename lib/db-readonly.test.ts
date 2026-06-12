// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, afterEach } from "vitest";
import { hasDedicatedReadonlyDb } from "./db-readonly";

const originalEnv = { ...process.env };

describe("hasDedicatedReadonlyDb", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("false si DATABASE_URL_READONLY n'est pas defini", () => {
    delete process.env.DATABASE_URL_READONLY;
    expect(hasDedicatedReadonlyDb()).toBe(false);
  });

  it("false si DATABASE_URL_READONLY est vide", () => {
    process.env.DATABASE_URL_READONLY = "";
    expect(hasDedicatedReadonlyDb()).toBe(false);
  });

  it("true si DATABASE_URL_READONLY contient une URL", () => {
    process.env.DATABASE_URL_READONLY =
      "postgresql://humanix_ro_user:pw@localhost:5432/humanix";
    expect(hasDedicatedReadonlyDb()).toBe(true);
  });
});

// Note : dbReadOnly est instancie au module load et reutilise la
// connection. Les tests d'integration (qui exigent une vraie DB
// read-only Postgres + verification que les mutations sont rejetees)
// sont separes - testcontainers Postgres + role humanix_ro_user, a
// faire en CI dediee post-launch.
