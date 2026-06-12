// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  scanPii,
  containsPii,
  describePiiHits,
  validateIbanMod97,
  luhnCheck,
} from "./pii-filter";

describe("scanPii - emails", () => {
  it("detecte et masque un email simple", () => {
    const r = scanPii("Contacte-moi a alice@example.com pour le suivi");
    expect(r.hasPii).toBe(true);
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0].type).toBe("email");
    expect(r.redacted).toBe(
      "Contacte-moi a {redacted-email} pour le suivi",
    );
  });

  it("detecte plusieurs emails", () => {
    const r = scanPii("a@x.fr et b@y.com");
    expect(r.hits.filter((h) => h.type === "email")).toHaveLength(2);
  });

  it("preserve la structure du texte autour", () => {
    const r = scanPii("Mail: user.test+tag@domain.co.uk!");
    expect(r.redacted).toContain("{redacted-email}");
    expect(r.redacted).toContain("Mail:");
    expect(r.redacted).toContain("!");
  });

  it("ne match PAS un faux email malforme", () => {
    expect(scanPii("alice@").hasPii).toBe(false);
    expect(scanPii("@example.com").hasPii).toBe(false);
    expect(scanPii("just text").hasPii).toBe(false);
  });
});

describe("scanPii - IBAN", () => {
  it("detecte un IBAN FR valide (checksum mod 97)", () => {
    // IBAN FR valide d'exemple (test public, checksum correct)
    const r = scanPii("Mon IBAN : FR1420041010050500013M02606 merci");
    expect(r.hasPii).toBe(true);
    expect(r.hits.some((h) => h.type === "iban")).toBe(true);
    expect(r.redacted).toContain("{redacted-iban}");
  });

  it("ne match PAS un faux IBAN avec checksum invalide", () => {
    const r = scanPii("FR9999999999999999999999999");
    expect(r.hits.some((h) => h.type === "iban")).toBe(false);
  });

  it("supporte les espaces dans l'IBAN", () => {
    const r = scanPii("Voici : FR14 2004 1010 0505 0001 3M02 606");
    expect(r.hits.some((h) => h.type === "iban")).toBe(true);
  });
});

describe("scanPii - telephone FR", () => {
  it("detecte un numero mobile 06", () => {
    const r = scanPii("Tel: 0612345678");
    expect(r.hits.some((h) => h.type === "phone_fr")).toBe(true);
    expect(r.redacted).toContain("{redacted-phone}");
  });

  it("detecte un numero avec espaces", () => {
    const r = scanPii("Tel: 06 12 34 56 78");
    expect(r.hits.some((h) => h.type === "phone_fr")).toBe(true);
  });

  it("detecte un numero international +33", () => {
    const r = scanPii("Call +33612345678");
    expect(r.hits.some((h) => h.type === "phone_fr")).toBe(true);
  });

  it("detecte un fixe (01...05, 08, 09)", () => {
    const r = scanPii("Standard: 01 42 86 12 34");
    expect(r.hits.some((h) => h.type === "phone_fr")).toBe(true);
  });
});

describe("scanPii - carte bancaire (Luhn)", () => {
  it("detecte une CB valide (numero test Visa 4242 4242 4242 4242)", () => {
    const r = scanPii("CB: 4242 4242 4242 4242");
    expect(r.hits.some((h) => h.type === "credit_card")).toBe(true);
    expect(r.redacted).toContain("{redacted-card}");
  });

  it("ne match PAS une sequence Luhn-invalide", () => {
    const r = scanPii("Random: 1234 5678 9012 3456");
    expect(r.hits.some((h) => h.type === "credit_card")).toBe(false);
  });
});

describe("scanPii - SIREN / SIRET", () => {
  it("detecte un SIREN (9 chiffres)", () => {
    const r = scanPii("Mon SIREN 123456789 est public");
    expect(r.hits.some((h) => h.type === "siren")).toBe(true);
    expect(r.redacted).toContain("{redacted-siren}");
  });

  it("detecte un SIRET (14 chiffres) avant un SIREN", () => {
    const r = scanPii("SIRET 12345678901234 ici");
    expect(r.hits.some((h) => h.type === "siret")).toBe(true);
    expect(r.redacted).toContain("{redacted-siret}");
  });
});

