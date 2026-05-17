// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSecret,
  getSecretAsync,
  hasSecret,
  setSecretResolver,
  resetSecretCache,
  invalidateSecret,
  __resetForTests,
} from "./secrets";

describe("lib/secrets", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    __resetForTests();
    // Reset env entre chaque test
    process.env = { ...ORIGINAL_ENV };
  });

  describe("default resolver (process.env)", () => {
    it("retourne la valeur de process.env", () => {
      process.env.TEST_SECRET = "abc123";
      expect(getSecret("TEST_SECRET")).toBe("abc123");
    });

    it("retourne undefined pour un secret absent", () => {
      delete process.env.MISSING_SECRET;
      expect(getSecret("MISSING_SECRET")).toBeUndefined();
    });

    it("throw quand required: true et secret absent", () => {
      delete process.env.MISSING_SECRET;
      expect(() => getSecret("MISSING_SECRET", { required: true })).toThrow(
        /secret_missing:MISSING_SECRET/,
      );
    });

    it("ne throw pas quand required: true et secret present", () => {
      process.env.OK_SECRET = "value";
      expect(getSecret("OK_SECRET", { required: true })).toBe("value");
    });
  });

  describe("cache memoire", () => {
    it("mise en cache : 2e appel ne refait pas process.env", () => {
      process.env.CACHED = "v1";
      expect(getSecret("CACHED")).toBe("v1");
      // Si on change process.env mais le cache est intact -> ancienne valeur
      process.env.CACHED = "v2";
      expect(getSecret("CACHED")).toBe("v1");
    });

    it("invalidateSecret force une re-lecture", () => {
      process.env.ROTATABLE = "old";
      expect(getSecret("ROTATABLE")).toBe("old");
      process.env.ROTATABLE = "new";
      invalidateSecret("ROTATABLE");
      expect(getSecret("ROTATABLE")).toBe("new");
    });

    it("resetSecretCache vide tout le cache", () => {
      process.env.A = "a1";
      process.env.B = "b1";
      getSecret("A");
      getSecret("B");
      process.env.A = "a2";
      process.env.B = "b2";
      resetSecretCache();
      expect(getSecret("A")).toBe("a2");
      expect(getSecret("B")).toBe("b2");
    });
  });

  describe("setSecretResolver — surcharge", () => {
    it("permet un resolver custom synchrone", () => {
      setSecretResolver((name) => `mocked:${name}`);
      expect(getSecret("ANY")).toBe("mocked:ANY");
    });

    it("permet un resolver async (1er appel undefined, 2e appel valeur)", async () => {
      setSecretResolver(async (name) => `async:${name}`);
      // 1er appel sync : retourne undefined (resolution en background)
      expect(getSecret("FOO")).toBeUndefined();
      // 2e appel via getSecretAsync : attend la resolution
      const v = await getSecretAsync("FOO");
      expect(v).toBe("async:FOO");
    });

    it("getSecretAsync attend la resolution", async () => {
      setSecretResolver(
        (name) =>
          new Promise((resolve) =>
            setTimeout(() => resolve(`delayed:${name}`), 10),
          ),
      );
      expect(await getSecretAsync("DELAYED")).toBe("delayed:DELAYED");
    });

    it("required + resolver async pending => throw au 1er appel sync", () => {
      setSecretResolver(async () => "ok");
      expect(() =>
        getSecret("ASYNC_REQUIRED", { required: true }),
      ).toThrow(/secret_pending_async/);
    });
  });

  describe("hasSecret", () => {
    it("true si valeur non-vide", () => {
      process.env.PRESENT = "value";
      expect(hasSecret("PRESENT")).toBe(true);
    });

    it("false si absent", () => {
      delete process.env.ABSENT;
      expect(hasSecret("ABSENT")).toBe(false);
    });

    it("false si chaine vide", () => {
      process.env.EMPTY = "";
      expect(hasSecret("EMPTY")).toBe(false);
    });
  });

  describe("isolation tests", () => {
    it("__resetForTests restaure le resolver par defaut", () => {
      setSecretResolver(() => "custom");
      __resetForTests();
      process.env.NORMAL = "back-to-env";
      expect(getSecret("NORMAL")).toBe("back-to-env");
    });
  });
});
