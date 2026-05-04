import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectPII,
  generateVishingScript,
  isMistralEnabled,
} from "./script-generator";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.MISTRAL_API_KEY;
  process.env.DEMO_MODE = "true";
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe("detectPII", () => {
  it("rejette un email", () => {
    expect(detectPII("contact@dupont.fr")).toMatch(/Donn/);
  });

  it("rejette un SIRET (14 chiffres)", () => {
    expect(detectPII("SIRET 12345678901234")).toMatch(/Donn/);
  });

  it("rejette un SIREN (9 chiffres)", () => {
    expect(detectPII("Notre SIREN est 123456789 visible")).toMatch(/Donn/);
  });

  it("rejette un numero de telephone FR", () => {
    expect(detectPII("appelle au 01 23 45 67 89")).toMatch(/Donn/);
    expect(detectPII("06.12.34.56.78 c'est urgent")).toMatch(/Donn/);
    expect(detectPII("0033123456789")).toMatch(/Donn/); // contient 01 23 45 67 89
  });

  it("accepte un texte propre sans PII", () => {
    expect(detectPII("Je veux simuler un faux support IT")).toBeNull();
    expect(detectPII("Cible : service compta, scenario fraude au RIB")).toBeNull();
  });
});

describe("isMistralEnabled", () => {
  it("retourne false si la cle API n'est pas configuree", () => {
    delete process.env.MISTRAL_API_KEY;
    expect(isMistralEnabled()).toBe(false);
  });

  it("retourne true si la cle API est configuree", () => {
    process.env.MISTRAL_API_KEY = "key_live_xxx";
    expect(isMistralEnabled()).toBe(true);
  });
});

describe("generateVishingScript — mode demo (sans cle Mistral)", () => {
  it("rejette un contexte contenant un email", async () => {
    await expect(
      generateVishingScript({
        template: "fake-support-it",
        service: "Compta",
        context: "Le PDG s'appelle Jean Dupont jean@dupont.example",
        difficulty: "medium",
      }),
    ).rejects.toThrow(/Donn/);
  });

  it("retourne un fixture coherent pour fake-support-it", async () => {
    const s = await generateVishingScript({
      template: "fake-support-it",
      service: "Compta",
      difficulty: "medium",
    });
    expect(s.openingLine.length).toBeGreaterThan(20);
    expect(s.attackerPersona).toMatch(/technicien IT/i);
    expect(s.spoofedCallerId).toMatch(/^\d{2} \d{2} \d{2} \d{2} \d{2}$/);
    expect(s.redFlags.length).toBeGreaterThanOrEqual(3);
    expect(s.ttsScript).toContain(s.openingLine);
  });

  it("retourne un fixture pour fake-banque avec OTP red flag", async () => {
    const s = await generateVishingScript({
      template: "fake-banque",
      service: "Direction",
      difficulty: "hard",
    });
    const allFlags = s.redFlags.join(" ").toLowerCase();
    expect(allFlags).toMatch(/otp|code/);
  });

  it("retourne un fixture pour fake-direction (fraude president)", async () => {
    const s = await generateVishingScript({
      template: "fake-direction",
      service: "Compta",
      difficulty: "hard",
    });
    expect(s.body.toLowerCase()).toMatch(/virement|operation/);
    expect(s.attackerPersona.toLowerCase()).toContain("direction");
  });

  it("retourne un fixture pour fake-fournisseur", async () => {
    const s = await generateVishingScript({
      template: "fake-fournisseur",
      service: "Compta",
      difficulty: "easy",
    });
    expect(s.body.toLowerCase()).toMatch(/rib|banque/);
  });

  it("retourne un fixture pour fake-cnil", async () => {
    const s = await generateVishingScript({
      template: "fake-cnil",
      service: "DPO",
      difficulty: "medium",
    });
    expect(s.attackerPersona.toLowerCase()).toMatch(/cnil|anssi/);
  });

  it("retourne un fixture placeholder pour template free", async () => {
    const s = await generateVishingScript({
      template: "free",
      service: "Compta",
      difficulty: "easy",
    });
    expect(s.redFlags.some((f) => f.includes("MISTRAL_API_KEY"))).toBe(true);
  });

  it("le ttsScript demarre par openingLine", async () => {
    const s = await generateVishingScript({
      template: "fake-support-it",
      service: "Compta",
      difficulty: "medium",
    });
    expect(s.ttsScript.startsWith(s.openingLine)).toBe(true);
  });

  it("le ttsScript se termine par callToAction", async () => {
    const s = await generateVishingScript({
      template: "fake-banque",
      service: "Compta",
      difficulty: "easy",
    });
    expect(s.ttsScript.endsWith(s.callToAction)).toBe(true);
  });
});

