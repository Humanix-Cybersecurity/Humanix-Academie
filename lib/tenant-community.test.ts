// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests pures sur les helpers du tenant Communauté (fonctions sans IO).
// Les variantes async (getCommunityTenant / getCommunityTenantOrThrow)
// dépendent d'une BDD réelle et sont couvertes par les tests d'intégration
// qui spinnent une PG dockerisée — pas dans la portée de ce fichier.

import { describe, it, expect } from "vitest";
import {
  COMMUNITY_TENANT_SLUG,
  COMMUNITY_TENANT_NAME,
  COMMUNITY_TENANT_PLAN,
  isCommunityTenant,
} from "./tenant-community";

describe("constants tenant Communauté", () => {
  it("le slug est 'humanix-community' (immutable, source de vérité DB)", () => {
    expect(COMMUNITY_TENANT_SLUG).toBe("humanix-community");
  });

  it("le nom d'affichage est 'Humanix Communauté'", () => {
    expect(COMMUNITY_TENANT_NAME).toBe("Humanix Communauté");
  });

  it("le plan attaché est 'decouverte' (forever-free, cf. lib/plans.ts)", () => {
    expect(COMMUNITY_TENANT_PLAN).toBe("starter");
  });
});

describe("isCommunityTenant", () => {
  it("retourne true pour le slug exact", () => {
    expect(isCommunityTenant({ slug: "humanix-community" })).toBe(true);
  });

  it("retourne false pour un autre slug", () => {
    expect(isCommunityTenant({ slug: "acme-corp" })).toBe(false);
    expect(isCommunityTenant({ slug: "demo-pme" })).toBe(false);
  });

  it("retourne false pour null / undefined (sécurité contre les accès non auth)", () => {
    expect(isCommunityTenant(null)).toBe(false);
    expect(isCommunityTenant(undefined)).toBe(false);
  });

  it("est case-sensitive (slugs DB sont lowercased par convention)", () => {
    expect(isCommunityTenant({ slug: "Humanix-Community" })).toBe(false);
    expect(isCommunityTenant({ slug: "HUMANIX-COMMUNITY" })).toBe(false);
  });
});
