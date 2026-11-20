// SPDX-License-Identifier: AGPL-3.0-or-later
// LE PRIX AFFICHE EST LE PRIX PRELEVE.
//
// C'est l'article 4 des CGV, et ce n'etait pas vrai. Le 2026-11-20, en
// repondant a un prospect, on a compare pour la premiere fois ce que /tarifs
// affiche a ce que le paiement en ligne preleve :
//
//   - annuel Pro : 2,50 EUR par utilisateur et par mois affiches (-17 %),
//     3 EUR moins 10 % preleves. Pour 80 sieges : 2 400 EUR annonces,
//     2 592 preleves ;
//   - annuel Starter : 15 EUR par mois affiches (-21 %), 19 preleves
//     (228 EUR au lieu de 180).
//
// Les tests de lib/pricing.ts verifiaient la grille, ceux de lib/mollie.ts
// verifiaient le paiement, chacun contre ses propres chiffres : tous verts.
// Ce fichier met les deux cotes face a face. Il ne connait aucun prix : il
// exige seulement qu'ils soient les memes.

import { describe, expect, it } from "vitest";
import { recommendPlan } from "./audit-flash/scoring";
import { mollieAmountForPlan, MOLLIE_BUYABLE_PLANS } from "./mollie";
import type { PlanId } from "./plans";
import { TIERS, calculateMonthlyPrice } from "./pricing";
import { formaterPrix, remiseAnnuellePourcent } from "./prix";

const CYCLES = ["monthly", "annual"] as const;

/** Plages de sieges PAYANTES de chaque plan vendu en ligne. */
function siegesPayants(plan: PlanId): number[] {
  const tier = TIERS.find((t) => t.id === plan);
  if (!tier || tier.seats.max === null) {
    throw new Error(`plage de sieges inconnue pour ${plan}`);
  }
  const debut = Math.max(tier.seats.min, (tier.freeUnderSeats ?? 0) + 1);
  const sieges: number[] = [];
  for (let n = debut; n <= tier.seats.max; n++) sieges.push(n);
  return sieges;
}

describe("le prix affiche est le prix preleve", () => {
  for (const plan of MOLLIE_BUYABLE_PLANS) {
    for (const cycle of CYCLES) {
      it(`${plan}, ${cycle} : la grille et Mollie donnent le meme montant, siege par siege`, () => {
        const sieges = siegesPayants(plan);
        expect(sieges.length).toBeGreaterThan(0);

        for (const n of sieges) {
          // Ce que voit l'acheteur : le simulateur de /tarifs, qui lit la
          // grille. Un prix par mois, qu'il multiplie par douze en annuel.
          const affiche = calculateMonthlyPrice(n, cycle);
          expect(affiche.tier.id, `${n} sieges`).toBe(plan);
          const mois = cycle === "annual" ? 12 : 1;
          const afficheCentimes = Math.round(affiche.total * 100) * mois;

          // Ce que paie l'acheteur : le montant transmis a Mollie.
          const preleve = mollieAmountForPlan(plan, cycle, n);

          expect(preleve.amount.value, `${plan} ${cycle} ${n} sieges`).toBe(
            (afficheCentimes / 100).toFixed(2),
          );
          expect(preleve.interval).toBe(
            cycle === "annual" ? "12 months" : "1 month",
          );
        }
      });
    }
  }

  it("les libelles de la grille citent le prix que la grille calcule", () => {
    // `display` est du texte ecrit a la main dans lib/pricing.ts. C'est lui
    // que lisent /tarifs et /souscrire : il ne doit pas diverger du montant.
    for (const plan of MOLLIE_BUYABLE_PLANS) {
      const tier = TIERS.find((t) => t.id === plan);
      expect(tier).toBeDefined();
      for (const cycle of CYCLES) {
        const prix = tier!.pricing[cycle];
        expect(prix.amount).not.toBeNull();
        const attendu = `${formaterPrix(Math.round(prix.amount! * 100))} €`;
        expect(prix.display, `${plan} ${cycle}`).toContain(attendu);
      }
    }
  });

  it("la remise annoncee est la remise appliquee", () => {
    for (const plan of MOLLIE_BUYABLE_PLANS) {
      const tier = TIERS.find((t) => t.id === plan);
      const remise = remiseAnnuellePourcent(plan);
      expect(remise).not.toBeNull();
      expect(tier!.pricing.annual.saving, plan).toContain(`−${remise} %`);
    }
  });

  it("l'audit flash cite les prix de la grille, en TTC", () => {
    // Trois tailles d'entreprise menent a Starter ou a Pro ; « 250+ » est sur
    // devis et n'est pas concerne.
    const starter = recommendPlan("1-9", 80);
    expect(starter.slug).toBe("starter");
    expect(starter.monthlyPrice).toContain("19 € TTC / mois");
    expect(starter.annualEstimate).toContain("180 € TTC / an");

    const starterPme = recommendPlan("10-49", 80);
    expect(starterPme.slug).toBe("starter");
    expect(starterPme.annualEstimate).toBe("228 € TTC / an (180 € en annuel)");

    for (const pro of [
      recommendPlan("10-49", 20),
      recommendPlan("50-249", 80),
    ]) {
      expect(pro.slug).toBe("pro");
      expect(pro.monthlyPrice).toBe("3 € TTC / utilisateur / mois");
      // 16 sieges : 16 x 3 x 12 sans engagement, 16 x 2,50 x 12 en annuel.
      expect(pro.annualEstimate).toBe(
        "à partir de 576 € TTC / an (480 € en annuel, 16 sièges mini)",
      );
    }

    for (const taille of ["1-9", "10-49", "50-249"] as const) {
      for (const score of [20, 80]) {
        const plan = recommendPlan(taille, score);
        expect(`${plan.monthlyPrice} ${plan.annualEstimate}`).not.toMatch(
          /\bHT\b/,
        );
      }
    }
  });
});

describe("montants reels, a ne pas voir bouger sans le vouloir", () => {
  it("le premier client : 16 sieges Pro en mensuel, 48,00 EUR", () => {
    // Abonnement en cours depuis le 2026-08-17. Le mensuel n'a pas change.
    expect(mollieAmountForPlan("pro", "monthly", 16).amount.value).toBe(
      "48.00",
    );
  });

  it("le prospect du 2026-11-20 : 80 sieges Pro en annuel, 2 400,00 EUR", () => {
    // Le montant confirme par ecrit. Le paiement en ligne en prelevait 2 592.
    expect(mollieAmountForPlan("pro", "annual", 80).amount.value).toBe(
      "2400.00",
    );
  });
});
