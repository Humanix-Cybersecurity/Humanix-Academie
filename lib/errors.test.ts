// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  getErrorMessage,
  getErrorName,
  getErrorCode,
  isAbortError,
} from "./errors";

describe("getErrorMessage", () => {
  it("extrait .message d'une Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });
  it("retourne la string telle quelle", () => {
    expect(getErrorMessage("plain string")).toBe("plain string");
  });
  it("stringify les valeurs non-Error", () => {
    expect(getErrorMessage(42)).toBe("42");
    expect(getErrorMessage(null)).toBe("null");
    expect(getErrorMessage(undefined)).toBe("undefined");
    expect(getErrorMessage({ foo: "bar" })).toBe("[object Object]");
  });
  it("tronque a maxLength", () => {
    const long = "a".repeat(1000);
    expect(getErrorMessage(new Error(long), 100)).toHaveLength(100);
  });
});

describe("getErrorName", () => {
  it("retourne le name d'une Error standard", () => {
    expect(getErrorName(new Error("x"))).toBe("Error");
    expect(getErrorName(new TypeError("x"))).toBe("TypeError");
  });
  it("null pour les non-Error", () => {
    expect(getErrorName("string")).toBeNull();
    expect(getErrorName(42)).toBeNull();
    expect(getErrorName(null)).toBeNull();
  });
});

describe("getErrorCode", () => {
  it("extrait .code string", () => {
    expect(getErrorCode({ code: "ENOENT" })).toBe("ENOENT");
  });
  it("extrait .code number", () => {
    expect(getErrorCode({ code: 42 })).toBe("42");
  });
  it("null si .code absent", () => {
    expect(getErrorCode(new Error("x"))).toBeNull();
    expect(getErrorCode("string")).toBeNull();
    expect(getErrorCode(null)).toBeNull();
  });
  it("null si .code n'est pas string/number", () => {
    expect(getErrorCode({ code: { nested: true } })).toBeNull();
  });
});

describe("isAbortError", () => {
  it("true pour une vraie AbortError", () => {
    const ctrl = new AbortController();
    ctrl.abort();
    let caught: unknown;
    try {
      throw ctrl.signal.reason;
    } catch (e) {
      caught = e;
    }
    // AbortSignal.reason est un DOMException name "AbortError" depuis Node 18
    expect(isAbortError(caught)).toBe(true);
  });
  it("false pour une autre erreur", () => {
    expect(isAbortError(new TypeError("x"))).toBe(false);
    expect(isAbortError("string")).toBe(false);
  });
});
