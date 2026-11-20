// SPDX-License-Identifier: AGPL-3.0-or-later
// Les deux ecrans qui affichent un total calcule juste avant un paiement : le
// simulateur de /tarifs et le configurateur Pro de /admin/billing.
//
// Jusqu'au 2026-11-20, le premier ecrivait « HT » sous un prix que les CGV
// disent TTC, et le second annoncait « -10 % » avec un total « HT ». Meme
// principe que lib/prix-affiche-preleve.test.ts, un cran plus pres de
// l'acheteur : le total lu a l'ecran est compare au montant transmis a Mollie.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PlanUpgradeOptions from "@/components/PlanUpgradeOptions";
import PricingSimulator from "@/components/PricingSimulator";
import { mollieAmountForPlan } from "@/lib/mollie";

// Hors de Next, <Link> est remplace par une coquille.
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: (p: { href: string; children?: React.ReactNode }) =>
      React.createElement("a", { href: p.href }, p.children),
  };
});

/** Le texte que lit l'acheteur : sans balises, espaces insecables aplaties. */
function texte(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|[  ]/g, " ")
    .replace(/\s+/g, " ");
}

/** « 480.00 » (Mollie) -> « 480 », « 2400.00 » -> « 2 400 ». */
function enEurosAffiches(valeurMollie: string): string {
  const [euros, centimes] = valeurMollie.split(".");
  expect(centimes).toBe("00");
  return euros.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

describe("PricingSimulator (/tarifs)", () => {
  // Etat initial du composant : 30 collaborateurs, cycle annuel -> Pro.
  const lu = texte(renderToStaticMarkup(<PricingSimulator />));

  it("affiche des prix TTC, jamais HT", () => {
    expect(lu).toContain("/mois TTC");
    expect(lu).not.toMatch(/\bHT\b/);
  });

  it("le total annuel affiche est le montant que Mollie preleve", () => {
    const preleve = mollieAmountForPlan("pro", "annual", 30).amount.value;
    expect(lu).toContain(`Annuel : ${enEurosAffiches(preleve)} € TTC`);
  });

  it("la pastille de remise est celle du palier simule (Pro : -17 %)", () => {
    expect(lu).toContain("-17%");
    expect(lu).not.toContain("-21%");
  });
});

describe("PlanUpgradeOptions (/admin/billing)", () => {
  // Un espace Starter qui regarde l'offre Pro : 16 sieges, cycle annuel.
  const lu = texte(
    renderToStaticMarkup(
      <PlanUpgradeOptions
        currentPlan="starter"
        buyablePlans={["starter", "pro"]}
      />,
    ),
  );

  it("affiche des prix TTC, jamais HT", () => {
    expect(lu).toContain("3 €/utilisateur/mois TTC");
    expect(lu).toContain("2,50 €/siège/mois TTC");
    expect(lu).not.toMatch(/\bHT\b/);
  });

  it("annonce la remise de la grille, plus « -10 % »", () => {
    expect(lu).toContain("Annuel −17 %");
    expect(lu).not.toMatch(/[−-]\s?10\s?%/);
  });

  it("le total affiche est le montant que Mollie preleve", () => {
    const preleve = mollieAmountForPlan("pro", "annual", 16).amount.value;
    expect(lu).toContain(`Total : ${enEurosAffiches(preleve)} € TTC / an`);
  });
});
