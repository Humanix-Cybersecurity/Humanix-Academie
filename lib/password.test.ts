// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  generateBackupCodes,
  consumeBackupCode,
} from "./password";

describe("password hashing", () => {
  it("hashes and verifies a password", () => {
    const stored = hashPassword("CorrectHorse-Battery1!");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("CorrectHorse-Battery1!", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("rejects malformed stored hash", () => {
    expect(verifyPassword("anything", "")).toBe(false);
    expect(verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(verifyPassword("anything", "scrypt$32768$8$1$xx")).toBe(false);
  });

  it("normalizes unicode", () => {
    // NFC and NFD forms of the same char must verify identical.
    const nfc = "café-Cyber!";
    const nfd = "café-Cyber!";
    const stored = hashPassword(nfc);
    expect(verifyPassword(nfd, stored)).toBe(true);
  });
});

describe("validatePasswordPolicy", () => {
  it("accepts strong passwords", () => {
    expect(validatePasswordPolicy("MotDePasse123!").ok).toBe(true);
  });

  it("rejects too short", () => {
    expect(validatePasswordPolicy("Aa1!").ok).toBe(false);
  });

  it("rejects too few classes", () => {
    expect(validatePasswordPolicy("alllowercaseletters").ok).toBe(false);
  });

  it("rejects too long", () => {
    expect(validatePasswordPolicy("A1!a".repeat(60)).ok).toBe(false);
  });
});

describe("backup codes", () => {
  it("generates 10 codes by default", () => {
    const { plain, hashedJson } = generateBackupCodes();
    expect(plain).toHaveLength(10);
    plain.forEach((c) => expect(c).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/));
    const hashes = JSON.parse(hashedJson);
    expect(hashes).toHaveLength(10);
  });

  it("consumes a valid code and returns updated list", () => {
    const { plain, hashedJson } = generateBackupCodes(3);
    const result = consumeBackupCode(plain[1], hashedJson);
    expect(result).not.toBeNull();
    const updated = JSON.parse(result!.newHashedJson);
    expect(updated).toHaveLength(2);
    // The same code cannot be re-used
    expect(consumeBackupCode(plain[1], result!.newHashedJson)).toBeNull();
  });

  it("rejects invalid code", () => {
    const { hashedJson } = generateBackupCodes(3);
    expect(consumeBackupCode("ZZZZZ-ZZZZZ", hashedJson)).toBeNull();
  });
});
