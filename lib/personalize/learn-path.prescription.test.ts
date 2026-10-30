// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { classifySaisonForUser, compareSaisonsForUser } from "./learn-path";

const base = {
  persona: "beginner" as const,
  completedCount: 0,
  avgQuizScorePct: 0,
};

describe("classifySaisonForUser avec prescription par groupe", () => {
  it("une saison prescrite au groupe de la personne est recommandee, avec sa raison", () => {
    const c = classifySaisonForUser({
      ...base,
      saisonSlug: "fraude-president",
      isMandatory: false,
      isPrescribed: true,
    });
    expect(c.bucket).toBe("recommended");
    expect(c.prescribed).toBe(true);
    expect(c.reason).toContain("prescrite");
  });

  it("obligatoire l'emporte sur prescrite", () => {
    const c = classifySaisonForUser({
      ...base,
      saisonSlug: "fraude-president",
      isMandatory: true,
      isPrescribed: true,
    });
    expect(c.bucket).toBe("mandatory");
    expect(c.prescribed).toBe(true);
  });

  it("sans prescription, rien ne change pour une saison hors persona", () => {
    const c = classifySaisonForUser({
      ...base,
      saisonSlug: "une-saison-quelconque",
      isMandatory: false,
    });
    expect(c.bucket).toBe("explore");
    expect(c.prescribed).toBe(false);
  });
});

describe("compareSaisonsForUser avec prescription", () => {
  const saison = (slug: string, order: number, isPrescribed: boolean) => ({
    slug,
    effectiveOrder: order,
    classification: classifySaisonForUser({
      ...base,
      saisonSlug: slug,
      isMandatory: false,
      isPrescribed,
    }),
  });

  it("dans les recommandees, les prescrites passent avant les suggestions par persona", () => {
    // "mots-de-passe" est en tete des priorites du persona debutant ;
    // une saison prescrite au groupe passe quand meme devant.
    const liste = [
      saison("mots-de-passe", 1, false),
      saison("secteur-btp", 40, true),
      saison("cyber-dev", 30, true),
    ].sort(compareSaisonsForUser);
    expect(liste.map((s) => s.slug)).toEqual([
      "cyber-dev",
      "secteur-btp",
      "mots-de-passe",
    ]);
  });

  it("les prescrites se classent entre elles par ordre canonique", () => {
    const liste = [saison("b", 20, true), saison("a", 10, true)].sort(
      compareSaisonsForUser,
    );
    expect(liste.map((s) => s.slug)).toEqual(["a", "b"]);
  });
});
