// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  lireFormulaireCreationTenant,
  messageErreurCreationTenant,
  urlFormulaireCreationTenant,
} from "./creation-tenant";

function form(champs: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(champs)) fd.set(k, v);
  return fd;
}

describe("lireFormulaireCreationTenant", () => {
  it("lit un formulaire complet et normalise l'email", () => {
    const lu = lireFormulaireCreationTenant(
      form({
        org: "  Alsace Micro Services ",
        email: " Nicolas@AlsaceMicro.fr ",
        adminName: "Nicolas",
        plan: "enterprise",
        revendeur: "on",
        invitation: "on",
      }),
    );
    expect(lu).toEqual({
      ok: true,
      input: {
        organizationName: "Alsace Micro Services",
        email: "nicolas@alsacemicro.fr",
        adminName: "Nicolas",
        plan: "enterprise",
        revendeur: true,
        envoyerInvitation: true,
      },
    });
  });

  it("cases a cocher absentes = false, nom d'admin vide = null", () => {
    const lu = lireFormulaireCreationTenant(
      form({ org: "ACME", email: "a@b.fr", plan: "pro", adminName: "  " }),
    );
    expect(lu.ok).toBe(true);
    if (lu.ok) {
      expect(lu.input.revendeur).toBe(false);
      expect(lu.input.envoyerInvitation).toBe(false);
      expect(lu.input.adminName).toBeNull();
    }
  });

  it("refuse un nom trop court ou trop long", () => {
    expect(
      lireFormulaireCreationTenant(form({ org: "A", email: "a@b.fr", plan: "pro" })),
    ).toEqual({ ok: false, erreur: "nom_invalide" });
    expect(
      lireFormulaireCreationTenant(
        form({ org: "x".repeat(121), email: "a@b.fr", plan: "pro" }),
      ),
    ).toEqual({ ok: false, erreur: "nom_invalide" });
  });

  it("refuse un email sans domaine ou avec espace", () => {
    for (const email of ["nicolas", "nicolas@alsacemicro", "a b@c.fr", ""]) {
      expect(
        lireFormulaireCreationTenant(form({ org: "ACME", email, plan: "pro" })),
      ).toEqual({ ok: false, erreur: "email_invalide" });
    }
  });

  it("refuse starter et les plans inconnus : seuls pro et enterprise creent un tenant payant", () => {
    for (const plan of ["starter", "premium", "", "non-decide"]) {
      expect(
        lireFormulaireCreationTenant(form({ org: "ACME", email: "a@b.fr", plan })),
      ).toEqual({ ok: false, erreur: "plan_invalide" });
    }
  });
});

describe("messageErreurCreationTenant", () => {
  it("traduit les erreurs du provisioning et garde un message par defaut", () => {
    expect(messageErreurCreationTenant("email_already_on_other_tenant")).toMatch(
      /Communauté/,
    );
    expect(messageErreurCreationTenant("db_error")).toMatch(/Rien n'a été créé/);
    expect(messageErreurCreationTenant("inconnue")).toMatch(/inattendue/);
  });
});

describe("urlFormulaireCreationTenant", () => {
  it("ouvre le formulaire vide par defaut", () => {
    expect(urlFormulaireCreationTenant()).toBe("/superadmin/tenants?nouveau=1");
  });

  it("preremplit et encode les champs, omet les vides et les plans non creables", () => {
    const url = urlFormulaireCreationTenant({
      org: "Alsace Micro Services",
      email: "nicolas@alsacemicro.fr",
      plan: "non-decide",
      revendeur: true,
      adminName: "",
    });
    const qs = new URL(url, "https://x.test").searchParams;
    expect(qs.get("nouveau")).toBe("1");
    expect(qs.get("org")).toBe("Alsace Micro Services");
    expect(qs.get("email")).toBe("nicolas@alsacemicro.fr");
    expect(qs.get("revendeur")).toBe("1");
    expect(qs.has("nplan")).toBe(false);
    expect(qs.has("adminName")).toBe(false);
    expect(url).not.toContain(" ");
  });

  it("garde le plan creable et l'erreur au retour", () => {
    const qs = new URL(
      urlFormulaireCreationTenant({ plan: "enterprise", erreur: "db_error" }),
      "https://x.test",
    ).searchParams;
    expect(qs.get("nplan")).toBe("enterprise");
    expect(qs.get("erreur")).toBe("db_error");
  });
});
