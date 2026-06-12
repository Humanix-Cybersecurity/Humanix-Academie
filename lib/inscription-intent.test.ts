// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des helpers signature/parsing du cookie d'intention inscription.
// Les variantes IO (set/read/clear via next/headers cookies()) ne sont pas
// testables sans mock du store Next.js - on couvre la partie pure (build +
// parse) qui est la surface critique pour la sécurité (signature HMAC).

import { describe, it, expect, beforeAll } from "vitest";
import { __test__ } from "./inscription-intent";

const { buildCookieValue, parseCookieValue } = __test__;

beforeAll(() => {
  // AUTH_SECRET requis pour signer/vérifier. On en pose un long et stable
  // pour les tests, sans toucher à un éventuel .env de dev.
  process.env.AUTH_SECRET =
    "test-secret-suffisamment-long-pour-passer-le-check-de-16-chars";
});

describe("buildCookieValue", () => {
  it("retourne une string formattée v1.<intent>.<timestamp>.<sig>", () => {
    const v = buildCookieValue("community-learner");
    const parts = v.split(".");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    expect(parts[1]).toBe("community-learner");
    expect(Number(parts[2])).toBeGreaterThan(0);
    expect(parts[3].length).toBeGreaterThan(20); // signature base64url ≈ 43 chars
  });

  it("la signature est différente entre 2 appels (timestamp varie)", () => {
    const v1 = buildCookieValue("community-learner");
    // Force un nouveau timestamp en avançant le mock... ici on se contente
    // d'un sleep synchrone trivial.
    const start = Date.now();
    while (Date.now() < start + 2) {
      /* busy wait 2ms */
    }
    const v2 = buildCookieValue("community-learner");
    expect(v1).not.toBe(v2);
  });
});

describe("parseCookieValue", () => {
  it("accepte un cookie fraîchement signé", () => {
    const v = buildCookieValue("community-learner");
    const parsed = parseCookieValue(v);
    expect(parsed).not.toBeNull();
    expect(parsed!.intent).toBe("community-learner");
  });

  it("rejette un cookie avec signature trafiquée", () => {
    const v = buildCookieValue("community-learner");
    const parts = v.split(".");
    // Remplace le premier char par un char base64url GARANTI different.
    // Le précédent test échangeait parts[3][0] et parts[3][1] : no-op si
    // les 2 chars étaient identiques (proba ~1/64 en HMAC-SHA256 base64url
    // = test flaky qui finissait par échouer un jour). On choisit un
    // remplacement déterministe : "A" si différent, sinon "B".
    const sig = parts[3];
    const replacement = sig[0] === "A" ? "B" : "A";
    const bad = `${parts[0]}.${parts[1]}.${parts[2]}.${replacement}${sig.slice(1)}`;
    expect(parseCookieValue(bad)).toBeNull();
  });

  it("rejette un cookie avec intent inconnu (pas dans la whitelist)", () => {
    const v = buildCookieValue("community-learner");
    const parts = v.split(".");
    // On reforge un cookie avec intent malveillant ET signature valide pour
    // CET intent (= attaquant qui aurait deviné le secret). Sans le secret
    // c'est impossible. Mais on test : whitelist >>> signature.
    const fake = `v1.platform-admin.${parts[2]}.${parts[3]}`;
    expect(parseCookieValue(fake)).toBeNull();
  });

  it("rejette une version de cookie inconnue (futur upgrade)", () => {
    const v = buildCookieValue("community-learner");
    const parts = v.split(".");
    const future = `v999.${parts[1]}.${parts[2]}.${parts[3]}`;
    expect(parseCookieValue(future)).toBeNull();
  });

  it("rejette une string mal formée (parts ≠ 4)", () => {
    expect(parseCookieValue("")).toBeNull();
    expect(parseCookieValue("a.b.c")).toBeNull();
    expect(parseCookieValue("a.b.c.d.e")).toBeNull();
  });

  it("rejette un timestamp non numérique", () => {
    const v = buildCookieValue("community-learner");
    const parts = v.split(".");
    const bad = `${parts[0]}.${parts[1]}.notANumber.${parts[3]}`;
    expect(parseCookieValue(bad)).toBeNull();
  });

  it("le résultat parse contient le timestamp d'émission (issuedAtMs)", () => {
    const before = Date.now();
    const v = buildCookieValue("community-learner");
    const after = Date.now();
    const parsed = parseCookieValue(v);
    expect(parsed).not.toBeNull();
    expect(parsed!.issuedAtMs).toBeGreaterThanOrEqual(before);
    expect(parsed!.issuedAtMs).toBeLessThanOrEqual(after);
  });
});
