// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests du catalogue boutique, en particulier le gating par badge (#748).
//
// Le risque de ce mécanisme : référencer un badge qui n'existe pas. L'item
// deviendrait alors définitivement inachetable par tout le monde, sans la
// moindre erreur — juste un item mort en vitrine. D'où l'ancrage sur le
// catalogue d'achievements.

import { describe, it, expect } from "vitest";
import { SHOP_CATALOG, BACKGROUND_GRADIENTS } from "./shop";
import { ACHIEVEMENTS_BY_SLUG } from "./achievements/catalog";

describe("catalogue boutique", () => {
  it("n'a pas de slug dupliqué", () => {
    const slugs = SHOP_CATALOG.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("donne un gradient à chaque fond", () => {
    // Un BACKGROUND sans gradient s'équipe mais ne s'affiche pas.
    const sansGradient = SHOP_CATALOG.filter(
      (i) => i.category === "BACKGROUND" && !BACKGROUND_GRADIENTS[i.slug],
    ).map((i) => i.slug);
    expect(sansGradient).toEqual([]);
  });

  it("a des prix et des niveaux cohérents", () => {
    for (const i of SHOP_CATALOG) {
      expect(i.price, i.slug).toBeGreaterThan(0);
      expect(i.minLevel, i.slug).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("gating par badge (#748)", () => {
  const gated = SHOP_CATALOG.filter((i) => i.requiredAchievementSlug);

  it("propose au moins un item conditionné par un badge", () => {
    expect(gated.length).toBeGreaterThan(0);
  });

  it("ne référence QUE des badges existants du catalogue", () => {
    // Le test qui compte : un slug inventé ou mal orthographié rendrait
    // l'item inachetable pour toujours, en silence.
    const inconnus = gated
      .map((i) => i.requiredAchievementSlug!)
      .filter((slug) => !ACHIEVEMENTS_BY_SLUG[slug]);
    expect(inconnus, "badges référencés mais absents du catalogue").toEqual([]);
  });

  it("n'empile pas badge rare ET niveau élevé", () => {
    // Deux murs cumulés = personne ne voit jamais l'item. La rareté doit
    // venir du badge, le minLevel reste bas sur ces items.
    for (const i of gated) {
      expect(i.minLevel, `${i.slug} cumule badge + niveau`).toBeLessThanOrEqual(
        3,
      );
    }
  });

  it("réserve ces items à des badges non triviaux", () => {
    // Un item « trophée » adossé à un badge commun n'a aucune valeur.
    for (const i of gated) {
      const badge = ACHIEVEMENTS_BY_SLUG[i.requiredAchievementSlug!];
      expect(["rare", "epic", "legendary"], i.slug).toContain(badge.rarity);
    }
  });
});
