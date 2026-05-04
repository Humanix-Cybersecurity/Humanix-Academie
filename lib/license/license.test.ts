// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalJson, decodeLicense, encodeLicense } from "./format";
import { generateKeyPair, signLicense } from "./sign";
import { resetLicenseCache, verifyLicenseCached } from "./cache";
import { describeLicenseError, verifyLicenseString } from "./verify";
import type { LicensePayload } from "./types";

// Mock Prisma au niveau de ce fichier (le setup global throw a l'acces).
// On garde la mock-fonction en haut pour que les tests puissent l'override.
const mockTenantFindUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    tenant: {
      findUnique: (...args: unknown[]) => mockTenantFindUnique(...args),
    },
  },
}));

const ORIGINAL_ENV = { ...process.env };

// On genere une paire de cles fraiche pour les tests, plutot que de
// hardcoder une cle de demo qui pourrait fuiter de mauvaises pratiques.
let TEST_KEYS: { publicKeyPem: string; privateKeyPem: string };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  TEST_KEYS = generateKeyPair();
  process.env.HUMANIX_LICENSE_PUBLIC_KEY = TEST_KEYS.publicKeyPem;
  resetLicenseCache();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetLicenseCache();
});

function makePayload(overrides: Partial<LicensePayload> = {}): LicensePayload {
  return {
    v: 1,
    licenseId: "lic_test_001",
    issuedTo: "Acme Corp",
    domain: null,
    plan: "pro",
    maxSeats: 100,
    featuresOverride: [],
    issuedAt: "2026-01-01T00:00:00Z",
    expiresAt: "2027-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("canonicalJson", () => {
  it("trie les clefs alphabetiquement", () => {
    const json = canonicalJson(makePayload());
    const keys = Object.keys(JSON.parse(json));
    expect(keys).toEqual([...keys].sort());
  });

  it("produit la meme sortie pour 2 objets equivalents", () => {
    const a = makePayload();
    const b = makePayload();
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });
});

describe("encode/decode round-trip", () => {
  it("re-decode un encode sans perte", () => {
    const payload = makePayload();
    const fakeSig = "abc123";
    const str = encodeLicense(payload, fakeSig);
    const decoded = decodeLicense(str);
    expect(decoded).not.toBeNull();
    expect(decoded!.licenseId).toBe(payload.licenseId);
    expect(decoded!.signature).toBe(fakeSig);
  });

  it("retourne null pour une string vide", () => {
    expect(decodeLicense("")).toBeNull();
  });

  it("retourne null pour un format sans prefixe", () => {
    expect(decodeLicense("foo.bar.baz")).toBeNull();
  });

  it("retourne null pour un payload non-JSON", () => {
    expect(decodeLicense("HUMANIX-LICENSE-v1.notb64.sig")).toBeNull();
  });

  it("retourne null pour un payload incomplet", () => {
    const incomplete = Buffer.from('{"v":1}', "utf-8")
      .toString("base64url");
    expect(decodeLicense(`HUMANIX-LICENSE-v1.${incomplete}.sig`)).toBeNull();
  });
});

describe("verifyLicenseString — happy path", () => {
  it("valide une licence fraichement signee", () => {
    const payload = makePayload();
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(str, undefined, new Date("2026-06-01T12:00:00Z"));
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.license.licenseId).toBe(payload.licenseId);
      expect(r.license.plan).toBe("pro");
    }
  });

  it("declenche un warning si expire dans <= 14 jours", () => {
    const payload = makePayload({
      expiresAt: "2026-06-10T00:00:00Z",
    });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(str, undefined, new Date("2026-06-01T00:00:00Z"));
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.warning).toMatch(/9 jour/);
    }
  });

  it("ne declenche pas de warning si expire > 14 jours", () => {
    const payload = makePayload();
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(str, undefined, new Date("2026-06-01T00:00:00Z"));
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.warning).toBeUndefined();
    }
  });
});

describe("verifyLicenseString — rejets", () => {
  it("rejette une licence vide", () => {
    const r = verifyLicenseString("");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("missing");
  });

  it("rejette une licence malformee", () => {
    const r = verifyLicenseString("bonjour");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("malformed");
  });

  it("rejette une signature falsifiee", () => {
    const payload = makePayload();
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    // On corrompt le dernier caractere de la signature
    const corrupted = str.slice(0, -1) + (str.slice(-1) === "A" ? "B" : "A");
    const r = verifyLicenseString(corrupted, undefined, new Date("2026-06-01"));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("bad_signature");
  });

  it("rejette un payload modifie (signature ne correspond plus)", () => {
    const payload = makePayload({ plan: "trial" });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    // Decode, modifie, re-encode (sans re-signer) → la signature devient invalide
    const decoded = decodeLicense(str)!;
    const tampered = encodeLicense(
      { ...decoded, plan: "premium" } as LicensePayload,
      decoded.signature,
    );
    const r = verifyLicenseString(tampered, undefined, new Date("2026-06-01"));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("bad_signature");
  });

  it("rejette une licence expiree", () => {
    const payload = makePayload({
      issuedAt: "2025-01-01T00:00:00Z",
      expiresAt: "2025-12-31T00:00:00Z",
    });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(str, undefined, new Date("2026-06-01"));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("expired");
  });

  it("rejette une licence pas encore valide", () => {
    const payload = makePayload({
      issuedAt: "2027-01-01T00:00:00Z",
      expiresAt: "2028-01-01T00:00:00Z",
    });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(str, undefined, new Date("2026-06-01"));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("not_yet_valid");
  });

  it("rejette une licence emise pour un autre domaine", () => {
    const payload = makePayload({ domain: "academie.acme.fr" });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(
      str,
      "evil.attaquant.fr",
      new Date("2026-06-01"),
    );
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("domain_mismatch");
  });

  it("autorise un sous-domaine du domaine licence", () => {
    const payload = makePayload({ domain: "humanix.fr" });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(
      str,
      "academie.humanix.fr",
      new Date("2026-06-01"),
    );
    expect(r.valid).toBe(true);
  });

  it("ignore le cluster-lock si licence sans domain", () => {
    const payload = makePayload({ domain: null });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(
      str,
      "n-importe-quel-domaine.com",
      new Date("2026-06-01"),
    );
    expect(r.valid).toBe(true);
  });

  it("rejette si la cle publique est le placeholder par defaut", () => {
    delete process.env.HUMANIX_LICENSE_PUBLIC_KEY;
    // verify.ts utilisera PUBLIC_KEY_PEM qui contient REPLACE_BEFORE_PROD
    const payload = makePayload();
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r = verifyLicenseString(str, undefined, new Date("2026-06-01"));
    expect(r.valid).toBe(false);
    // bad_signature car la cle publique placeholder ne valide rien
    if (!r.valid) expect(r.error).toBe("bad_signature");
  });

  it("rejette une licence signee avec une autre cle privee", () => {
    const otherKeys = generateKeyPair();
    const payload = makePayload();
    const str = signLicense(payload, otherKeys.privateKeyPem);
    // verify utilise TEST_KEYS.publicKeyPem (notre paire)
    const r = verifyLicenseString(str, undefined, new Date("2026-06-01"));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("bad_signature");
  });
});

