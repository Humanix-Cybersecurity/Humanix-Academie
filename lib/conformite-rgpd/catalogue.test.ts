// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Le catalogue est de la DOCTRINE : il suit la loi et se relit comme du
// contenu pedagogique. Ces tests gardent ses invariants -- pas sa redaction,
// qui doit pouvoir evoluer sans casser la suite.
import { describe, it, expect } from "vitest";
import {
  CATALOGUE,
  SECTIONS,
  avancement,
  etapeParCle,
  prochaineEtape,
  type StatutEtape,
} from "./catalogue";

describe("catalogue - invariants de structure", () => {
  it("n'a aucune cle en double", () => {
    // Une cle dupliquee ferait silencieusement partager un statut a deux
    // etapes : la personne en cocherait une et en verrait deux changer.
    const cles = CATALOGUE.map((e) => e.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("ne renvoie jamais vers une section inconnue", () => {
    for (const e of CATALOGUE) expect(SECTIONS[e.section]).toBeDefined();
  });

  it("suit l'ordre des sections : etincelle, socle, recurrent", () => {
    // L'ordre n'est pas cosmetique : on n'evalue pas le risque d'un traitement
    // qu'on n'a pas recense. Un catalogue reordonne par erreur casserait le
    // sens du parcours.
    const rang = { etincelle: 0, socle: 1, recurrent: 2 };
    const rangs = CATALOGUE.map((e) => rang[e.section]);
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
  });

  it("ouvre par une question en francais, jamais par un article", () => {
    for (const e of CATALOGUE) {
      expect(e.question).not.toMatch(/article|RGPD art/i);
      expect(e.question.length).toBeGreaterThan(15);
    }
  });

  it("donne une action concrete a chaque etape", () => {
    // « Tenez votre registre » paralyse. Chaque etape doit porter un geste
    // faisable, donc un texte qui dit quoi faire.
    for (const e of CATALOGUE) expect(e.action.length).toBeGreaterThan(30);
  });

  it("accompagne tout renvoi hors perimetre d'une ressource", () => {
    // Dire « ce n'est pas nous » sans dire ou aller serait un abandon.
    for (const e of CATALOGUE) {
      if (e.verdict === "hors_perimetre") expect(e.ressource).toBeDefined();
    }
  });

  it("n'expose que des ressources en HTTPS", () => {
    for (const e of CATALOGUE) {
      if (e.ressource) expect(e.ressource.url).toMatch(/^https:\/\//);
    }
  });

  it("ne declare jamais « sans objet » une etape d'apprentissage", () => {
    // On ne coche pas « sans objet » le fait de comprendre le RGPD.
    for (const e of CATALOGUE) {
      if (e.portee === "personne") expect(e.peutEtreSansObjet).toBe(false);
    }
  });

  it("porte au moins une etape de chaque portee", () => {
    const portees = new Set(CATALOGUE.map((e) => e.portee));
    expect(portees).toEqual(new Set(["personne", "entreprise"]));
  });
});

describe("avancement", () => {
  it("compte en nombre d'etapes, jamais en pourcentage", () => {
    const a = avancement({});
    expect(a).toEqual({ traitees: 0, total: CATALOGUE.length });
  });

  it("compte « sans objet » comme traitee", () => {
    // Ecarter une question en connaissance de cause EST une reponse. La
    // compter comme un manque decouragerait la seule reponse honnete.
    const statuts: Record<string, StatutEtape> = {
      [CATALOGUE[0].cle]: "fait",
      [CATALOGUE[1].cle]: "sans_objet",
    };
    expect(avancement(statuts).traitees).toBe(2);
  });

  it("ne compte pas « en cours »", () => {
    expect(avancement({ [CATALOGUE[0].cle]: "en_cours" }).traitees).toBe(0);
  });
});

describe("prochaineEtape", () => {
  it("propose la premiere du catalogue quand rien n'est commence", () => {
    expect(prochaineEtape({})?.cle).toBe(CATALOGUE[0].cle);
  });

  it("saute ce qui est fait ou sans objet", () => {
    const statuts: Record<string, StatutEtape> = {
      [CATALOGUE[0].cle]: "fait",
      [CATALOGUE[1].cle]: "sans_objet",
    };
    expect(prochaineEtape(statuts)?.cle).toBe(CATALOGUE[2].cle);
  });

  it("ne saute pas une etape seulement commencee", () => {
    expect(prochaineEtape({ [CATALOGUE[0].cle]: "en_cours" })?.cle).toBe(
      CATALOGUE[0].cle,
    );
  });

  it("renvoie null quand tout est traite", () => {
    const tout = Object.fromEntries(
      CATALOGUE.map((e) => [e.cle, "fait" as StatutEtape]),
    );
    expect(prochaineEtape(tout)).toBeNull();
  });
});

describe("etapeParCle", () => {
  it("retrouve une etape existante", () => {
    expect(etapeParCle(CATALOGUE[0].cle)?.question).toBe(CATALOGUE[0].question);
  });

  it("renvoie undefined sur une cle inconnue", () => {
    // Une cle orpheline en base ne doit pas faire planter l'affichage : le
    // catalogue evolue, les lignes persistees survivent.
    expect(etapeParCle("cle-qui-nexiste-plus")).toBeUndefined();
  });
});
