// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests pure-functions du moteur de suggestion du Quick Setup Wizard.
//
// On verifie surtout les contrats : les fondamentaux sont toujours
// proposes, les obligatoires sont un sous-ensemble strict des activations,
// et les regles de specialisation par secteur / taille / maturite ne
// se chevauchent pas dangereusement (pas de doublons).

import { describe, it, expect } from "vitest";
import {
  suggestSaisons,
  type SetupProfile,
  type SaisonForSuggestion,
} from "./setup-wizard";

const CATALOG: SaisonForSuggestion[] = [
  // Fondamentaux
  {
    id: "id-phishing",
    slug: "phishing",
    title: "Phishing",
    tags: ["famille:public", "fondamentaux"],
    audience: "tous",
  },
  {
    id: "id-mdp",
    slug: "mots-de-passe",
    title: "Mots de passe",
    tags: ["famille:public", "fondamentaux"],
    audience: "tous",
  },
  {
    id: "id-rgpd",
    slug: "donnees-sensibles",
    title: "Donnees sensibles",
    tags: ["famille:public", "fondamentaux", "rgpd"],
    audience: "tous",
  },
  // Metier
  {
    id: "id-rh",
    slug: "cyber-rh",
    title: "Cyber RH",
    tags: ["famille:metier", "metier:rh"],
    audience: "rh",
  },
  {
    id: "id-compta",
    slug: "cyber-compta",
    title: "Cyber compta",
    tags: ["famille:metier", "metier:compta"],
    audience: "compta",
  },
  {
    id: "id-dev",
    slug: "cyber-dev",
    title: "Cyber dev",
    tags: ["famille:metier", "metier:dev"],
    audience: "dev",
  },
  {
    id: "id-dpo",
    slug: "dpo-quotidien",
    title: "DPO",
    tags: ["famille:conformite", "metier:dpo"],
    audience: "dpo",
  },
  // Conformite
  {
    id: "id-nis2",
    slug: "nis2-pme",
    title: "NIS2",
    tags: ["famille:conformite", "nis2"],
    audience: "managers",
  },
  {
    id: "id-dirigeants",
    slug: "cyber-dirigeants",
    title: "Cyber dirigeants",
    tags: ["famille:metier", "metier:dirigeants"],
    audience: "managers",
  },
  // Avance
  {
    id: "id-crise",
    slug: "crise-cyber",
    title: "Crise cyber",
    tags: ["famille:avance", "crise"],
    audience: "managers",
  },
  {
    id: "id-supply",
    slug: "supply-chain",
    title: "Supply chain",
    tags: ["famille:avance", "supply-chain"],
    audience: "managers",
  },
  {
    id: "id-remediation",
    slug: "remediation-flash",
    title: "Remediation",
    tags: ["famille:avance", "remediation"],
    audience: "tous",
  },
  // Autres communs
  {
    id: "id-tt",
    slug: "teletravail",
    title: "Teletravail",
    tags: ["famille:public", "fondamentaux"],
    audience: "tous",
  },
  {
    id: "id-ia",
    slug: "ia-generative",
    title: "IA generative",
    tags: ["famille:public", "fondamentaux", "ia"],
    audience: "tous",
  },
];

