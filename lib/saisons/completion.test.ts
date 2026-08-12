// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { saisonVientDEtreTerminee } from "./completion";

const ep = (episodeId: string, termine: boolean, score = 0) => ({
  episodeId,
  termine,
  score,
});

describe("saisonVientDEtreTerminee", () => {
  it("detecte la completion du dernier episode", () => {
    const r = saisonVientDEtreTerminee({
      episodes: [ep("a", true, 90), ep("b", true, 80), ep("c", true, 91)],
      episodeValideId: "c",
      estPremiereCompletion: true,
    });
    expect(r).toEqual({ scoreMoyen: 87, episodesTotal: 3 });
  });

  it("n'emet rien s'il reste un episode non termine", () => {
    expect(
      saisonVientDEtreTerminee({
        episodes: [ep("a", true, 90), ep("b", false), ep("c", true, 91)],
        episodeValideId: "a",
        estPremiereCompletion: true,
      }),
    ).toBeNull();
  });

  it("n'emet rien sur une saison VIDE", () => {
    // Une saison sans episode n'est pas "terminee", elle est vide.
    // `every()` sur un tableau vide vaut true : sans ce garde-fou
    // explicite, toute saison vide declencherait l'evenement.
    expect(
      saisonVientDEtreTerminee({
        episodes: [],
        episodeValideId: "a",
        estPremiereCompletion: true,
      }),
    ).toBeNull();
  });

  it("n'emet rien si l'episode valide n'appartient pas a la saison", () => {
    // Garde-fou contre un appel mal cable : sans lui, terminer un episode
    // d'une saison X pourrait declencher l'evenement pour la saison Y.
    expect(
      saisonVientDEtreTerminee({
        episodes: [ep("a", true, 90), ep("b", true, 80)],
        episodeValideId: "z",
        estPremiereCompletion: true,
      }),
    ).toBeNull();
  });

  it("N'EMET PAS quand on rejoue un episode d'une saison deja achevee", () => {
    // C'est la garantie d'unicite : 1 seul envoi par (user, saison).
    // Tous les episodes sont termines, mais ce n'est pas une PREMIERE
    // completion : l'utilisateur ameliore simplement son score.
    expect(
      saisonVientDEtreTerminee({
        episodes: [ep("a", true, 90), ep("b", true, 80)],
        episodeValideId: "a",
        estPremiereCompletion: false,
      }),
    ).toBeNull();
  });

  it("gere une saison d'un seul episode", () => {
    const r = saisonVientDEtreTerminee({
      episodes: [ep("solo", true, 73)],
      episodeValideId: "solo",
      estPremiereCompletion: true,
    });
    expect(r).toEqual({ scoreMoyen: 73, episodesTotal: 1 });
  });

  it("arrondit le score moyen a l'entier", () => {
    // 90 + 80 + 85 = 255 / 3 = 85 exactement
    expect(
      saisonVientDEtreTerminee({
        episodes: [ep("a", true, 90), ep("b", true, 80), ep("c", true, 85)],
        episodeValideId: "c",
        estPremiereCompletion: true,
      })?.scoreMoyen,
    ).toBe(85);

    // 100 + 0 = 50 pile ; 1 + 2 = 1.5 -> 2 (arrondi superieur)
    expect(
      saisonVientDEtreTerminee({
        episodes: [ep("a", true, 1), ep("b", true, 2)],
        episodeValideId: "b",
        estPremiereCompletion: true,
      })?.scoreMoyen,
    ).toBe(2);
  });

  it("ne renvoie jamais un score hors de 0-100 pour des entrees valides", () => {
    for (const scores of [
      [0, 0],
      [100, 100],
      [0, 100],
      [55, 44, 99],
    ]) {
      const episodes = scores.map((s, i) => ep(`e${i}`, true, s));
      const r = saisonVientDEtreTerminee({
        episodes,
        episodeValideId: "e0",
        estPremiereCompletion: true,
      });
      expect(r).not.toBeNull();
      expect(r!.scoreMoyen).toBeGreaterThanOrEqual(0);
      expect(r!.scoreMoyen).toBeLessThanOrEqual(100);
    }
  });
});
