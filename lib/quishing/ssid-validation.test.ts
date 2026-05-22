// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";
import {
  validateWifiSsid,
  ssidValidationErrorMessageFr,
  SSID_MAX_LENGTH,
  DEFAULT_WIFI_SSID,
} from "./ssid-validation";

describe("validateWifiSsid - cas nominaux", () => {
  it("accepte un SSID alphanumerique simple", () => {
    expect(validateWifiSsid("AcmeGuest")).toEqual({
      ok: true,
      value: "AcmeGuest",
    });
  });

  it("accepte des tirets, underscores et points", () => {
    expect(validateWifiSsid("Acme-Corp_2.4G")).toEqual({
      ok: true,
      value: "Acme-Corp_2.4G",
    });
  });

  it("accepte un nom avec espace", () => {
    expect(validateWifiSsid("Free Wifi Visiteurs")).toEqual({
      ok: true,
      value: "Free Wifi Visiteurs",
    });
  });

  it("trim les espaces en debut et fin", () => {
    expect(validateWifiSsid("  Acme  ")).toEqual({
      ok: true,
      value: "Acme",
    });
  });

  it("collapse les espaces multiples en un seul", () => {
    expect(validateWifiSsid("Acme    Guest")).toEqual({
      ok: true,
      value: "Acme Guest",
    });
  });

  it("accepte 32 chars exactement (limite IEEE 802.11)", () => {
    const max = "A".repeat(32);
    expect(validateWifiSsid(max)).toEqual({ ok: true, value: max });
  });

  it("accepte le SSID par defaut", () => {
    expect(validateWifiSsid(DEFAULT_WIFI_SSID)).toEqual({
      ok: true,
      value: DEFAULT_WIFI_SSID,
    });
  });
});

describe("validateWifiSsid - cas d'echec", () => {
  it("rejette les types non-string", () => {
    expect(validateWifiSsid(undefined)).toEqual({
      ok: false,
      reason: "wrong_type",
    });
    expect(validateWifiSsid(null)).toEqual({
      ok: false,
      reason: "wrong_type",
    });
    expect(validateWifiSsid(42)).toEqual({ ok: false, reason: "wrong_type" });
    expect(validateWifiSsid({})).toEqual({ ok: false, reason: "wrong_type" });
  });

  it("rejette la chaine vide", () => {
    expect(validateWifiSsid("")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejette une chaine de seulement espaces", () => {
    expect(validateWifiSsid("   ")).toEqual({ ok: false, reason: "empty" });
    expect(validateWifiSsid("\t\n\r")).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("rejette plus de 32 caracteres", () => {
    expect(validateWifiSsid("A".repeat(33))).toEqual({
      ok: false,
      reason: "too_long",
    });
  });
});

describe("validateWifiSsid - rejets d'injection", () => {
  it("rejette les balises HTML (XSS)", () => {
    expect(validateWifiSsid("<script>alert(1)</script>")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
    expect(validateWifiSsid("Acme<br>")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
  });

  it("rejette les quotes (HTML attribute injection)", () => {
    expect(validateWifiSsid('Acme"')).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
    expect(validateWifiSsid("Acme'")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
  });

  it("rejette le format QR Wi-Fi qui pourrait injecter des champs", () => {
    // Format WIFI:S:<ssid>;T:WPA;P:<pwd>;;
    // Si on accepte ";" ou ":" un attaquant pourrait briser le format
    // et injecter un champ T: ou P:
    expect(validateWifiSsid("Acme;T:WPA")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
    expect(validateWifiSsid("Acme:hidden")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
    expect(validateWifiSsid("Acme,Sub")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
    expect(validateWifiSsid("Acme\\back")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
  });

  it("rejette les esperluettes (HTML entity)", () => {
    expect(validateWifiSsid("Acme&amp;")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
  });

  it("rejette les chars de controle (newline, tab, etc.)", () => {
    expect(validateWifiSsid("Acme\nfake")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
    // \t devient espace via collapse, le test pertinent est sur des chars
    // de controle non whitespace
    expect(validateWifiSsid("Acme\x00null")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
  });

  it("rejette les homoglyphes Unicode (cyrillique qui ressemble a latin)", () => {
    // 'а' cyrillique (U+0430) vs 'a' latin (U+0061)
    expect(validateWifiSsid("Аcme")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
  });

  it("rejette les emojis et symboles", () => {
    expect(validateWifiSsid("Acme🇫🇷")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
    expect(validateWifiSsid("Acme@home")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
    expect(validateWifiSsid("Acme/Sub")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
  });

  it("rejette les caracteres accentues (defense ASCII strict)", () => {
    expect(validateWifiSsid("Café")).toEqual({
      ok: false,
      reason: "invalid_chars",
    });
  });
});

describe("ssidValidationErrorMessageFr", () => {
  it("retourne un message FR pour chaque code", () => {
    expect(ssidValidationErrorMessageFr("empty")).toContain("obligatoire");
    expect(ssidValidationErrorMessageFr("too_long")).toContain("32");
    expect(ssidValidationErrorMessageFr("invalid_chars")).toContain(
      "Caractères",
    );
    expect(ssidValidationErrorMessageFr("wrong_type")).toContain("invalide");
  });
});

describe("constantes exportees", () => {
  it("SSID_MAX_LENGTH = 32 (IEEE 802.11)", () => {
    expect(SSID_MAX_LENGTH).toBe(32);
  });

  it("DEFAULT_WIFI_SSID est non vide et valide", () => {
    expect(DEFAULT_WIFI_SSID.length).toBeGreaterThan(0);
    expect(validateWifiSsid(DEFAULT_WIFI_SSID).ok).toBe(true);
  });
});
