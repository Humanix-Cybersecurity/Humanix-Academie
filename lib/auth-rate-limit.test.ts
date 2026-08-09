// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  hashEmailKey,
  checkMagicLinkRateLimit,
  checkPasswordRateLimit,
} from "./auth-rate-limit";
import { pruneRateLimitBuckets } from "./rate-limit";

// NB : le store de buckets est module-level et partage entre les tests du
// fichier (le prune du beforeEach ne retire que les buckets EXPIRES). Chaque
// test utilise donc des IPs/emails qui lui sont propres.
describe("auth-rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // On part d'un temps fixe pour rendre les fenetres deterministes.
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));
    pruneRateLimitBuckets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("hashEmailKey", () => {
    it("normalise casse et espaces (meme cle)", () => {
      expect(hashEmailKey("  Alice@Example.COM ")).toBe(
        hashEmailKey("alice@example.com"),
      );
    });

    it("est zero-PII : 32 hex, sans l'email en clair", () => {
      const k = hashEmailKey("bob@example.com");
      expect(k).toMatch(/^[0-9a-f]{32}$/);
      expect(k).not.toContain("bob");
    });

    it("distingue deux emails differents", () => {
      expect(hashEmailKey("a@x.fr")).not.toBe(hashEmailKey("b@x.fr"));
    });
  });

  describe("checkMagicLinkRateLimit", () => {
    it("autorise 5 envois par email puis bloque le 6e (bombing cible)", () => {
      // IPs toutes differentes pour isoler le frein email du frein IP.
      for (let i = 0; i < 5; i++) {
        expect(
          checkMagicLinkRateLimit(`10.0.0.${i}`, "victime@example.com"),
        ).toBe(true);
      }
      expect(checkMagicLinkRateLimit("10.0.0.99", "victime@example.com")).toBe(
        false,
      );
    });

    it("autorise 15 envois par IP puis bloque le 16e (emails varies)", () => {
      for (let i = 0; i < 15; i++) {
        expect(
          checkMagicLinkRateLimit("203.0.113.7", `u${i}@spray.example`),
        ).toBe(true);
      }
      expect(checkMagicLinkRateLimit("203.0.113.7", "u99@spray.example")).toBe(
        false,
      );
    });

    it("reouvre apres la fenetre d'une heure", () => {
      for (let i = 0; i < 5; i++) {
        checkMagicLinkRateLimit(`10.1.0.${i}`, "retry@example.com");
      }
      expect(checkMagicLinkRateLimit("10.1.0.99", "retry@example.com")).toBe(
        false,
      );
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);
      expect(checkMagicLinkRateLimit("10.1.0.99", "retry@example.com")).toBe(
        true,
      );
    });

    it("groupe les requetes sans IP dans un bucket partage « unknown »", () => {
      for (let i = 0; i < 15; i++) {
        checkMagicLinkRateLimit(null, `anon${i}@example.com`);
      }
      expect(checkMagicLinkRateLimit(null, "anon99@example.com")).toBe(false);
    });
  });

  describe("checkPasswordRateLimit", () => {
    it("autorise 10 tentatives par email puis bloque la 11e", () => {
      for (let i = 0; i < 10; i++) {
        expect(checkPasswordRateLimit(`10.2.0.${i}`, "cible@example.com")).toBe(
          true,
        );
      }
      expect(checkPasswordRateLimit("10.2.0.99", "cible@example.com")).toBe(
        false,
      );
    });

    it("bloque le spray : 20 tentatives par IP sur des comptes varies", () => {
      for (let i = 0; i < 20; i++) {
        expect(
          checkPasswordRateLimit("198.51.100.4", `c${i}@corp.example`),
        ).toBe(true);
      }
      expect(checkPasswordRateLimit("198.51.100.4", "c99@corp.example")).toBe(
        false,
      );
    });

    it("reouvre apres la fenetre de 15 minutes", () => {
      for (let i = 0; i < 10; i++) {
        checkPasswordRateLimit(`10.3.0.${i}`, "relock@example.com");
      }
      expect(checkPasswordRateLimit("10.3.0.99", "relock@example.com")).toBe(
        false,
      );
      vi.advanceTimersByTime(15 * 60 * 1000 + 1);
      expect(checkPasswordRateLimit("10.3.0.99", "relock@example.com")).toBe(
        true,
      );
    });

    it("garde les freins magic-link et password independants", () => {
      for (let i = 0; i < 10; i++) {
        checkPasswordRateLimit(`10.4.0.${i}`, "both@example.com");
      }
      expect(checkPasswordRateLimit("10.4.0.99", "both@example.com")).toBe(
        false,
      );
      // Prefixes de cles distincts : le magic link reste disponible.
      expect(checkMagicLinkRateLimit("10.4.0.99", "both@example.com")).toBe(
        true,
      );
    });
  });
});
