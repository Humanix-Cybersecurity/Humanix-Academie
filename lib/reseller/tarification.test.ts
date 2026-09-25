// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  GRILLE_REVENDEUR,
  calculerRevendeur,
  decouperEnTranches,
  simulerRevendeur,
  ttcDepuisHt,
} from "./tarification";

const espaces = (tailles: number[]) =>
  tailles.map((n, i) => ({ nom: `Client ${i + 1}`, utilisateursActifs: n }));

describe("decouperEnTranches", () => {
  it("remplit les tranches dans l'ordre, sans effet de seuil", () => {
    expect(decouperEnTranches(0)).toEqual([]);
    expect(decouperEnTranches(100).map((t) => t.quantite)).toEqual([100]);
    expect(decouperEnTranches(101).map((t) => t.quantite)).toEqual([100, 1]);
    expect(decouperEnTranches(1000).map((t) => t.quantite)).toEqual([
      100, 400, 500,
    ]);
    expect(decouperEnTranches(2500).map((t) => t.quantite)).toEqual([
      100, 400, 1500, 500,
    ]);
  });
});

describe("calculerRevendeur", () => {
  it("facture la licence seule sans espace client", () => {
    const c = calculerRevendeur([]);
    expect(c.utilisateursFacturables).toBe(0);
    expect(c.lignes).toHaveLength(1);
    expect(c.totalHtCentimes).toBe(GRILLE_REVENDEUR.licenceMensuelleHtCentimes);
    expect(c.prixMoyenParUtilisateurCentimes).toBeNull();
  });

  it("applique le plancher par espace", () => {
    const c = calculerRevendeur(espaces([2, 8, 30]));
    expect(c.espaces.map((e) => e.utilisateursFactures)).toEqual([8, 8, 30]);
    expect(c.utilisateursFacturables).toBe(46);
  });

  it("retrouve les exemples de la grille (HT par mois)", () => {
    // 30 utilisateurs sur 3 espaces de 10 : licence 40 + 30 x 1,80
    expect(calculerRevendeur(espaces([10, 10, 10])).totalHtCentimes).toBe(9400);
    // 100 : 40 + 100 x 1,80
    expect(calculerRevendeur(espaces([100])).totalHtCentimes).toBe(22000);
    // 300 : 40 + 100 x 1,80 + 200 x 1,50
    expect(calculerRevendeur(espaces([300])).totalHtCentimes).toBe(52000);
    // 1 000 : 40 + 180 + 600 + 500 x 1,20
    expect(calculerRevendeur(espaces([1000])).totalHtCentimes).toBe(142000);
  });

  it("le montant ne baisse jamais quand le volume monte", () => {
    let precedent = 0;
    for (let n = 0; n <= 2600; n += 7) {
      const total = calculerRevendeur(espaces([n])).totalHtCentimes;
      expect(total).toBeGreaterThanOrEqual(precedent);
      precedent = total;
    }
  });

  it("produit une ligne par tranche utilisee, avec la periode", () => {
    const c = calculerRevendeur(espaces([120]), { periode: "septembre 2026" });
    expect(c.lignes.map((l) => l.designation)).toEqual([
      "Licence revendeur (septembre 2026)",
      "Utilisateurs actifs, tranche 1 à 100 (septembre 2026)",
      "Utilisateurs actifs, tranche 101 à 500 (septembre 2026)",
    ]);
    expect(c.lignes[2]).toMatchObject({
      quantite: 20,
      prixUnitaireHtCentimes: 150,
      totalHtCentimes: 3000,
    });
  });

  it("ignore les valeurs negatives ou non entieres", () => {
    const c = calculerRevendeur(espaces([-5, 12.9]));
    expect(c.espaces.map((e) => e.utilisateursFactures)).toEqual([8, 12]);
  });
});

describe("simulerRevendeur", () => {
  it("construit n espaces identiques", () => {
    const c = simulerRevendeur({ nbEspaces: 4, utilisateursParEspace: 25 });
    expect(c.espaces).toHaveLength(4);
    expect(c.utilisateursFacturables).toBe(100);
    expect(c.totalHtCentimes).toBe(22000);
    expect(c.prixMoyenParUtilisateurCentimes).toBe(220);
  });
});

describe("ttcDepuisHt", () => {
  it("est exact au centime pour la grille au taux francais", () => {
    for (const ht of [4000, 180, 150, 120, 90]) {
      const ttc = ttcDepuisHt(ht, 2000);
      expect(Math.round((ttc * 10000) / 12000)).toBe(ht);
    }
    expect(ttcDepuisHt(180, 2000)).toBe(216);
    expect(ttcDepuisHt(180, 0)).toBe(180);
  });
});
