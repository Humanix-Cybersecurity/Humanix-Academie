// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { validerCoordonnees } from "./coordonnees";

const OK = {
  raisonSociale: "Client Test SARL",
  adresse: "1 rue de la Paix",
  codePostal: "75002",
  ville: "Paris",
  pays: "FR",
};

describe("validerCoordonnees", () => {
  it("accepte le minimum requis", () => {
    const r = validerCoordonnees(OK);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valeur.pays).toBe("FR");
  });

  it("exige denomination, adresse, code postal et ville", () => {
    for (const champ of ["raisonSociale", "adresse", "codePostal", "ville"]) {
      const r = validerCoordonnees({ ...OK, [champ]: "" });
      expect(r.ok).toBe(false);
    }
  });

  it("nomme TOUS les champs manquants d'un coup", () => {
    const r = validerCoordonnees({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erreur).toContain("dénomination");
      expect(r.erreur).toContain("adresse");
      expect(r.erreur).toContain("ville");
    }
  });

  it("met le pays en majuscules et retombe sur FR si absent", () => {
    const r = validerCoordonnees({ ...OK, pays: "be" });
    expect(r.ok && r.valeur.pays).toBe("BE");
    const r2 = validerCoordonnees({ ...OK, pays: "" });
    expect(r2.ok && r2.valeur.pays).toBe("FR");
  });

  // LE DEFAUT QUE CE TEST A TROUVE : en tronquant a deux lettres,
  // « Allemagne » devenait « AL » -- l'Albanie. Hors UE, donc 0 % de TVA au
  // lieu du regime allemand. Une faute de frappe changeait le regime fiscal.
  it("refuse un pays qui n'est pas un code a deux lettres", () => {
    for (const saisi of ["France", "Allemagne", "Belgique", "F1", "f", "FRA"]) {
      const r = validerCoordonnees({ ...OK, pays: saisi });
      expect(r.ok, `« ${saisi} » aurait du etre refuse`).toBe(false);
    }
  });

  it("REFUSE un numero de TVA mal forme plutot que de l'ignorer", () => {
    const r = validerCoordonnees({ ...OK, tvaIntra: "PAS UN NUMERO@@" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toContain("TVA");
  });

  it("accepte un numero de TVA bien forme, espaces compris", () => {
    const r = validerCoordonnees({ ...OK, tvaIntra: "FR 80 103 901 799" });
    expect(r.ok).toBe(true);
  });

  it("vide -> null pour les champs facultatifs", () => {
    const r = validerCoordonnees({ ...OK, siren: "   ", tvaIntra: "" });
    expect(r.ok && r.valeur.siren).toBeNull();
    expect(r.ok && r.valeur.tvaIntra).toBeNull();
  });

  it("tronque au lieu de laisser passer une saisie demesuree", () => {
    const r = validerCoordonnees({ ...OK, raisonSociale: "x".repeat(500) });
    expect(r.ok && r.valeur.raisonSociale.length).toBe(200);
  });

  it("supprime les espaces de bord", () => {
    const r = validerCoordonnees({ ...OK, ville: "  Paris  " });
    expect(r.ok && r.valeur.ville).toBe("Paris");
  });
});

describe("province (BT-54)", () => {
  it("est facultative : la France n'en a pas l'usage", () => {
    const r = validerCoordonnees(OK);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valeur.province).toBeNull();
  });

  it("est conservee telle quelle quand elle est fournie", () => {
    const r = validerCoordonnees({ ...OK, pays: "CA", province: "Québec" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valeur.province).toBe("Québec");
  });

  it("une chaine vide vaut absence, pas chaine vide", () => {
    const r = validerCoordonnees({ ...OK, province: "   " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valeur.province).toBeNull();
  });

  // Un environnement ou un formulaire ne sont pas de confiance.
  it("est bornee en longueur", () => {
    const r = validerCoordonnees({ ...OK, province: "Q".repeat(500) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valeur.province).toHaveLength(100);
  });

  // Elle ne doit PAS conditionner la validite : une adresse canadienne sans
  // province reste acceptable, seulement moins precise.
  it("son absence ne rend pas les coordonnees invalides hors de France", () => {
    expect(validerCoordonnees({ ...OK, pays: "CA" }).ok).toBe(true);
  });
});
