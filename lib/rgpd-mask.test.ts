// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { maskEmail, maskName } from "./rgpd-mask";

describe("maskEmail", () => {
  it("masque un email standard pro", () => {
    expect(maskEmail("florian@humanix-cybersecurity.fr")).toBe(
      "fl***n@h***ity.fr",
    );
  });

  it("masque un email avec point dans le local-part", () => {
    expect(maskEmail("florian.durano@gmail.com")).toBe("fl***o@g***ail.com");
  });

  it("normalise en lowercase + trim", () => {
    expect(maskEmail("  FLORIAN@HUMANIX.FR  ")).toBe("fl***n@h***nix.fr");
  });

  it("gere les emails tres courts gracieusement", () => {
    // a@b.co : local "a" (1 char) + domain "b" (1 char) tous deux gardes
    // tels quels (rien a masquer sur 1 char, ca produirait juste du bruit
    // "a***a" plus long que l'original). Le format reste lisible et le
    // TLD est preserve.
    expect(maskEmail("a@b.co")).toBe("a@b.co");
  });

  it("retourne *** sur email sans @", () => {
    expect(maskEmail("not-an-email")).toBe("***");
  });

  it("retourne '' sur null / undefined / vide", () => {
    expect(maskEmail(null)).toBe("");
    expect(maskEmail(undefined)).toBe("");
    expect(maskEmail("")).toBe("");
  });

  it("garde le TLD lisible (utile pour identifier .com / .fr / .org)", () => {
    // Le TLD du DERNIER niveau est preserve (.fr, .com, .org). Les ccTLDs
    // composites (.gouv.fr, .co.uk) sont consideres comme du nom de domaine
    // et masques. Acceptable pour notre usage : on identifie quand meme le
    // pays via .fr final.
    expect(maskEmail("contact@academie.gouv.fr")).toMatch(/\.fr$/);
    expect(maskEmail("admin@example.com")).toMatch(/\.com$/);
    expect(maskEmail("user@noreply.org")).toMatch(/\.org$/);
  });

  it("masque suffisamment pour ne pas reconstituer l'email", () => {
    const original = "florian.durano@humanix-cybersecurity.fr";
    const masked = maskEmail(original);
    expect(masked).not.toBe(original);
    expect(masked).not.toContain("durano");
    expect(masked).not.toContain("cybersecurity");
    expect(masked.length).toBeLessThan(original.length);
  });
});

describe("maskName", () => {
  it("masque un prenom + nom standard", () => {
    expect(maskName("Florian Durano")).toBe("F***n D***o");
  });

  it("masque un seul prenom", () => {
    expect(maskName("Marie")).toBe("M***e");
  });

  it("gere les prenoms tres courts", () => {
    expect(maskName("Li")).toBe("L***i");
  });

  it("gere les noms composes par espaces", () => {
    expect(maskName("Jean Pierre Dupont")).toBe("J***n P***e D***t");
  });

  it("trim + collapse espaces multiples", () => {
    expect(maskName("  Florian   Durano  ")).toBe("F***n D***o");
  });

  it("retourne '' sur null / undefined / vide / whitespace seul", () => {
    expect(maskName(null)).toBe("");
    expect(maskName(undefined)).toBe("");
    expect(maskName("")).toBe("");
    expect(maskName("   ")).toBe("");
  });
});
