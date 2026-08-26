// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de POST /api/payments/checkout/start -- l'inscription anonyme payante.
//
// C'EST LA SEULE ROUTE OU UN INCONNU DECLENCHE UN PRELEVEMENT
//
//   Pas de session, pas de tenant : rien que ce que le corps de la requete
//   affirme. Toute la protection tient donc dans la validation d'entree et
//   dans la limite par IP.
//
//   La propriete la plus couteuse a perdre est ailleurs : les coordonnees de
//   facturation sont validees AVANT d'ouvrir le paiement. Sans cet ordre, un
//   client peut payer sans qu'aucune facture conforme puisse etre emise --
//   exactement la situation dans laquelle la plateforme s'est trouvee le
//   2026-08-17, et dont on ne sort qu'en reclamant l'adresse apres coup.
//
//   `validerCoordonnees` reste REELLE : c'est elle qui decide.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockMollie, mockRateLimit, mockMemoriser, mockDevMode, mockHeaders } =
  vi.hoisted(() => ({
    mockMollie: {
      isMollieConfigured: vi.fn(),
      createCheckoutSession: vi.fn(),
    },
    mockRateLimit: vi.fn(),
    mockMemoriser: vi.fn(),
    mockDevMode: vi.fn(),
    mockHeaders: vi.fn(),
  }));

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));
vi.mock("@/lib/facturation/en-attente", () => ({
  memoriserCoordonnees: mockMemoriser,
}));
vi.mock("@/lib/dev-mode", () => ({ isDevMode: mockDevMode }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/lib/tenant-provisioning", () => ({
  provisionTenantWithAdmin: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ signIn: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/mollie", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mollie")>()),
  ...mockMollie,
}));

import { POST } from "./route";

/** Un corps complet et valide : chaque test n'en modifie qu'une pièce. */
function corpsValide(surcharge: Record<string, unknown> = {}) {
  return {
    plan: "pro",
    seats: 16,
    email: "contact@braver.test",
    organization: "Braver inc.",
    adresse: "12 rue des Lilas",
    codePostal: "75011",
    ville: "Paris",
    pays: "FR",
    ...surcharge,
  };
}

