// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, pruneRateLimitBuckets } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // On part d'un temps fixe pour rendre les fenetres deterministes.
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));
    // Purge l'etat residuel d'un test precedent (le store est module-level).
    pruneRateLimitBuckets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("autorise les requetes sous la limite", () => {
    const key = "test-under:a";
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
  });

  it("bloque au-dela de la limite avec un retryAfter positif", () => {
    const key = "test-over:a";
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const res = checkRateLimit(key, 2, 60_000);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.retryAfter).toBeGreaterThan(0);
      expect(res.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it("reouvre la fenetre une fois le delai ecoule", () => {
    const key = "test-window:a";
    checkRateLimit(key, 1, 10_000);
    expect(checkRateLimit(key, 1, 10_000).ok).toBe(false);
    vi.advanceTimersByTime(10_001);
    expect(checkRateLimit(key, 1, 10_000).ok).toBe(true);
  });

  it("isole les buckets par cle", () => {
    checkRateLimit("iso:a", 1, 60_000);
    // Cle differente -> compteur independant.
    expect(checkRateLimit("iso:b", 1, 60_000).ok).toBe(true);
  });

  it("purge automatiquement les buckets expires (pas de fuite memoire)", () => {
    // Cree un bucket a fenetre courte, puis attend qu'il expire.
    checkRateLimit("prune:old", 5, 1_000);
    // Avance au-dela de la fenetre du bucket ET de l'intervalle de prune amorti
    // (5 min) pour declencher le nettoyage opportuniste au prochain check.
    vi.advanceTimersByTime(6 * 60_000);
    // Ce check declenche le prune amorti : le bucket "prune:old" expire doit
    // avoir ete retire. On le verifie via pruneRateLimitBuckets qui retourne 0
    // (plus rien a purger car deja fait par le check).
    checkRateLimit("prune:fresh", 5, 60_000);
    expect(pruneRateLimitBuckets()).toBe(0);
  });
});
