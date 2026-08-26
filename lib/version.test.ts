// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la lecture de revision.
//
// La propriete qui compte : une valeur douteuse rend `null`, jamais une
// chaine approximative. Deux instances comparees sur une revision fausse
// mènent a la mauvaise conclusion, et on ne s'en apercoit pas.

import { describe, it, expect } from "vitest";
import { revisionDeployee } from "./version";

const SHA = "f3b8a2d8c1e4a90b7d6f2c8e5a1b3d7f9c0e2a46";

describe("revisionDeployee", () => {
  it("lit un SHA complet et en derive la forme courte", () => {
    const r = revisionDeployee({ HUMANIX_REVISION: SHA });
    expect(r.revision).toBe(SHA);
    expect(r.courte).toBe("f3b8a2d");
  });

  it("accepte un SHA court, tel que `git rev-parse --short` le rend", () => {
    expect(revisionDeployee({ HUMANIX_REVISION: "f3b8a2d" }).courte).toBe(
      "f3b8a2d",
    );
  });

  it("normalise la casse", () => {
    expect(
      revisionDeployee({ HUMANIX_REVISION: SHA.toUpperCase() }).revision,
    ).toBe(SHA);
  });

  it("ignore les espaces autour", () => {
    expect(revisionDeployee({ HUMANIX_REVISION: `  ${SHA}\n` }).revision).toBe(
      SHA,
    );
  });

  it.each([
    ["variable absente", undefined],
    ["chaine vide", ""],
    ["espaces seuls", "   "],
    ["trop court pour etre un SHA", "f3b"],
    ["pas hexadecimal", "pas-un-sha-du-tout"],
    ["mi-hexadecimal", "f3b8a2dZZZZ"],
  ])("rend null : %s", (_titre, valeur) => {
    const r = revisionDeployee({ HUMANIX_REVISION: valeur });
    expect(r.revision).toBeNull();
    expect(r.courte).toBeNull();
  });

  // Le cas le plus vicieux : compose n'a pas substitue la variable, et la
  // chaine litterale arrive dans l'environnement du conteneur.
  it("rend null sur une substitution non resolue", () => {
    expect(
      revisionDeployee({ HUMANIX_REVISION: "${HUMANIX_REVISION}" }).revision,
    ).toBeNull();
  });

  it("borne la longueur, un environnement n'est pas de confiance", () => {
    const r = revisionDeployee({
      HUMANIX_BUILD_REF: "x".repeat(500),
    });
    expect(r.ref).toHaveLength(100);
  });
});

describe("ref de deploiement", () => {
  it("passe la branche ou le tag demande", () => {
    expect(revisionDeployee({ HUMANIX_BUILD_REF: "v1.6.0" }).ref).toBe(
      "v1.6.0",
    );
    expect(revisionDeployee({ HUMANIX_BUILD_REF: "main" }).ref).toBe("main");
  });

  it("est independant de la revision : l'un peut manquer sans l'autre", () => {
    const r = revisionDeployee({ HUMANIX_BUILD_REF: "main" });
    expect(r.ref).toBe("main");
    expect(r.revision).toBeNull();
  });
});
