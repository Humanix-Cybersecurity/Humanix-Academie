// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { isValidHexColor, DEFAULT_BRANDING } from "./tenant-branding";

describe("isValidHexColor", () => {
  it("accepte #RRGGBB et #RGB", () => {
    expect(isValidHexColor("#0B3D91")).toBe(true);
    expect(isValidHexColor("#abc")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
  });
  it("refuse les valeurs invalides (anti-injection CSS)", () => {
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#12")).toBe(false);
    expect(isValidHexColor("#1234")).toBe(false);
    expect(isValidHexColor("0B3D91")).toBe(false);
    expect(isValidHexColor("#0B3D91; background:url(evil)")).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("DEFAULT_BRANDING", () => {
  it("est le branding Humanix, non custom", () => {
    expect(DEFAULT_BRANDING.isCustom).toBe(false);
    expect(DEFAULT_BRANDING.hidePoweredBy).toBe(false);
    expect(DEFAULT_BRANDING.brandName).toBe("Humanix Académie");
    expect(isValidHexColor(DEFAULT_BRANDING.primaryColor)).toBe(true);
    expect(isValidHexColor(DEFAULT_BRANDING.accentColor)).toBe(true);
    expect(DEFAULT_BRANDING.sourceTenantId).toBeNull();
  });
});
