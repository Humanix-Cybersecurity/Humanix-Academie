// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { certificateName } from "./pdf-certificate";

describe("certificateName — nom affiche sur le certificat", () => {
  it("utilise prenom + nom quand LES DEUX sont renseignes", () => {
    expect(
      certificateName({
        firstName: "Marie",
        lastName: "Durand",
        name: "mimi92",
        email: "marie@example.com",
      }),
    ).toBe("Marie Durand");
  });

  it("retombe sur le pseudo si seul le prenom est renseigne", () => {
    expect(
      certificateName({
        firstName: "Marie",
        lastName: null,
        name: "mimi92",
        email: "marie@example.com",
      }),
    ).toBe("mimi92");
  });

  it("retombe sur le pseudo si seul le nom est renseigne", () => {
    expect(
      certificateName({
        firstName: "",
        lastName: "Durand",
        name: "mimi92",
        email: "marie@example.com",
      }),
    ).toBe("mimi92");
  });

  it("retombe sur le pseudo si prenom/nom absents (comportement historique)", () => {
    expect(
      certificateName({ name: "mimi92", email: "marie@example.com" }),
    ).toBe("mimi92");
  });

  it("trim les espaces parasites de prenom/nom", () => {
    expect(
      certificateName({ firstName: "  Jean  ", lastName: "  Bon  " }),
    ).toBe("Jean Bon");
  });

  it("ignore un prenom/nom vide (espaces seulement) -> pseudo", () => {
    expect(
      certificateName({ firstName: "   ", lastName: "   ", name: "ghost" }),
    ).toBe("ghost");
  });

  it("ultime filet : partie locale de l'email si ni nom ni pseudo", () => {
    expect(certificateName({ email: "john.doe@corp.fr" })).toBe("john.doe");
  });

  it("chaine vide si vraiment rien", () => {
    expect(certificateName({})).toBe("");
  });
});