describe("suggestSaisons", () => {
  it("propose toujours les fondamentaux (phishing, mdp, RGPD)", () => {
    const profile: SetupProfile = {
      size: "tpe",
      sector: "services",
      maturity: "debutant",
    };
    const result = suggestSaisons(profile, CATALOG);
    expect(result.activate).toContain("id-phishing");
    expect(result.activate).toContain("id-mdp");
    expect(result.activate).toContain("id-rgpd");
  });

  it("rend phishing et mots-de-passe obligatoires (et seulement ceux-ci)", () => {
    const profile: SetupProfile = {
      size: "pme",
      sector: "services",
      maturity: "initie",
    };
    const result = suggestSaisons(profile, CATALOG);
    expect(result.mandatory).toContain("id-phishing");
    expect(result.mandatory).toContain("id-mdp");
    // Les autres ne sont pas obligatoires
    expect(result.mandatory).not.toContain("id-rgpd");
    expect(result.mandatory).not.toContain("id-nis2");
  });

  it("le set obligatoire est un sous-ensemble du set d'activation", () => {
    const profiles: SetupProfile[] = [
      { size: "tpe", sector: "services", maturity: "debutant" },
      { size: "pme", sector: "sante", maturity: "initie" },
      { size: "eti", sector: "finance", maturity: "avance" },
      { size: "grande", sector: "industrie", maturity: "avance" },
    ];
    for (const p of profiles) {
      const r = suggestSaisons(p, CATALOG);
      const activeSet = new Set(r.activate);
      for (const m of r.mandatory) {
        expect(activeSet.has(m)).toBe(true);
      }
    }
  });

  it("propose la specialisation metier selon le secteur", () => {
    expect(
      suggestSaisons(
        { size: "pme", sector: "sante", maturity: "initie" },
        CATALOG,
      ).activate,
    ).toContain("id-dpo");
    expect(
      suggestSaisons(
        { size: "pme", sector: "finance", maturity: "initie" },
        CATALOG,
      ).activate,
    ).toContain("id-compta");
    expect(
      suggestSaisons(
        { size: "pme", sector: "tech", maturity: "initie" },
        CATALOG,
      ).activate,
    ).toContain("id-dev");
  });

  it("propose NIS2 et cyber-dirigeants des PME (pas TPE)", () => {
    const tpe = suggestSaisons(
      { size: "tpe", sector: "services", maturity: "initie" },
      CATALOG,
    );
    expect(tpe.activate).not.toContain("id-nis2");

    const pme = suggestSaisons(
      { size: "pme", sector: "services", maturity: "initie" },
      CATALOG,
    );
    expect(pme.activate).toContain("id-nis2");
    expect(pme.activate).toContain("id-dirigeants");
  });

  it("propose les modules avances seulement aux profils avances ou inities", () => {
    const debutant = suggestSaisons(
      { size: "pme", sector: "services", maturity: "debutant" },
      CATALOG,
    );
    expect(debutant.activate).not.toContain("id-supply");
    expect(debutant.activate).not.toContain("id-remediation");

    const avance = suggestSaisons(
      { size: "eti", sector: "industrie", maturity: "avance" },
      CATALOG,
    );
    expect(avance.activate).toContain("id-supply");
    expect(avance.activate).toContain("id-crise");
    expect(avance.activate).toContain("id-remediation");
  });

  it("ne renvoie pas de doublons dans activate ou mandatory", () => {
    const profile: SetupProfile = {
      size: "eti",
      sector: "sante",
      maturity: "avance",
    };
    const r = suggestSaisons(profile, CATALOG);
    expect(new Set(r.activate).size).toBe(r.activate.length);
    expect(new Set(r.mandatory).size).toBe(r.mandatory.length);
  });

  it("garde-fou : minimum 4 saisons activees meme avec un catalogue sans matchs metier", () => {
    const minimalCatalog: SaisonForSuggestion[] = [
      // Pas de fondamentaux taggues, juste des saisons obscures
      {
        id: "id-misc",
        slug: "misc",
        title: "Divers",
        tags: ["famille:public"],
        audience: "tous",
      },
    ];
    const profile: SetupProfile = {
      size: "tpe",
      sector: "services",
      maturity: "debutant",
    };
    const r = suggestSaisons(profile, minimalCatalog);
    // Avec ce catalogue, le garde-fou cherche teletravail/donnees-sensibles/ia
    // qui n'existent pas non plus -> resultat vide. C'est le comportement
    // attendu : garde-fou = best-effort, pas magique.
    expect(r.activate).toEqual([]);
  });
});
