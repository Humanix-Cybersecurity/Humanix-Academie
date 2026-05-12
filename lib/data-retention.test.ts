// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  isValidRetentionDays,
  cutoffFromRetention,
  isAnonymizedEmail,
  RETENTION_MIN_DAYS,
  RETENTION_MAX_DAYS,
  RETENTION_RECOMMENDED_DAYS,
} from "./data-retention";

// Note : previewPurge() et executePurge() font des appels DB Prisma —
// testes en integration post-launch via testcontainers. Ici on couvre
// la validation et les helpers de calcul, qui sont des fonctions pures
// et 100% testables sans I/O. Couverture RGPD critique.

describe("RETENTION constants", () => {
  it("RETENTION_MIN_DAYS est 30 (1 mois minimum)", () => {
    expect(RETENTION_MIN_DAYS).toBe(30);
  });
  it("RETENTION_MAX_DAYS est 3650 (10 ans, plafond fiscal)", () => {
    expect(RETENTION_MAX_DAYS).toBe(3650);
  });
  it("RETENTION_RECOMMENDED_DAYS est 730 (2 ans, formation cyber B2B)", () => {
    expect(RETENTION_RECOMMENDED_DAYS).toBe(730);
  });
  it("MIN < RECOMMENDED < MAX (ordre coherent)", () => {
    expect(RETENTION_MIN_DAYS).toBeLessThan(RETENTION_RECOMMENDED_DAYS);
    expect(RETENTION_RECOMMENDED_DAYS).toBeLessThan(RETENTION_MAX_DAYS);
  });
});

describe("isValidRetentionDays", () => {
  it("true pour les valeurs limites incluses", () => {
    expect(isValidRetentionDays(RETENTION_MIN_DAYS)).toBe(true);
    expect(isValidRetentionDays(RETENTION_MAX_DAYS)).toBe(true);
  });

  it("true pour la valeur recommandee", () => {
    expect(isValidRetentionDays(RETENTION_RECOMMENDED_DAYS)).toBe(true);
  });

  it("false en dessous du minimum (anti-purge brutale)", () => {
    expect(isValidRetentionDays(29)).toBe(false);
    expect(isValidRetentionDays(0)).toBe(false);
    expect(isValidRetentionDays(-30)).toBe(false);
  });

  it("false au-dessus du maximum (plafond fiscal 10 ans)", () => {
    expect(isValidRetentionDays(3651)).toBe(false);
    expect(isValidRetentionDays(10_000)).toBe(false);
  });

  it("false pour les non-entiers (donnees structurees)", () => {
    expect(isValidRetentionDays(30.5)).toBe(false);
    expect(isValidRetentionDays(Math.PI)).toBe(false);
  });

  it("false pour NaN / Infinity (injection)", () => {
    expect(isValidRetentionDays(NaN)).toBe(false);
    expect(isValidRetentionDays(Infinity)).toBe(false);
    expect(isValidRetentionDays(-Infinity)).toBe(false);
  });
});

describe("cutoffFromRetention", () => {
  it("retire `days` jours a la date passee", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const cutoff = cutoffFromRetention(30, now);
    expect(cutoff.getUTCFullYear()).toBe(2026);
    expect(cutoff.getUTCMonth()).toBe(3); // avril (0-indexed)
    expect(cutoff.getUTCDate()).toBe(10);
  });

  it("calcule 730j (2 ans) correctement en traversant les annees", () => {
    const now = new Date("2026-05-10T00:00:00Z");
    const cutoff = cutoffFromRetention(730, now);
    expect(cutoff.getUTCFullYear()).toBe(2024);
    expect(cutoff.getUTCMonth()).toBe(4); // mai
    // 730 = exactement 2 ans pour cette fenetre. Le 29 fevrier 2024 etait
    // AVANT le 10 mai 2024 (notre anchor de retour), donc PAS dans la
    // fenetre [2024-05-10 ; 2026-05-10]. Donc 365 + 365 = 730 pile.
    // (L'ancien commentaire "730 = ~2 ans + 1j" etait une erreur de
    // raisonnement sur la position de Feb 29 dans la fenetre.)
    expect(cutoff.getUTCDate()).toBe(10);
  });

  it("preserve l'heure (pas de truncation a minuit)", () => {
    const now = new Date("2026-05-10T15:42:33.123Z");
    const cutoff = cutoffFromRetention(7, now);
    expect(cutoff.getUTCHours()).toBe(15);
    expect(cutoff.getUTCMinutes()).toBe(42);
    expect(cutoff.getUTCSeconds()).toBe(33);
    expect(cutoff.getUTCMilliseconds()).toBe(123);
  });

  it("days=0 retourne la meme date", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const cutoff = cutoffFromRetention(0, now);
    expect(cutoff.toISOString()).toBe(now.toISOString());
  });

  it("ne mute PAS la date passee en argument (immutabilite)", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const before = now.toISOString();
    cutoffFromRetention(100, now);
    expect(now.toISOString()).toBe(before);
  });

  it("travaille en UTC (anti-DST drift)", () => {
    // Test avec une date proche du DST (mars/octobre)
    const now = new Date("2026-03-30T12:00:00Z");
    const cutoff = cutoffFromRetention(1, now);
    // 24h exactes en UTC, pas 23 ou 25h
    const deltaMs = now.getTime() - cutoff.getTime();
    expect(deltaMs).toBe(24 * 60 * 60 * 1000);
  });
});

describe("isAnonymizedEmail", () => {
  it("true pour les emails @anonymized.local", () => {
    expect(isAnonymizedEmail("user-123@anonymized.local")).toBe(true);
    expect(isAnonymizedEmail("anything@anonymized.local")).toBe(true);
  });

  it("false pour les emails normaux", () => {
    expect(isAnonymizedEmail("alice@example.com")).toBe(false);
    expect(isAnonymizedEmail("bob@humanix-cybersecurity.fr")).toBe(false);
  });

  it("false pour des emails qui contiennent 'anonymized.local' mais pas en suffixe", () => {
    expect(isAnonymizedEmail("anonymized.local@evil.example")).toBe(false);
    expect(isAnonymizedEmail("anonymized.local.notreally@example.com")).toBe(false);
  });

  it("case-sensitive (le suffixe DOIT etre lowercase)", () => {
    expect(isAnonymizedEmail("user@ANONYMIZED.LOCAL")).toBe(false);
    expect(isAnonymizedEmail("user@Anonymized.Local")).toBe(false);
  });

  it("false pour chaine vide", () => {
    expect(isAnonymizedEmail("")).toBe(false);
  });
});
