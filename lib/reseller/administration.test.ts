// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { hoteAdministration, urlAdministration } from "./administration";

const ROOT = "humanix-academie.fr";

describe("hote d'administration d'un espace enfant", () => {
  it("prefere le sous-domaine de marque : c'est lui que l'espace connait", () => {
    expect(
      hoteAdministration(
        { slug: "acme-industries-3f9a", brandSubdomain: "acme" },
        ROOT,
      ),
    ).toBe("acme.humanix-academie.fr");
  });

  it("se rabat sur le slug, hote valide lui aussi", () => {
    expect(
      hoteAdministration(
        { slug: "agence-lyon-k2p9", brandSubdomain: null },
        ROOT,
      ),
    ).toBe("agence-lyon-k2p9.humanix-academie.fr");
  });
});

describe("url d'administration", () => {
  it("ouvre /admin en https par defaut", () => {
    expect(urlAdministration({ slug: "x", brandSubdomain: "acme" }, ROOT)).toBe(
      "https://acme.humanix-academie.fr/admin",
    );
  });

  it("accepte une page precise", () => {
    expect(
      urlAdministration(
        { slug: "x", brandSubdomain: null },
        ROOT,
        "/admin/utilisateurs",
      ),
    ).toBe("https://x.humanix-academie.fr/admin/utilisateurs");
  });
});
