// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MODELE_STARTER_PAR_DEFAUT,
  PLAFOND_INSTANCE_PAR_DEFAUT,
  QUOTAS_HEX,
  messageQuota,
  modelePourPlan,
  plafondInstanceParJour,
  verifierQuotasHex,
} from "./quotas";

const envInitial = { ...process.env };

beforeEach(() => {
  delete process.env.DEMO_MODE;
  delete process.env.HEX_AI_PROVIDER;
  delete process.env.HEX_AI_MODEL_STARTER;
  delete process.env.HEX_DAILY_CAP;
  process.env.MISTRAL_API_KEY = "sk-test";
});
afterEach(() => {
  process.env = { ...envInitial };
});

describe("modelePourPlan", () => {
  it("sert small au palier gratuit, le modele configure aux plans payants", () => {
    expect(modelePourPlan("starter")).toBe(MODELE_STARTER_PAR_DEFAUT);
    expect(modelePourPlan("pro")).toBeUndefined();
    expect(modelePourPlan("enterprise")).toBeUndefined();
  });

  it("respecte HEX_AI_MODEL_STARTER", () => {
    process.env.HEX_AI_MODEL_STARTER = "ministral-8b-latest";
    expect(modelePourPlan("starter")).toBe("ministral-8b-latest");
  });

  it("ne force rien avec Ollama : un seul modele local", () => {
    process.env.HEX_AI_PROVIDER = "ollama";
    expect(modelePourPlan("starter")).toBeUndefined();
  });
});

describe("plafondInstanceParJour", () => {
  it("vaut 500 par defaut avec Mistral, illimite avec Ollama", () => {
    expect(plafondInstanceParJour()).toBe(PLAFOND_INSTANCE_PAR_DEFAUT);
    process.env.HEX_AI_PROVIDER = "ollama";
    expect(plafondInstanceParJour()).toBe(Number.POSITIVE_INFINITY);
  });

  it("respecte HEX_DAILY_CAP et ignore une valeur invalide", () => {
    process.env.HEX_DAILY_CAP = "1200";
    expect(plafondInstanceParJour()).toBe(1200);
    process.env.HEX_DAILY_CAP = "beaucoup";
    expect(plafondInstanceParJour()).toBe(PLAFOND_INSTANCE_PAR_DEFAUT);
  });
});

describe("verifierQuotasHex", () => {
  // Chaque test utilise ses propres identifiants : les compteurs de
  // lib/rate-limit.ts sont globaux au processus.
  const ids = () => ({ userId: randomUUID(), tenantId: randomUUID() });

  it("refuse sur l'heure au-dela du quota du plan", () => {
    const { userId, tenantId } = ids();
    const q = QUOTAS_HEX.starter;
    for (let i = 0; i < q.parHeure; i++) {
      expect(verifierQuotasHex({ userId, tenantId, plan: "starter" })).toEqual({
        ok: true,
      });
    }
    const refus = verifierQuotasHex({ userId, tenantId, plan: "starter" });
    expect(refus).toMatchObject({ ok: false, portee: "heure", limite: 12 });
    if (!refus.ok) expect(refus.retryAfter).toBeGreaterThan(3000);
  });

  it("refuse sur la journee de l'espace quand plusieurs personnes l'epuisent", () => {
    const tenantId = randomUUID();
    const q = QUOTAS_HEX.starter;
    // Dix personnes a douze messages : l'espace (120 par jour) est plein.
    for (let p = 0; p < q.espaceParJour / q.parHeure; p++) {
      const userId = randomUUID();
      for (let i = 0; i < q.parHeure; i++) {
        expect(
          verifierQuotasHex({ userId, tenantId, plan: "starter" }).ok,
        ).toBe(true);
      }
    }
    const refus = verifierQuotasHex({
      userId: randomUUID(),
      tenantId,
      plan: "starter",
    });
    expect(refus).toMatchObject({ ok: false, portee: "espace", limite: 120 });
  });

  it("refuse sur l'instance au-dela de HEX_DAILY_CAP, sans espace", () => {
    process.env.HEX_DAILY_CAP = "3";
    // Le compteur d'instance est partage : on l'epuise avec des personnes
    // distinctes d'un plan large pour ne pas buter sur l'heure avant.
    const verdicts = Array.from({ length: 4 }, () =>
      verifierQuotasHex({
        userId: randomUUID(),
        tenantId: null,
        plan: "enterprise",
      }),
    );
    // Les trois premiers passent ou butent deja sur l'instance si un autre
    // test l'a consommee : seule garantie, le dernier est refuse sur
    // l'instance.
    expect(verdicts[3]).toMatchObject({ ok: false, portee: "instance" });
  });

  it("un refus sur l'heure ne consomme pas le compteur de l'espace", () => {
    const tenantId = randomUUID();
    const userId = randomUUID();
    for (let i = 0; i < QUOTAS_HEX.starter.parHeure + 5; i++) {
      verifierQuotasHex({ userId, tenantId, plan: "starter" });
    }
    // L'espace a recu exactement 12 messages : une autre personne passe.
    expect(
      verifierQuotasHex({ userId: randomUUID(), tenantId, plan: "starter" }),
    ).toEqual({ ok: true });
  });
});

describe("messageQuota", () => {
  it("adapte le message a la portee, sans genre presuppose", () => {
    const base = { ok: false as const, limite: 40, retryAfter: 10 };
    expect(messageQuota({ ...base, portee: "heure" })).toContain("par heure");
    expect(messageQuota({ ...base, portee: "jour" })).toContain("par jour");
    expect(messageQuota({ ...base, portee: "espace" })).toContain(
      "Votre espace",
    );
    expect(messageQuota({ ...base, portee: "instance" })).toContain(
      "revient demain",
    );
  });
});
