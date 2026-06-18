// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { objectifsForProfil } from "./recyf";
import {
  buildRecyfPlan,
  isComplete,
  sanitizeAnswers,
  type RecyfAnswers,
  type RecyfAnswer,
} from "./recyf-scoring";
import { encodeRecyf, decodeRecyf } from "./recyf-encoding";
import type { RecyfProfil } from "./recyf";

function answerAll(profil: RecyfProfil, value: RecyfAnswer): RecyfAnswers {
  const a: RecyfAnswers = {};
  for (const o of objectifsForProfil(profil)) a[o.id] = value;
  return a;
}

describe("buildRecyfPlan", () => {
  it("EI : 15 objectifs evalues ; EE : 20", () => {
    expect(buildRecyfPlan(answerAll("EI", "oui"), "EI").objectifsCount).toBe(15);
    expect(buildRecyfPlan(answerAll("EE", "oui"), "EE").objectifsCount).toBe(20);
  });

  it("tout en place -> score 100, verdict robuste, aucune priorite", () => {
    const plan = buildRecyfPlan(answerAll("EE", "oui"), "EE");
    expect(plan.globalScore).toBe(100);
    expect(plan.verdict).toBe("robuste");
    expect(plan.priorityCount).toBe(0);
    expect(plan.solidCount).toBe(20);
  });

  it("rien en place -> score 0, verdict alerte, priorites presentes", () => {
    const plan = buildRecyfPlan(answerAll("EI", "non"), "EI");
    expect(plan.globalScore).toBe(0);
    expect(plan.verdict).toBe("alerte");
    expect(plan.priorityCount).toBe(15);
    expect(plan.items.some((i) => i.isPriority)).toBe(true);
  });

  it("en partie partout -> score 50, statut a renforcer", () => {
    const plan = buildRecyfPlan(answerAll("EI", "en_partie"), "EI");
    expect(plan.globalScore).toBe(50);
    expect(plan.items.every((i) => i.status === "a_renforcer")).toBe(true);
  });

  it("les priorites sont remontees en tete", () => {
    const plan = buildRecyfPlan(answerAll("EI", "non"), "EI");
    const firstNonPriority = plan.items.findIndex((i) => !i.isPriority);
    const lastPriority = plan.items.map((i) => i.isPriority).lastIndexOf(true);
    if (firstNonPriority !== -1) {
      expect(lastPriority).toBeLessThan(firstNonPriority);
    }
  });

  it("proportionnalite : une EI ne voit jamais d'objectif EE dans son plan", () => {
    const plan = buildRecyfPlan(answerAll("EI", "non"), "EI");
    expect(plan.items.every((i) => i.objectif.scope === "EI_EE")).toBe(true);
    expect(plan.items.every((i) => i.objectif.num <= 15)).toBe(true);
  });

  it("groupScores couvre les 4 thematiques pour une EE", () => {
    const plan = buildRecyfPlan(answerAll("EE", "oui"), "EE");
    expect(plan.groupScores.map((g) => g.groupe).sort()).toEqual(
      ["defense", "gouvernance", "protection", "resilience"].sort(),
    );
  });

  it("une reponse manquante compte comme non (0)", () => {
    const plan = buildRecyfPlan({}, "EI");
    expect(plan.globalScore).toBe(0);
  });
});

describe("isComplete / sanitizeAnswers", () => {
  it("isComplete vrai seulement si tous les objectifs applicables sont repondus", () => {
    expect(isComplete(answerAll("EI", "oui"), "EI")).toBe(true);
    const partial = answerAll("EI", "oui");
    delete partial["obj-1"];
    expect(isComplete(partial, "EI")).toBe(false);
  });

  it("sanitizeAnswers retire les ids inconnus et valeurs invalides", () => {
    const dirty = {
      "obj-1": "oui",
      "obj-999": "oui",
      "obj-2": "bidon",
    } as unknown as RecyfAnswers;
    const clean = sanitizeAnswers(dirty);
    expect(clean["obj-1"]).toBe("oui");
    expect(clean["obj-999"]).toBeUndefined();
    expect(clean["obj-2"]).toBeUndefined();
  });
});

describe("encodeRecyf / decodeRecyf (roundtrip stateless)", () => {
  it("conserve profil, reponses et nom d'organisation", () => {
    const answers = answerAll("EE", "en_partie");
    answers["obj-1"] = "oui";
    answers["obj-20"] = "non";
    const enc = encodeRecyf("EE", answers, "Acme SAS");
    const dec = decodeRecyf(enc);
    expect(dec).not.toBeNull();
    expect(dec!.profil).toBe("EE");
    expect(dec!.companyName).toBe("Acme SAS");
    expect(dec!.answers["obj-1"]).toBe("oui");
    expect(dec!.answers["obj-20"]).toBe("non");
    expect(dec!.answers["obj-10"]).toBe("en_partie");
  });

  it("decode renvoie null sur une charge invalide", () => {
    expect(decodeRecyf("!!!pas-du-base64-valide!!!")).toBeNull();
  });

  it("le plan reconstruit a partir de l'URL est identique", () => {
    const answers = answerAll("EI", "oui");
    answers["obj-4"] = "non";
    const enc = encodeRecyf("EI", answers, null);
    const dec = decodeRecyf(enc)!;
    const plan = buildRecyfPlan(dec.answers, dec.profil);
    const obj4 = plan.items.find((i) => i.objectif.num === 4)!;
    expect(obj4.score).toBe(0);
    expect(obj4.isPriority).toBe(true);
  });
});
