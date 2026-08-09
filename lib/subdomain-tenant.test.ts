// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests d'extraction subdomain -> tenant slug.
// CRITIQUE SECURITE : un bug ici = isolation tenant cassee
// (ex : un attaquant pousse "evil..humanix-academie.fr" et est resolu en
// tenant valide). Couverture exhaustive des edge cases.

import { describe, it, expect, afterEach } from "vitest";
import {
  extractTenantSlug,
  isReservedSubdomain,
  isValidTenantSlug,
  getAppBaseUrl,
} from "./subdomain-tenant";

const ROOT = "humanix-academie.fr";

describe("extractTenantSlug - cas nominaux", () => {
  it("extrait un slug simple", () => {
    expect(extractTenantSlug("acme.humanix-academie.fr", ROOT)).toBe("acme");
  });
  it("extrait un slug avec tirets", () => {
    expect(extractTenantSlug("ma-pme.humanix-academie.fr", ROOT)).toBe("ma-pme");
  });
  it("extrait un slug avec chiffres", () => {
    expect(extractTenantSlug("client42.humanix-academie.fr", ROOT)).toBe("client42");
  });
  it("normalise en lowercase", () => {
    expect(extractTenantSlug("ACME.humanix-academie.fr", ROOT)).toBe("acme");
  });
  it("strip le port", () => {
    expect(extractTenantSlug("acme.humanix-academie.fr:443", ROOT)).toBe("acme");
  });
});

describe("extractTenantSlug - cas pas de tenant", () => {
  it("naked domain -> null", () => {
    expect(extractTenantSlug("humanix-academie.fr", ROOT)).toBe(null);
  });
  it("host vide -> null", () => {
    expect(extractTenantSlug("", ROOT)).toBe(null);
    expect(extractTenantSlug(null, ROOT)).toBe(null);
    expect(extractTenantSlug(undefined, ROOT)).toBe(null);
  });
});

describe("extractTenantSlug - subdomains reserves", () => {
  it("www -> null", () => {
    expect(extractTenantSlug("www.humanix-academie.fr", ROOT)).toBe(null);
  });
  it("demo -> null", () => {
    expect(extractTenantSlug("demo.humanix-academie.fr", ROOT)).toBe(null);
  });
  it("api -> null", () => {
    expect(extractTenantSlug("api.humanix-academie.fr", ROOT)).toBe(null);
  });
  it("plausible/matomo/stats -> null", () => {
    expect(extractTenantSlug("plausible.humanix-academie.fr", ROOT)).toBe(null);
    expect(extractTenantSlug("matomo.humanix-academie.fr", ROOT)).toBe(null);
    expect(extractTenantSlug("stats.humanix-academie.fr", ROOT)).toBe(null);
  });
});

describe("extractTenantSlug - SECURITE (cas hostiles)", () => {
  it("autre racine -> null (pas notre domaine)", () => {
    expect(extractTenantSlug("acme.attacker.com", ROOT)).toBe(null);
  });
  it("racine partielle (substring attack) -> null", () => {
    // "humanix-academie.fr" est inclus dans "evilhumanix-academie.fr"
    // mais c'est PAS notre domaine.
    expect(extractTenantSlug("acmehumanix-academie.fr", ROOT)).toBe(null);
  });
  it("sous-sous-domaine -> null (un seul niveau)", () => {
    expect(extractTenantSlug("a.b.humanix-academie.fr", ROOT)).toBe(null);
  });
  it("slug avec tiret au debut -> null (regex strict)", () => {
    expect(extractTenantSlug("-acme.humanix-academie.fr", ROOT)).toBe(null);
  });
  it("slug avec tiret a la fin -> null", () => {
    expect(extractTenantSlug("acme-.humanix-academie.fr", ROOT)).toBe(null);
  });
  it("slug avec underscore -> null", () => {
    expect(extractTenantSlug("a_b.humanix-academie.fr", ROOT)).toBe(null);
  });
  it("slug trop court (1 char) -> null", () => {
    expect(extractTenantSlug("a.humanix-academie.fr", ROOT)).toBe(null);
  });
  it("slug trop long (>32 chars) -> null", () => {
    const long = "a".repeat(40);
    expect(extractTenantSlug(`${long}.humanix-academie.fr`, ROOT)).toBe(null);
  });
  it("ip address -> null", () => {
    expect(extractTenantSlug("192.168.1.1", ROOT)).toBe(null);
  });
  it("localhost -> null", () => {
    expect(extractTenantSlug("localhost:3000", ROOT)).toBe(null);
  });
  it("caracteres unicode -> null", () => {
    expect(extractTenantSlug("été.humanix-academie.fr", ROOT)).toBe(null);
  });
});

