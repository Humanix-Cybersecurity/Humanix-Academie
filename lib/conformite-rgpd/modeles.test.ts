// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Ces modeles s'ouvrent dans un Excel francais, chez quelqu'un qui n'est pas
// technicien. Un fichier qui arrive en charabia ou tout en une colonne le
// renvoie a la page blanche qu'on voulait lui epargner -- et il n'aura pas
// l'idee de blamer l'encodage, il abandonnera.
//
// D'ou des tests sur la FORME autant que sur le fond.
import { describe, it, expect } from "vitest";
import {
  MODELES_PAR_ETAPE,
  modeleRegistre,
  modeleDurees,
  modeleSousTraitants,
  modeleMentionInformation,
  modeleSuiviDemandes,
} from "./modeles";
import { CATALOGUE } from "./catalogue";

/** Decoupage CSV minimal, guillemets compris — pour verifier les colonnes. */
function decouper(ligne: string): string[] {
  const cellules: string[] = [];
  let courante = "";
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') {
        courante += '"';
        i++;
      } else dansGuillemets = !dansGuillemets;
    } else if (c === ";" && !dansGuillemets) {
      cellules.push(courante);
      courante = "";
    } else courante += c;
  }
  cellules.push(courante);
  return cellules;
}

const TOUS = [
  modeleRegistre,
  modeleDurees,
  modeleSousTraitants,
  modeleMentionInformation,
  modeleSuiviDemandes,
];

describe("modeles - ce qu'Excel exige", () => {
  it("commence par un BOM UTF-8, sinon les accents arrivent casses", () => {
    for (const f of TOUS) expect(f("Acme").contenu.charCodeAt(0)).toBe(0xfeff);
  });

  it("separe les colonnes par un POINT-VIRGULE, pas une virgule", () => {
    // Avec une virgule, un Excel francais met tout dans la colonne A.
    for (const f of [
      modeleRegistre,
      modeleDurees,
      modeleSousTraitants,
      modeleSuiviDemandes,
    ]) {
      const premiere = f("Acme").contenu.split("\r\n")[0];
      expect(premiere).toContain(";");
      expect(premiere.split(";").length).toBeGreaterThan(3);
    }
  });

  it("garde le meme nombre de colonnes sur toutes les lignes", () => {
    // C'est l'invariant qui compte pour Excel : une cellule mal echappee
    // decalerait la ligne, et le tableau deviendrait illisible sans que rien
    // ne signale l'erreur.
    for (const f of [
      modeleRegistre,
      modeleDurees,
      modeleSousTraitants,
      modeleSuiviDemandes,
    ]) {
      const lignes = f("Acme").contenu.trim().split("\r\n");
      const attendu = decouper(lignes[0]).length;
      for (const l of lignes) expect(decouper(l)).toHaveLength(attendu);
    }
  });

  it("termine chaque ligne en CRLF", () => {
    for (const f of TOUS) expect(f("Acme").contenu).toContain("\r\n");
  });
});

describe("modeles - la frontiere de ce qu'on remplit", () => {
  it("ne pre-remplit QUE la ligne qui nous concerne", () => {
    // Remplir a la place du client serait faux -- nous ne connaissons pas ses
    // traitements -- et dangereux : il signerait un document qu'il n'a pas
    // ecrit.
    const lignes = modeleRegistre("Acme").contenu.trim().split("\r\n");
    const remplies = lignes
      .slice(1)
      .filter((l) => l.split(";").filter((c) => c.trim() !== "").length > 2);
    expect(remplies).toHaveLength(1);
    expect(remplies[0]).toMatch(/Humanix/);
  });

  it("amorce les traitements courants sans les remplir", () => {
    const contenu = modeleRegistre("Acme").contenu;
    for (const attendu of ["Paie", "Recrutement", "Videosurveillance"]) {
      expect(contenu).toContain(attendu);
    }
  });

  it("laisse des trous EXPLICITES dans la mention d'information", () => {
    // Une mention pre-remplie que la personne signerait sans la lire serait
    // pire qu'aucune mention.
    const c = modeleMentionInformation("Acme").contenu;
    expect(c).toMatch(/\[.+\]/);
    expect(c).toMatch(/n'est pas un conseil juridique/i);
  });

  it("rappelle l'echeance d'un mois sur le suivi des demandes", () => {
    expect(modeleSuiviDemandes("Acme").contenu).toMatch(/ECHEANCE \(1 mois\)/);
  });
});

describe("modeles - noms de fichiers", () => {
  it("retire accents et espaces du nom d'entreprise", () => {
    const m = modeleRegistre("Éditions Créatives & Cie");
    expect(m.nomFichier).toBe(
      "registre-traitements-editions-creatives-cie.csv",
    );
  });

  it("ne produit jamais un nom vide", () => {
    // Un tenant nomme « --- » ou « 日本 » ne doit pas donner « registre-.csv ».
    for (const nom of ["---", "日本語", "   "]) {
      expect(modeleRegistre(nom).nomFichier).toBe(
        "registre-traitements-entreprise.csv",
      );
    }
  });

  it("borne la longueur", () => {
    const m = modeleRegistre("a".repeat(200));
    expect(m.nomFichier.length).toBeLessThan(80);
  });
});

describe("modeles - rattachement au parcours", () => {
  it("n'attache un modele qu'a une etape existante", () => {
    // Une cle orpheline afficherait un bouton de telechargement sous une
    // etape qui n'existe plus.
    const cles = new Set(CATALOGUE.map((e) => e.cle));
    for (const cle of Object.keys(MODELES_PAR_ETAPE)) {
      expect(cles.has(cle)).toBe(true);
    }
  });

  it("n'attache aucun modele a une etape d'apprentissage", () => {
    // On ne telecharge pas un tableur pour comprendre le RGPD.
    for (const cle of Object.keys(MODELES_PAR_ETAPE)) {
      const e = CATALOGUE.find((x) => x.cle === cle);
      expect(e?.portee).toBe("entreprise");
    }
  });

  it("produit un fichier non vide pour chaque etape attachee", () => {
    for (const [, m] of Object.entries(MODELES_PAR_ETAPE)) {
      const f = m.fabrique("Acme");
      expect(f.contenu.length).toBeGreaterThan(100);
      expect(f.nomFichier).toMatch(/\.(csv|txt)$/);
    }
  });
});
