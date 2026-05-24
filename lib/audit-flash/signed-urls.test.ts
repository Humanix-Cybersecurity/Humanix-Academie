// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests des URLs signees Audit Flash (pentest fix #4).
//
// On verifie :
//   - Une URL fraichement signee passe la verification
//   - Une URL avec sig invalide est rejetee (bad_signature)
//   - Une URL expiree est rejetee (expired)
//   - Une URL sans exp / sans sig est rejetee (missing_*)
//   - Timing-safe : meme signature longueur differente -> rejet propre
//   - Submission id different -> rejet

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  buildSignedPdfUrl,
  verifySignedPdfUrl,
  DEFAULT_TTL_SECONDS,
} from "./signed-urls";

const TEST_SUBMISSION_ID = "clxtest1234567890abcdef";
const ORIG_AUTH_SECRET = process.env.AUTH_SECRET;
const ORIG_URL_SECRET = process.env.AUDIT_FLASH_URL_SECRET;

beforeAll(() => {
  // Force un secret de signature pour les tests (independent du runtime)
  process.env.AUDIT_FLASH_URL_SECRET =
    "test-secret-for-signed-urls-min-32-characters-long";
});

afterAll(() => {
  if (ORIG_AUTH_SECRET === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = ORIG_AUTH_SECRET;
  if (ORIG_URL_SECRET === undefined) delete process.env.AUDIT_FLASH_URL_SECRET;
  else process.env.AUDIT_FLASH_URL_SECRET = ORIG_URL_SECRET;
});

describe("buildSignedPdfUrl + verifySignedPdfUrl", () => {
  it("produit une URL avec exp + sig", () => {
    const url = buildSignedPdfUrl(TEST_SUBMISSION_ID);
    expect(url).toContain(`/api/audit-flash/${TEST_SUBMISSION_ID}/pdf`);
    expect(url).toMatch(/exp=\d+/);
    expect(url).toMatch(/sig=[0-9a-f]{64}/); // SHA-256 hex
  });

  it("URL fraichement signee passe la verification", () => {
    const url = buildSignedPdfUrl(TEST_SUBMISSION_ID);
    const u = new URL(`https://test.example${url}`);
    const result = verifySignedPdfUrl(
      TEST_SUBMISSION_ID,
      u.searchParams.get("exp"),
      u.searchParams.get("sig"),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("URL avec signature trafiquee est rejetee", () => {
    const url = buildSignedPdfUrl(TEST_SUBMISSION_ID);
    const u = new URL(`https://test.example${url}`);
    const exp = u.searchParams.get("exp");
    const result = verifySignedPdfUrl(
      TEST_SUBMISSION_ID,
      exp,
      "0".repeat(64), // signature factice
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("bad_signature");
    }
  });

  it("URL avec submission id different est rejetee", () => {
    const url = buildSignedPdfUrl(TEST_SUBMISSION_ID);
    const u = new URL(`https://test.example${url}`);
    const result = verifySignedPdfUrl(
      "different_submission_id",
      u.searchParams.get("exp"),
      u.searchParams.get("sig"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("bad_signature");
    }
  });

  it("URL expiree est rejetee (timestamp dans le passe)", () => {
    // Forcer un exp dans le passe via le helper privately : on construit
    // manuellement avec un TTL negatif.
    const url = buildSignedPdfUrl(TEST_SUBMISSION_ID, -3600); // expire il y a 1h
    const u = new URL(`https://test.example${url}`);
    const result = verifySignedPdfUrl(
      TEST_SUBMISSION_ID,
      u.searchParams.get("exp"),
      u.searchParams.get("sig"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("expired");
    }
  });

  it("URL sans exp est rejetee", () => {
    const result = verifySignedPdfUrl(TEST_SUBMISSION_ID, null, "0".repeat(64));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_exp");
    }
  });

  it("URL sans sig est rejetee", () => {
    const exp = String(Math.floor(Date.now() / 1000) + 3600);
    const result = verifySignedPdfUrl(TEST_SUBMISSION_ID, exp, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_sig");
    }
  });

  it("URL avec sig de longueur differente est rejetee proprement", () => {
    const exp = String(Math.floor(Date.now() / 1000) + 3600);
    const result = verifySignedPdfUrl(TEST_SUBMISSION_ID, exp, "abcd");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("bad_signature");
    }
  });

  it("DEFAULT_TTL est 30 jours", () => {
    expect(DEFAULT_TTL_SECONDS).toBe(30 * 24 * 3600);
  });

  it("baseUrl optionnel produit une URL absolue", () => {
    const url = buildSignedPdfUrl(
      TEST_SUBMISSION_ID,
      DEFAULT_TTL_SECONDS,
      "https://humanix-academie.fr",
    );
    expect(url).toMatch(/^https:\/\/humanix-academie\.fr\/api\/audit-flash\//);
  });
});