describe("scanPii - NIR (securite sociale)", () => {
  it("detecte un NIR valide (15 chiffres, format strict)", () => {
    // NIR fictif valide structuralement (homme né en jan 1990, dept 75)
    const r = scanPii("NIR: 190017512345678");
    expect(r.hits.some((h) => h.type === "nir")).toBe(true);
    expect(r.redacted).toContain("{redacted-nir}");
  });

  it("ne match PAS une sequence de 15 chiffres avec mois invalide", () => {
    const r = scanPii("Random: 199913712345678"); // mois 13 invalide
    expect(r.hits.some((h) => h.type === "nir")).toBe(false);
  });
});

describe("scanPii - input degenere", () => {
  it("string vide -> aucun hit", () => {
    expect(scanPii("").hasPii).toBe(false);
  });
  it("texte sans PII -> aucun hit + redacted == input", () => {
    const r = scanPii("Bonjour Hex, comment reconnaitre un phishing ?");
    expect(r.hasPii).toBe(false);
    expect(r.redacted).toBe("Bonjour Hex, comment reconnaitre un phishing ?");
  });
});

describe("containsPii", () => {
  it("true si email present", () => {
    expect(containsPii("contact: alice@example.com")).toBe(true);
  });
  it("false sur texte propre", () => {
    expect(containsPii("hello world")).toBe(false);
  });
  it("false sur chaine vide / non-string", () => {
    expect(containsPii("")).toBe(false);
    expect(containsPii(null as unknown as string)).toBe(false);
  });
});

describe("describePiiHits", () => {
  it("'' si aucun hit", () => {
    expect(describePiiHits([])).toBe("");
  });

  it("singulier pour 1 occurrence", () => {
    const d = describePiiHits([
      { type: "email", match: "a@b", index: 0 },
    ]);
    expect(d).toBe("1 email");
  });

  it("pluriel pour multiple", () => {
    const d = describePiiHits([
      { type: "email", match: "a@b", index: 0 },
      { type: "email", match: "c@d", index: 5 },
    ]);
    expect(d).toBe("2 emails");
  });

  it("liste plusieurs types", () => {
    const d = describePiiHits([
      { type: "email", match: "a@b", index: 0 },
      { type: "phone_fr", match: "0612345678", index: 10 },
      { type: "iban", match: "FR...", index: 30 },
    ]);
    expect(d).toContain("email");
    expect(d).toContain("téléphone");
    expect(d).toContain("IBAN");
  });
});

describe("validateIbanMod97", () => {
  it("valide un IBAN FR de test correct", () => {
    expect(validateIbanMod97("FR1420041010050500013M02606")).toBe(true);
  });

  it("rejette un IBAN avec checksum incorrect", () => {
    expect(validateIbanMod97("FR9999999999999999999999999")).toBe(false);
  });

  it("rejette une chaine non-IBAN", () => {
    expect(validateIbanMod97("not an iban")).toBe(false);
    expect(validateIbanMod97("")).toBe(false);
    expect(validateIbanMod97("FR12")).toBe(false);
  });

  it("supporte les minuscules + les espaces", () => {
    expect(validateIbanMod97("fr14 2004 1010 0505 0001 3M02 606")).toBe(true);
  });
});

describe("luhnCheck", () => {
  it("valide les numeros de test Visa/Mastercard/Amex", () => {
    expect(luhnCheck("4242424242424242")).toBe(true); // Visa test
    expect(luhnCheck("5555555555554444")).toBe(true); // Mastercard test
    expect(luhnCheck("378282246310005")).toBe(true); // Amex test 15-dig
  });

  it("rejette les numeros random", () => {
    expect(luhnCheck("1234567890123456")).toBe(false);
    expect(luhnCheck("0000000000000000")).toBe(true); // edge case all zero
  });

  it("rejette les longueurs hors plage [13, 19]", () => {
    expect(luhnCheck("424242")).toBe(false);
    expect(luhnCheck("4242424242424242424242")).toBe(false);
  });

  it("rejette les non-chiffres", () => {
    expect(luhnCheck("abcdefghijklmnop")).toBe(false);
    expect(luhnCheck("4242-4242-4242-4242")).toBe(false); // pas pre-nettoye
  });
});