describe("generateVishingScript — appel Mistral mocke", () => {
  beforeEach(() => {
    process.env.MISTRAL_API_KEY = "key_live_xxx";
    delete process.env.DEMO_MODE;
  });

  it("appelle l'API Mistral et parse la reponse JSON", async () => {
    const fakeResp: Partial<VishingResponseShape> = {
      openingLine: "Bonjour, ici la DSI",
      body: "On a besoin de votre mot de passe.",
      callToAction: "Maintenant svp.",
      attackerPersona: "Faux DSI",
      spoofedCallerId: "0123456789",
      redFlags: ["Demande de mot de passe au telephone"],
      ttsScript: "Bonjour, ici la DSI. On a besoin de votre mot de passe. Maintenant svp.",
    };

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(fakeResp) } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const s = await generateVishingScript({
      template: "fake-support-it",
      service: "IT",
      difficulty: "medium",
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(s.openingLine).toBe("Bonjour, ici la DSI");
    expect(s.spoofedCallerId).toBe("01 23 45 67 89");
    expect(s.redFlags).toEqual(["Demande de mot de passe au telephone"]);
  });

  it("rejette une reponse Mistral non-JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "definitely not json" } }],
          }),
          { status: 200 },
        ),
      ),
    );
    await expect(
      generateVishingScript({
        template: "fake-support-it",
        service: "IT",
        difficulty: "medium",
      }),
    ).rejects.toThrow("mistral_invalid_json");
  });

  it("rejette une erreur HTTP Mistral", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate limit", { status: 429 })),
    );
    await expect(
      generateVishingScript({
        template: "fake-support-it",
        service: "IT",
        difficulty: "medium",
      }),
    ).rejects.toThrow(/mistral_http_429/);
  });

  it("sanitize un spoofedCallerId trop court", async () => {
    const fakeResp = {
      openingLine: "Bonjour",
      body: "...",
      callToAction: "...",
      attackerPersona: "X",
      spoofedCallerId: "abc",
      redFlags: [],
      ttsScript: "Bonjour",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(fakeResp) } }],
          }),
          { status: 200 },
        ),
      ),
    );
    const s = await generateVishingScript({
      template: "fake-support-it",
      service: "IT",
      difficulty: "medium",
    });
    expect(s.spoofedCallerId).toBe("01 00 00 00 00");
  });

  it("tronque les champs trop longs", async () => {
    const huge = "x".repeat(10_000);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    openingLine: huge,
                    body: huge,
                    callToAction: huge,
                    attackerPersona: huge,
                    spoofedCallerId: "0123456789",
                    redFlags: Array(20).fill(huge),
                    ttsScript: huge,
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const s = await generateVishingScript({
      template: "fake-support-it",
      service: "IT",
      difficulty: "medium",
    });
    expect(s.openingLine.length).toBeLessThanOrEqual(500);
    expect(s.body.length).toBeLessThanOrEqual(2000);
    expect(s.callToAction.length).toBeLessThanOrEqual(500);
    expect(s.attackerPersona.length).toBeLessThanOrEqual(200);
    expect(s.ttsScript.length).toBeLessThanOrEqual(4000);
    expect(s.redFlags.length).toBeLessThanOrEqual(8);
  });
});

// Type local pour les tests, evite d'avoir a exporter VishingScript
// dans le module public ou de tirer le type depuis le module.
type VishingResponseShape = {
  openingLine: string;
  body: string;
  callToAction: string;
  attackerPersona: string;
  spoofedCallerId: string;
  redFlags: string[];
  ttsScript: string;
};
