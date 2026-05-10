// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { buildSystemPrompt, HEX_GREETING } from "./system-prompt";

describe("buildSystemPrompt", () => {
  it("retourne au minimum la persona de base sans contexte", () => {
    const out = buildSystemPrompt();
    expect(out).toContain("Tu es **Hex**");
    expect(out).toContain("renard cyber");
    expect(out).toContain("cybersécurité");
    expect(out).toContain("français");
  });

  it("retourne le meme prompt pour un appel sans args et un objet vide", () => {
    expect(buildSystemPrompt()).toBe(buildSystemPrompt({}));
  });

  it("n'inclut JAMAIS le bloc 'Contexte' si rien n'est fourni", () => {
    const out = buildSystemPrompt();
    expect(out).not.toContain("# Contexte de cette conversation");
  });

  it("inclut le prenom quand userFirstName est fourni", () => {
    const out = buildSystemPrompt({ userFirstName: "Florian" });
    expect(out).toContain("# Contexte de cette conversation");
    expect(out).toContain("Florian");
  });

  it("traduit le role technique en label français", () => {
    expect(buildSystemPrompt({ userRole: "LEARNER" })).toContain("apprenant");
    expect(buildSystemPrompt({ userRole: "MANAGER" })).toContain(
      "manager d'équipe",
    );
    expect(buildSystemPrompt({ userRole: "RSSI" })).toContain("RSSI");
    expect(buildSystemPrompt({ userRole: "ADMIN" })).toContain("admin");
    expect(buildSystemPrompt({ userRole: "SUPERADMIN" })).toContain(
      "administrateur plateforme",
    );
  });

  it("inclut le label de plan humanise (pas l'id technique)", () => {
    const out = buildSystemPrompt({ userPlan: "pro" });
    // Plan label vient de lib/plans.ts -> "Pro" (capitalise)
    expect(out).toContain("Pro");
  });

  it("inclut currentRoute et currentModule quand fournis", () => {
    const out = buildSystemPrompt({
      currentRoute: "/apprendre/email-pro/01-cci-cco",
      currentModule: "email-pro/01-cci-cco",
    });
    expect(out).toContain("/apprendre/email-pro/01-cci-cco");
    expect(out).toContain("email-pro/01-cci-cco");
  });

  it("ne fuit AUCUN nom de famille — n'utilise que le premier mot du userFirstName", () => {
    // Pas un test du buildSystemPrompt directement (l'appelant doit faire
    // l'extraction), mais on verifie que si on passe juste "Florian" ca
    // marche sans concatener autre chose.
    const out = buildSystemPrompt({ userFirstName: "Florian" });
    expect(out).toContain("Florian");
    expect(out).not.toContain("Durano");
  });

  it("le system prompt impose le tutoiement", () => {
    const out = buildSystemPrompt();
    expect(out.toLowerCase()).toContain("tutoie");
  });

  it("le system prompt liste explicitement les sujets de refus", () => {
    const out = buildSystemPrompt();
    expect(out).toContain("Politique");
    expect(out).toContain("religion");
  });

  it("interdit explicitement la demande de PII (mot de passe, MFA, IBAN)", () => {
    const out = buildSystemPrompt();
    expect(out).toContain("mot de passe");
    expect(out).toContain("MFA");
    expect(out).toContain("bancaires");
  });

  it("rappelle que Hex ne doit JAMAIS inventer", () => {
    const out = buildSystemPrompt();
    // L'esprit "factuel + je ne sais pas plutot qu'halluciner"
    expect(out.toLowerCase()).toContain("inventer");
  });

  it("limite ses sujets a la cyber + l'usage de la plateforme", () => {
    const out = buildSystemPrompt();
    expect(out).toContain("cybersécurité");
    expect(out).toContain("Humanix Académie");
  });
});

describe("HEX_GREETING", () => {
  it("est un string non vide", () => {
    expect(typeof HEX_GREETING).toBe("string");
    expect(HEX_GREETING.length).toBeGreaterThan(20);
  });

  it("commence par un emoji renard pour identifier l'expediteur", () => {
    expect(HEX_GREETING).toContain("🦊");
  });

  it("est en français (verifie quelques marqueurs typographiques)", () => {
    expect(HEX_GREETING).toMatch(/[éèàçâêîôû]/);
  });
});