describe("verifyLicenseCached", () => {
  it("met en cache le resultat valide", () => {
    const payload = makePayload();
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    const r1 = verifyLicenseCached(str);
    const r2 = verifyLicenseCached(str);
    expect(r1.valid).toBe(true);
    expect(r2.valid).toBe(true);
    expect(r1).toBe(r2); // meme reference = cache hit
  });

  it("change le resultat si la string change", () => {
    const p1 = makePayload({ licenseId: "lic_001" });
    const p2 = makePayload({ licenseId: "lic_002" });
    const s1 = signLicense(p1, TEST_KEYS.privateKeyPem);
    const s2 = signLicense(p2, TEST_KEYS.privateKeyPem);
    const r1 = verifyLicenseCached(s1);
    const r2 = verifyLicenseCached(s2);
    expect(r1).not.toBe(r2);
  });

  it("retourne missing si pas de string", () => {
    const r = verifyLicenseCached(undefined);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBe("missing");
  });
});

describe("describeLicenseError", () => {
  it("retourne un message FR pour chaque type d'erreur", () => {
    expect(describeLicenseError("missing")).toMatch(/Aucune licence/);
    expect(describeLicenseError("expired")).toMatch(/expiree/);
    expect(describeLicenseError("bad_signature")).toMatch(/Signature/);
    expect(describeLicenseError("malformed")).toMatch(/invalide/);
    expect(describeLicenseError("not_yet_valid")).toMatch(/futur/);
    expect(describeLicenseError("domain_mismatch")).toMatch(/domaine/);
    expect(describeLicenseError("unsupported_version")).toMatch(/Version/);
  });
});

describe("getEffectivePlan — combinaison licence + DB", () => {
  it("priorise le plan licence quand la licence est valide", async () => {
    // Import dynamique pour reset module entre tests (la licence est lue
    // au moment de l'appel via process.env, pas a l'import).
    const { getEffectivePlan } = await import("./index");
    const payload = makePayload({ plan: "premium" });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    process.env.HUMANIX_LICENSE_KEY = str;
    resetLicenseCache();

    // mockTenantFindUnique ne devrait JAMAIS etre appele car la licence
    // valide court-circuite la requete DB.
    mockTenantFindUnique.mockResolvedValue({ plan: "trial" });

    const plan = await getEffectivePlan("any-tenant-id");
    expect(plan).toBe("premium");
    // Verification : la DB n'est pas touchee quand la licence est valide
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
  });

  it("fallback DB quand pas de licence configuree", async () => {
    const { getEffectivePlan } = await import("./index");
    delete process.env.HUMANIX_LICENSE_KEY;
    resetLicenseCache();
    mockTenantFindUnique.mockResolvedValue({ plan: "essentielle" });

    const plan = await getEffectivePlan("acme-tenant");
    expect(plan).toBe("essentielle");
    expect(mockTenantFindUnique).toHaveBeenCalledWith({
      where: { id: "acme-tenant" },
      select: { plan: true },
    });
  });

  it("fallback DB quand licence expiree", async () => {
    const { getEffectivePlan } = await import("./index");
    const payload = makePayload({
      issuedAt: "2025-01-01T00:00:00Z",
      expiresAt: "2025-12-31T00:00:00Z",
      plan: "premium",
    });
    const str = signLicense(payload, TEST_KEYS.privateKeyPem);
    process.env.HUMANIX_LICENSE_KEY = str;
    resetLicenseCache();
    mockTenantFindUnique.mockResolvedValue({ plan: "decouverte" });

    const plan = await getEffectivePlan("acme-tenant");
    // Licence expiree → fallback DB → "decouverte"
    expect(plan).toBe("decouverte");
  });

  it('retourne "trial" si tenant introuvable en DB', async () => {
    const { getEffectivePlan } = await import("./index");
    delete process.env.HUMANIX_LICENSE_KEY;
    resetLicenseCache();
    mockTenantFindUnique.mockResolvedValue(null);

    const plan = await getEffectivePlan("ghost-tenant");
    expect(plan).toBe("trial");
  });
});
