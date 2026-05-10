// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { buildToneAddendum } from "./context";

// Note : buildEnrichedContext fait des appels DB Prisma — c'est un test
// d'integration qui necessite un setup testcontainers. On le laisse pour
// le sprint P1 post-launch. Ici on couvre uniquement buildToneAddendum
// qui est PUR (pas d'I/O).

describe("buildToneAddendum", () => {
  it("retourne '' si aucune info de contexte", () => {
    expect(buildToneAddendum({})).toBe("");
  });

  it("liste les 3 derniers modules quand recentModules est fourni", () => {
    const out = buildToneAddendum({
      recentModules: ["phishing/01", "rgpd/02", "mots-de-passe/03"],
    });
    expect(out).toContain("# État de progression de l'humain");
    expect(out).toContain("phishing/01");
    expect(out).toContain("rgpd/02");
    expect(out).toContain("mots-de-passe/03");
  });

  it("limite la liste a 3 modules meme si on en passe plus", () => {
    const out = buildToneAddendum({
      recentModules: ["a", "b", "c", "d", "e"],
    });
    expect(out).toContain("a, b, c");
    expect(out).not.toContain("d");
    expect(out).not.toContain("e");
  });

  it("inclut le score moyen quand fourni", () => {
    const out = buildToneAddendum({ recentAvgQuizPct: 73 });
    expect(out).toContain("73");
    expect(out).toContain("%");
  });

  it("toneHint=encouragement -> mode encourageant explicite", () => {
    const out = buildToneAddendum({ toneHint: "encouragement" });
    expect(out).toContain("encourageant");
    expect(out).toContain("phase d'apprentissage");
    expect(out).toContain("valorise les progrès");
  });

  it("toneHint=challenge -> mode challenge progressif", () => {
    const out = buildToneAddendum({ toneHint: "challenge" });
    expect(out).toContain("challenge");
    expect(out).toContain("avancés");
  });

  it("toneHint=neutral -> aucune instruction de ton", () => {
    const out = buildToneAddendum({ toneHint: "neutral" });
    // Pas de bloc "encourageant" ou "challenge progressif"
    expect(out).not.toContain("phase d'apprentissage");
    expect(out).not.toContain("challenge progressif");
  });

  it("combine modules + score + toneHint coherent", () => {
    const out = buildToneAddendum({
      recentModules: ["phishing/01"],
      recentAvgQuizPct: 35,
      toneHint: "encouragement",
    });
    expect(out).toContain("phishing/01");
    expect(out).toContain("35");
    expect(out).toContain("encourageant");
  });

  it("retourne '' si toutes les valeurs sont vides/undefined", () => {
    expect(
      buildToneAddendum({
        recentModules: [],
        recentAvgQuizPct: null,
        toneHint: "neutral",
      }),
    ).toBe("");
  });

  it("commence le bloc par '\\n\\n# État de progression'", () => {
    const out = buildToneAddendum({ recentAvgQuizPct: 50 });
    expect(out.startsWith("\n\n# État de progression")).toBe(true);
  });
});