describe("isReservedSubdomain", () => {
  it("flag les subdomains de l'ecosysteme", () => {
    expect(isReservedSubdomain("www")).toBe(true);
    expect(isReservedSubdomain("api")).toBe(true);
    expect(isReservedSubdomain("demo")).toBe(true);
    expect(isReservedSubdomain("plausible")).toBe(true);
    expect(isReservedSubdomain("admin")).toBe(true);
  });
  it("ne flag pas les slugs business legitimes", () => {
    expect(isReservedSubdomain("acme")).toBe(false);
    expect(isReservedSubdomain("client42")).toBe(false);
  });
  it("case-insensitive", () => {
    expect(isReservedSubdomain("WWW")).toBe(true);
    expect(isReservedSubdomain("API")).toBe(true);
  });
});

describe("isValidTenantSlug", () => {
  it("valide les slugs business propres", () => {
    expect(isValidTenantSlug("acme")).toBe(true);
    expect(isValidTenantSlug("ma-pme")).toBe(true);
    expect(isValidTenantSlug("client42")).toBe(true);
  });
  it("rejette les reserves", () => {
    expect(isValidTenantSlug("www")).toBe(false);
    expect(isValidTenantSlug("api")).toBe(false);
  });
  it("rejette les formats invalides", () => {
    expect(isValidTenantSlug("a")).toBe(false);
    expect(isValidTenantSlug("-foo")).toBe(false);
    expect(isValidTenantSlug("foo-")).toBe(false);
    expect(isValidTenantSlug("a_b")).toBe(false);
    expect(isValidTenantSlug("été")).toBe(false);
  });
});

describe("getAppBaseUrl - securite (#739)", () => {
  const saved = {
    app: process.env.NEXT_PUBLIC_APP_URL,
    base: process.env.NEXT_PUBLIC_BASE_URL,
    auth: process.env.AUTH_URL,
  };
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = saved.app;
    process.env.NEXT_PUBLIC_BASE_URL = saved.base;
    process.env.AUTH_URL = saved.auth;
  });

  it("prefere NEXT_PUBLIC_APP_URL et retourne l'origine (sans chemin)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://academie.acme.fr/ignore";
    process.env.NEXT_PUBLIC_BASE_URL = "https://autre.fr";
    expect(getAppBaseUrl()).toBe("https://academie.acme.fr");
  });

  it("retombe sur NEXT_PUBLIC_BASE_URL puis AUTH_URL", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_BASE_URL = "https://base.acme.fr";
    expect(getAppBaseUrl()).toBe("https://base.acme.fr");
    delete process.env.NEXT_PUBLIC_BASE_URL;
    process.env.AUTH_URL = "https://auth.acme.fr";
    expect(getAppBaseUrl()).toBe("https://auth.acme.fr");
  });

  it("utilise le defaut sur config absente ou mal formee (jamais de host client)", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.AUTH_URL;
    expect(getAppBaseUrl()).toBe("https://humanix-academie.fr");
    process.env.NEXT_PUBLIC_APP_URL = "pas-une-url";
    expect(getAppBaseUrl()).toBe("https://humanix-academie.fr");
  });
});