function requete(corps: unknown, brut?: string) {
  return new Request(
    "https://humanix-academie.fr/api/payments/checkout/start",
    {
      method: "POST",
      body: brut ?? JSON.stringify(corps),
      headers: { "content-type": "application/json" },
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMollie.isMollieConfigured.mockReturnValue(true);
  mockDevMode.mockReturnValue(false);
  mockRateLimit.mockReturnValue({ ok: true });
  mockMemoriser.mockResolvedValue(undefined);
  mockHeaders.mockResolvedValue(
    new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
  );
  mockMollie.createCheckoutSession.mockResolvedValue({
    hosted_payment: { payment_url: "https://mollie.test/pay/tr_1" },
    customer: { id: "cst_neuf" },
  });
});

describe("avant toute chose", () => {
  it("repond 503 sans Mollie et hors mode developpement", async () => {
    mockMollie.isMollieConfigured.mockReturnValue(false);
    const r = await POST(requete(corpsValide()));
    expect(r.status).toBe(503);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
  });

  // Anonyme : il n'y a pas de tenant sur lequel compter, donc c'est l'IP.
  it("limite par IP, et sur la PREMIERE de la chaine x-forwarded-for", async () => {
    await POST(requete(corpsValide()));
    expect(mockRateLimit).toHaveBeenCalledWith(
      "checkout-start:203.0.113.7",
      5,
      3_600_000,
    );
  });

  it("retombe sur « unknown » quand l'IP est absente", async () => {
    mockHeaders.mockResolvedValue(new Headers());
    await POST(requete(corpsValide()));
    expect(mockRateLimit.mock.calls[0][0]).toBe("checkout-start:unknown");
  });

  it("repond 429 au-dela de la limite, sans rien ouvrir", async () => {
    mockRateLimit.mockReturnValue({ ok: false });
    const r = await POST(requete(corpsValide()));
    expect(r.status).toBe(429);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("repond 400 sur un corps qui n'est pas du JSON", async () => {
    const r = await POST(requete(null, "ceci n'est pas du json"));
    expect(r.status).toBe(400);
  });
});

describe("ce qui est refuse a l'entree", () => {
  it.each([
    ["email absent", { email: "" }],
    ["email sans arobase", { email: "contact.braver.test" }],
    ["email demesure", { email: `${"a".repeat(250)}@b.test` }],
    ["organisation trop courte", { organization: "B" }],
    ["organisation demesuree", { organization: "B".repeat(121) }],
    ["plan inconnu", { plan: "platine" }],
  ])("refuse : %s", async (_titre, surcharge) => {
    const r = await POST(requete(corpsValide(surcharge)));
    expect(r.status).toBe(400);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("refuse enterprise et oriente vers le devis", async () => {
    const r = await POST(requete(corpsValide({ plan: "enterprise" })));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toContain("demande-abonnement");
  });

  it("refuse pro sans nombre de sieges plutot que d'en supposer un", async () => {
    const r = await POST(requete(corpsValide({ seats: null })));
    expect(r.status).toBe(400);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("starter est un forfait : un siege, quoi qu'on demande", async () => {
    await POST(requete(corpsValide({ plan: "starter", seats: 40 })));
    expect(mockMollie.createCheckoutSession.mock.calls[0][0].seats).toBe(1);
  });
});

describe("les coordonnees sont exigees AVANT le paiement", () => {
  // La propriete centrale de cette route. Un 400 ici est un client qui n'a pas
  // paye ; l'inverse est un client qui a paye sans facture possible.
  it.each([
    ["adresse", { adresse: "" }],
    ["code postal", { codePostal: "" }],
    ["ville", { ville: "" }],
  ])("refuse un paiement sans %s, et n'ouvre RIEN", async (_t, surcharge) => {
    const r = await POST(requete(corpsValide(surcharge)));
    expect(r.status).toBe(400);
    expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
    expect(mockMemoriser).not.toHaveBeenCalled();
  });

  // Le piege trouve en test : « Allemagne » tronque a deux lettres donne
  // « AL », l'Albanie, hors UE -- donc 0 % de TVA sur une vente taxable.
  it("refuse un pays qui n'est pas un code a deux lettres", async () => {
    const r = await POST(requete(corpsValide({ pays: "Allemagne" })));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toContain("deux lettres");
  });

  it.each(["XX1", "FR!!", "F"])(
    "refuse un numero de TVA manifestement mal forme (%s)",
    async (tvaIntra) => {
      const r = await POST(requete(corpsValide({ tvaIntra })));
      expect(r.status).toBe(400);
      expect(mockMollie.createCheckoutSession).not.toHaveBeenCalled();
    },
  );

  // La frontiere a ne pas deplacer : ce controle ne juge que la FORME. Un
  // numero bien forme mais inexistant PASSE ici, et c'est voulu -- seul VIES
  // peut le dire, et l'autoliquidation n'est accordee que sur son « valide ».
  // Refuser ici sur la forme donnerait une fausse assurance.
  it("laisse passer un numero bien forme mais faux : c'est a VIES de trancher", async () => {
    const r = await POST(requete(corpsValide({ tvaIntra: "BE0000000000" })));
    expect(r.status).toBe(200);
    expect(mockMemoriser.mock.calls[0][0].coordonnees.tvaIntra).toBe(
      "BE0000000000",
    );
  });

  it("prend le nom de l'organisation comme denomination a defaut", async () => {
    await POST(requete(corpsValide()));
    expect(mockMemoriser.mock.calls[0][0].coordonnees.raisonSociale).toBe(
      "Braver inc.",
    );
  });

  it("prefere la raison sociale explicite quand elle est donnee", async () => {
    await POST(requete(corpsValide({ raisonSociale: "BRAVER SAS" })));
    expect(mockMemoriser.mock.calls[0][0].coordonnees.raisonSociale).toBe(
      "BRAVER SAS",
    );
  });
});

describe("memorisation des coordonnees", () => {
  // Le customer Mollie est le SEUL lien jusqu'au webhook : a ce stade le
  // tenant n'existe pas encore.
  it("les rattache a l'identifiant du client Mollie", async () => {
    await POST(requete(corpsValide()));
    expect(mockMemoriser).toHaveBeenCalledTimes(1);
    expect(mockMemoriser.mock.calls[0][0].paymentCustomerId).toBe("cst_neuf");
  });

  it("se fait APRES l'ouverture du paiement, pas avant", async () => {
    const ordre: string[] = [];
    mockMollie.createCheckoutSession.mockImplementation(async () => {
      ordre.push("mollie");
      return {
        hosted_payment: { payment_url: "https://mollie.test/pay/tr_1" },
        customer: { id: "cst_neuf" },
      };
    });
    mockMemoriser.mockImplementation(async () => {
      ordre.push("memorisation");
    });
    await POST(requete(corpsValide()));
    expect(ordre).toEqual(["mollie", "memorisation"]);
  });

  // Best-effort assume : perdre les coordonnees est rattrapable depuis la
  // console, perdre le paiement ne l'est pas.
  it("un echec de memorisation NE BLOQUE PAS le paiement", async () => {
    mockMemoriser.mockRejectedValue(new Error("base HS"));
    const r = await POST(requete(corpsValide()));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      url: "https://mollie.test/pay/tr_1",
    });
  });
});

describe("ce que le webhook retrouvera", () => {
  it("marque l'inscription comme anonyme, faute de tenant existant", async () => {
    await POST(requete(corpsValide()));
    const arg = mockMollie.createCheckoutSession.mock.calls[0][0];
    expect(arg.tenantId).toBe("anonymous-inscription");
    expect(arg.metadata).toMatchObject({
      mode: "anonymous-inscription",
      organization: "Braver inc.",
      email: "contact@braver.test",
    });
  });

  it("normalise l'email en minuscules", async () => {
    await POST(requete(corpsValide({ email: "  Contact@Braver.TEST " })));
    expect(
      mockMollie.createCheckoutSession.mock.calls[0][0].customerEmail,
    ).toBe("contact@braver.test");
  });

  it("derive le webhook de la config serveur, jamais de l'hote demande", async () => {
    await POST(
      new Request("https://attaquant.test/api/payments/checkout/start", {
        method: "POST",
        body: JSON.stringify(corpsValide()),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(
      mockMollie.createCheckoutSession.mock.calls[0][0].webhookUrl,
    ).not.toContain("attaquant.test");
  });
});

describe("quand Mollie refuse", () => {
  it("repond 500 et ne memorise rien", async () => {
    mockMollie.createCheckoutSession.mockRejectedValue(
      new Error("Mollie indisponible"),
    );
    const r = await POST(requete(corpsValide()));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "Mollie indisponible" });
    expect(mockMemoriser).not.toHaveBeenCalled();
  });
});
