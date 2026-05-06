// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  buildOtpAuthUri,
} from "./totp";

describe("base32", () => {
  it("encodes and decodes a buffer roundtrip", () => {
    const input = Buffer.from("hello world");
    const encoded = base32Encode(input);
    expect(encoded).toMatch(/^[A-Z2-7]+$/);
    const decoded = base32Decode(encoded);
    expect(decoded.equals(input)).toBe(true);
  });

  it("handles spaces and lowercase in decode", () => {
    const out = base32Decode("nbswy 3dpeb3w64tmmq");
    expect(out.toString()).toBe("hello world");
  });
});

describe("TOTP", () => {
  it("generates a 32-char base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  it("verifies its own freshly generated code", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = generateTotpCode(secret, now);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
  });

  it("accepts code from previous window (clock skew)", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const past = now - 30_000;
    const codePast = generateTotpCode(secret, past);
    expect(verifyTotpCode(secret, codePast, now)).toBe(true);
  });

  it("rejects code from too far in past", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const farPast = now - 90_000;
    const oldCode = generateTotpCode(secret, farPast);
    expect(verifyTotpCode(secret, oldCode, now)).toBe(false);
  });

  it("rejects malformed input", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode(secret, "")).toBe(false);
    expect(verifyTotpCode(secret, "abcdef")).toBe(false);
    expect(verifyTotpCode(secret, "12345")).toBe(false);
    expect(verifyTotpCode(secret, "1234567")).toBe(false);
  });

  it("generates RFC 6238 reference values for known seed", () => {
    // RFC 6238 Appendix B reference vector (T0=0, key="12345678901234567890")
    // For T=59 (counter=1), expected SHA1 code = 287082
    const seed = base32Encode(Buffer.from("12345678901234567890"));
    const code = generateTotpCode(seed, 59 * 1000);
    expect(code).toBe("287082");
  });
});

describe("buildOtpAuthUri", () => {
  it("builds a valid otpauth URI", () => {
    const uri = buildOtpAuthUri({
      secret: "JBSWY3DPEHPK3PXP",
      accountName: "alice@acme.fr",
      issuer: "Humanix Academie",
    });
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=Humanix+Academie");
    expect(uri).toContain("algorithm=SHA1");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});
