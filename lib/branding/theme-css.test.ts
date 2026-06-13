// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { buildTenantThemeCss } from "./theme-css";
import { DEFAULT_BRANDING, type EffectiveBranding } from "./tenant-branding";

const custom = (over: Partial<EffectiveBranding>): EffectiveBranding => ({
  ...DEFAULT_BRANDING,
  isCustom: true,
  sourceTenantId: "t1",
  primaryColor: "#112233",
  accentColor: "#aabbcc",
  ...over,
});

describe("buildTenantThemeCss", () => {
  it("vide si branding par défaut (non custom)", () => {
    expect(buildTenantThemeCss(DEFAULT_BRANDING)).toBe("");
  });

  it("génère des triplets RGB + hex pour couleurs valides", () => {
    const css = buildTenantThemeCss(
      custom({ primaryColor: "#0B3D91", accentColor: "#00A3A1" }),
    );
    expect(css).toMatch(/^:root\{.*\}$/);
    expect(css).toContain("--primary-500:11 61 145");
    expect(css).toContain("--accent-500:0 163 161");
    expect(css).toContain("--color-primary:#0B3D91");
    expect(css).toContain("--color-accent:#00A3A1");
  });

  it("dérive 600 (plus foncé) et 50 (teinte claire)", () => {
    const css = buildTenantThemeCss(
      custom({ primaryColor: "#646464", accentColor: "#646464" }),
    );
    // 0x64 = 100 ; 600 = 100*0.82 = 82 ; 50 = 100 + (255-100)*0.9 = 239.5 -> 240
    expect(css).toContain("--primary-600:82 82 82");
    expect(css).toContain("--primary-50:240 240 240");
  });

  it("vide si une couleur est invalide (anti-injection)", () => {
    expect(buildTenantThemeCss(custom({ primaryColor: "red" }))).toBe("");
    expect(
      buildTenantThemeCss(custom({ accentColor: "#fff; x:url(evil)" })),
    ).toBe("");
  });
});
