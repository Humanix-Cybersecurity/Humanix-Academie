// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { resumerCampagne } from "./resume-campagne";

const d = (j: number) => new Date(2026, 0, j);

describe("resumerCampagne", () => {
  it("ne divise pas par zero sur une campagne vide", () => {
    // Sans garde, reportRate vaudrait NaN et traverserait le webhook jusqu'au
    // Slack de l'admin sous la forme « NaN % ».
    expect(resumerCampagne([])).toEqual({
      sentTo: 0,
      clicked: 0,
      reported: 0,
      reportRate: 0,
    });
  });

  it("compte un signalement SANS clic", () => {
    const r = resumerCampagne([{ clickedAt: null, reportedAt: d(2) }]);
    expect(r).toEqual({ sentTo: 1, clicked: 0, reported: 1, reportRate: 1 });
  });

  it("compte un utilisateur qui CLIQUE PUIS SIGNALE dans les DEUX", () => {
    // LE cas qui justifie ce module. Le schema stocke le plus haut etat du
    // funnel, donc cet utilisateur a `status = CLICKED` : compter
    // `status === "REPORTED"` l'aurait rate, et sous-estime le taux de
    // signalement -- d'autant plus que la campagne aurait mieux marche.
    const r = resumerCampagne([{ clickedAt: d(1), reportedAt: d(2) }]);
    expect(r.clicked).toBe(1);
    expect(r.reported).toBe(1);
    expect(r.reportRate).toBe(1);
  });

  it("calcule un taux sur un echantillon melange", () => {
    const r = resumerCampagne([
      { clickedAt: d(1), reportedAt: d(2) }, // mord puis signale
      { clickedAt: d(1), reportedAt: null }, // mord et ne signale pas
      { clickedAt: null, reportedAt: d(3) }, // signale sans mordre
      { clickedAt: null, reportedAt: null }, // ne fait rien
    ]);
    expect(r).toEqual({
      sentTo: 4,
      clicked: 2,
      reported: 2,
      reportRate: 0.5,
    });
  });
});
