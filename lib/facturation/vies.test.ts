// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la verification VIES.
//
// Ce qu'ils protegent : la distinction entre « ce numero n'existe pas » et
// « le service n'a pas pu repondre ». VIES renvoie `isValid: false` dans les
// deux cas -- les confondre ferait refacturer avec TVA un client parfaitement
// en regle, sans que personne ne comprenne pourquoi.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifierTvaIntra } from "./vies";

const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function reponse(corps: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(corps),
  } as Response);
}

describe("verifierTvaIntra", () => {
  it("numero valide : statut valide, avec la denomination", async () => {
    vi.mocked(globalThis.fetch).mockReturnValue(
      reponse({
        isValid: true,
        userError: "VALID",
        name: "SAS Humanix-Cybersecurity",
        address: "16 RUE JOSEPH LOIRET\n30100 ALES",
      }),
    );
    const r = await verifierTvaIntra("FR 80 103 901 799");
    expect(r.statut).toBe("valide");
    if (r.statut === "valide") {
      expect(r.nom).toBe("SAS Humanix-Cybersecurity");
      expect(r.adresse).toContain("ALES");
    }
  });

  it("l'espace et les separateurs sont normalises avant l'appel", async () => {
    vi.mocked(globalThis.fetch).mockReturnValue(
      reponse({ isValid: true, userError: "VALID" }),
    );
    await verifierTvaIntra("fr-80.103 901 799");
    const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(url).toContain("/ms/FR/vat/80103901799");
  });

  it("numero inexistant : statut INVALIDE", async () => {
    vi.mocked(globalThis.fetch).mockReturnValue(
      reponse({ isValid: false, userError: "INVALID" }),
    );
    expect((await verifierTvaIntra("BE0000000000")).statut).toBe("invalide");
  });

  // LE TEST CENTRAL. Constate en vrai le 2026-08-20 : le meme numero valide a
  // d'abord repondu MS_MAX_CONCURRENT_REQ avec isValid=false.
  it("service occupe : statut INCONNU, surtout pas invalide", async () => {
    vi.mocked(globalThis.fetch).mockReturnValue(
      reponse({ isValid: false, userError: "MS_MAX_CONCURRENT_REQ" }),
    );
    const r = await verifierTvaIntra("FR80103901799");
    expect(r.statut).toBe("inconnu");
    expect(r.statut === "inconnu" && r.cause).toBe("MS_MAX_CONCURRENT_REQ");
  });

  it("tous les codes d'indisponibilite donnent INCONNU", async () => {
    for (const code of [
      "GLOBAL_MAX_CONCURRENT_REQ",
      "MS_UNAVAILABLE",
      "SERVICE_UNAVAILABLE",
      "TIMEOUT",
      "SERVER_BUSY",
      "IP_BLOCKED",
    ]) {
      vi.mocked(globalThis.fetch).mockReturnValue(
        reponse({ isValid: false, userError: code }),
      );
      expect((await verifierTvaIntra("FR80103901799")).statut).toBe("inconnu");
    }
  });

  it("un code d'erreur jamais vu donne INCONNU, pas invalide", async () => {
    vi.mocked(globalThis.fetch).mockReturnValue(
      reponse({ isValid: false, userError: "UN_TRUC_NOUVEAU" }),
    );
    expect((await verifierTvaIntra("FR80103901799")).statut).toBe("inconnu");
  });

  it("reseau coupe : INCONNU, jamais invalide", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("ECONNREFUSED"));
    expect((await verifierTvaIntra("FR80103901799")).statut).toBe("inconnu");
  });

  it("HTTP 500 : INCONNU", async () => {
    vi.mocked(globalThis.fetch).mockReturnValue(reponse({}, false, 500));
    expect((await verifierTvaIntra("FR80103901799")).statut).toBe("inconnu");
  });

  it("corps illisible : INCONNU", async () => {
    vi.mocked(globalThis.fetch).mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("pas du json")),
      } as unknown as Response),
    );
    expect((await verifierTvaIntra("FR80103901799")).statut).toBe("inconnu");
  });

  it("« --- » de VIES n'est pas une denomination", async () => {
    vi.mocked(globalThis.fetch).mockReturnValue(
      reponse({
        isValid: true,
        userError: "VALID",
        name: "---",
        address: "---",
      }),
    );
    const r = await verifierTvaIntra("FR80103901799");
    expect(r.statut === "valide" && r.nom).toBeNull();
    expect(r.statut === "valide" && r.adresse).toBeNull();
  });

  it("numero syntaxiquement impossible : invalide, sans appel reseau", async () => {
    expect((await verifierTvaIntra("X")).statut).toBe("invalide");
    expect((await verifierTvaIntra("")).statut).toBe("invalide");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
