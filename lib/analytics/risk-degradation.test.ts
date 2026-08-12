// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  doitEmettre,
  estDegrade,
  FENETRE_JOURS,
  SEUIL_DEGRADATION,
} from "./risk-degradation";

describe("estDegrade", () => {
  it("detecte une baisse superieure au seuil", () => {
    expect(estDegrade({ actuel: 64, reference: 72 })).toBe(true);
  });

  it("detecte une baisse EXACTEMENT egale au seuil", () => {
    // Le seuil est inclusif : "baisse de >= 5 points". Une baisse de
    // pile 5 doit alerter, sinon la moitie des cas limites passe muette.
    expect(estDegrade({ actuel: 67, reference: 72 })).toBe(true);
  });

  it("ignore une baisse inferieure au seuil", () => {
    expect(estDegrade({ actuel: 68, reference: 72 })).toBe(false);
  });

  it("ignore une amelioration", () => {
    expect(estDegrade({ actuel: 80, reference: 72 })).toBe(false);
  });

  it("ignore un tenant sans historique", () => {
    // Un tenant cree il y a trois jours n'a pas "baisse" : il n'a pas de
    // passe. Sans ce garde-fou, chaque creation de tenant declencherait
    // une alerte de degradation.
    expect(estDegrade({ actuel: 10, reference: null })).toBe(false);
  });
});

describe("doitEmettre", () => {
  const degrade = { actuel: 64, reference: 72 };
  const sain = { actuel: 71, reference: 72 };

  it("emet a la transition sain -> degrade", () => {
    const r = doitEmettre({ aujourdhui: degrade, hier: sain });
    expect(r).toEqual({ scorePrecedent: 72, scoreActuel: 64, delta: -8 });
  });

  it("N'EMET PAS si la degradation durait deja hier", () => {
    // C'est le coeur du module. Le cron tourne chaque jour et la fenetre
    // glisse : sans cette regle, un incident unique produirait jusqu'a
    // sept notifications identiques.
    expect(doitEmettre({ aujourdhui: degrade, hier: degrade })).toBeNull();
  });

  it("emet a la premiere detection possible (aucun historique la veille)", () => {
    // `hier: null` = la veille n'avait pas encore de point de comparaison.
    // Ce n'est PAS une degradation en cours : il faut donc emettre.
    expect(doitEmettre({ aujourdhui: degrade, hier: null })).not.toBeNull();
  });

  it("n'emet rien quand le score est sain", () => {
    expect(doitEmettre({ aujourdhui: sain, hier: sain })).toBeNull();
  });

  it("reemet apres un retour a la normale puis une rechute", () => {
    // sain hier -> degrade aujourd'hui : c'est un NOUVEL incident, meme
    // si un incident avait eu lieu la semaine precedente.
    expect(doitEmettre({ aujourdhui: degrade, hier: sain })).not.toBeNull();
  });

  it("arrondit les scores au dixieme", () => {
    const r = doitEmettre({
      aujourdhui: { actuel: 63.456, reference: 71.987 },
      hier: sain,
    });
    expect(r).toEqual({ scorePrecedent: 72, scoreActuel: 63.5, delta: -8.5 });
  });

  it("ne produit jamais un delta positif", () => {
    // Invariant : si on emet, c'est que ca a baisse.
    for (const actuel of [10, 30, 50, 66.9]) {
      const r = doitEmettre({
        aujourdhui: { actuel, reference: 72 },
        hier: sain,
      });
      if (r) expect(r.delta).toBeLessThanOrEqual(-SEUIL_DEGRADATION);
    }
  });
});

describe("constantes", () => {
  it("expose le seuil et la fenetre plutot que de les enfouir", () => {
    // Elles sont reprises dans le message du webhook et dans la doc :
    // si quelqu'un change le seuil, le texte envoye doit suivre.
    expect(SEUIL_DEGRADATION).toBe(5);
    expect(FENETRE_JOURS).toBe(7);
  });
});
