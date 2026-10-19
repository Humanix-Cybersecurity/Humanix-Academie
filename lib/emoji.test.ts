// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { premierGrapheme } from "./emoji";

describe("premierGrapheme", () => {
  it("garde un emoji simple", () => {
    expect(premierGrapheme("💼", "🏷️")).toBe("💼");
  });

  it("garde un emoji avec selecteur de variante (3 unites UTF-16)", () => {
    expect(premierGrapheme("🏷️", "🎣")).toBe("🏷️");
  });

  it("garde une sequence ZWJ entiere, le cas du technicien de #968", () => {
    const technicien = "🧑‍🔧";
    expect(technicien.length).toBe(5);
    expect(premierGrapheme(technicien, "🏷️")).toBe(technicien);
  });

  it("ne produit jamais de demi-paire de substitution", () => {
    const resultat = premierGrapheme("🧑‍🔧", "🏷️");
    expect(resultat.isWellFormed()).toBe(true);
    expect(JSON.stringify(resultat)).not.toMatch(/\\u[dD][89abAB]/);
  });

  it("garde un drapeau et un teint de peau", () => {
    expect(premierGrapheme("🇫🇷", "🏷️")).toBe("🇫🇷");
    expect(premierGrapheme("👍🏽", "🏷️")).toBe("👍🏽");
  });

  it("ne garde que le premier caractere visible d'une saisie plus longue", () => {
    expect(premierGrapheme("🧑‍🔧 et du texte", "🏷️")).toBe("🧑‍🔧");
    expect(premierGrapheme("abc", "🏷️")).toBe("a");
  });

  it("revient au defaut quand la saisie est vide, absente ou d'un autre type", () => {
    expect(premierGrapheme("", "🏷️")).toBe("🏷️");
    expect(premierGrapheme("   ", "🏷️")).toBe("🏷️");
    expect(premierGrapheme(null, "🏷️")).toBe("🏷️");
    expect(premierGrapheme(undefined, "🎣")).toBe("🎣");
    expect(premierGrapheme(42, "🏷️")).toBe("🏷️");
  });

  it("revient au defaut sur une saisie mal formee", () => {
    expect(premierGrapheme("🧑‍🔧".slice(0, 4), "🏷️")).toBe("🏷️");
  });

  it("revient au defaut sur un grapheme absurdement long", () => {
    const zwj = "‍";
    const monstre = Array(12).fill("🧑").join(zwj);
    expect(premierGrapheme(monstre, "🏷️")).toBe("🏷️");
  });
});
