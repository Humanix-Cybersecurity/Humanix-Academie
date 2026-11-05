// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de launchPhishingCampaign : le lancement d'une campagne depuis
// l'interface ou l'API.
//
// La base est un état en mémoire (lib/phishing/base-factice.ts) : on
// vérifie ce que chaque personne reçoit et ce qui reste en base, y compris
// quand le processus est coupé en route. La reprise d'un lancement coupé
// par le cron est testée avec la route, dans
// app/api/cron/phishing-launch/route.test.ts.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const { base } = await import("@/lib/phishing/base-factice");
  return { db: base.db };
});
vi.mock("@/lib/smtp/sender", async () => {
  const { boite } = await import("@/lib/phishing/base-factice");
  return { sendMailViaTenantSmtp: boite.envoyer };
});

import {
  launchPhishingCampaign,
  type LaunchOptions,
  type LaunchTarget,
} from "./launch";
import { base, boite } from "./base-factice";

const DEBUT = new Date("2026-11-05T10:00:00.000Z");
const JOUR = 24 * 3600 * 1000;
const SUJET_MICROSOFT =
  "[Action requise] Votre mot de passe Microsoft 365 expire bientôt";

const adresse = (id: string) => `${id}@exemple.test`;

const cible = (id: string): LaunchTarget => ({
  id,
  email: adresse(id),
  name: `Prénom-${id} Nom`,
});

function lancer(ids: string[], options: Partial<LaunchOptions> = {}) {
  return launchPhishingCampaign({
    tenantId: "t1",
    templateId: "FAKE_MICROSOFT",
    targets: ids.map(cible),
    ...options,
  });
}

/** La seule campagne créée par le test. */
function campagne() {
  expect(base.campagnes()).toHaveLength(1);
  return base.campagnes()[0];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(DEBUT);
  base.reinitialiser();
  boite.reinitialiser();
  base.ajouterTenant({ id: "t1", slug: "acme", name: "Acme" });
  process.env.NEXT_PUBLIC_APP_URL = "https://app.exemple.test";
  delete process.env.DEMO_MODE;
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.DEMO_MODE;
});

describe("envoi immédiat", () => {
  it("écrit une fois à chaque destinataire et date la campagne", async () => {
    const issue = await lancer(["u1", "u2", "u3"]);

    expect(issue).toMatchObject({
      ok: true,
      campaignId: campagne().id,
      targets: 3,
      sent: 3,
      failed: 0,
      simulated: false,
    });
    expect(boite.recus()).toEqual({
      [adresse("u1")]: 1,
      [adresse("u2")]: 1,
      [adresse("u3")]: 1,
    });
    expect(boite.envois[0]).toMatchObject({
      tenantId: "t1",
      to: adresse("u1"),
      subject: SUJET_MICROSOFT,
    });
    expect(campagne().sentAt).toEqual(DEBUT);
    expect(base.resultats().every((r) => r.mailDispatchedAt !== null)).toBe(
      true,
    );
  });

  it("met dans chaque message le lien et le pixel propres au destinataire", async () => {
    await lancer(["u1", "u2"]);

    for (const [i, id] of ["u1", "u2"].entries()) {
      const jeton = base.resultatDe(campagne().id, id).trackToken;
      expect(jeton).toMatch(/^phx_[a-f0-9]{32}$/);
      expect(boite.envois[i].html).toContain(
        `https://app.exemple.test/phishing/${jeton}`,
      );
      expect(boite.envois[i].html).toContain(
        `https://app.exemple.test/api/phishing/track/open/${jeton}`,
      );
      expect(boite.envois[i].html).toContain(`Prénom-${id}`);
    }
  });

  it("journalise le lancement", async () => {
    await lancer(["u1", "u2"], {
      targetingMode: "groups",
      targetingDetail: "groups:compta",
    });

    expect(base.evenements()).toEqual([
      {
        tenantId: "t1",
        type: "phishing_campaign_launched",
        payload: expect.objectContaining({
          campaignId: campagne().id,
          template: "FAKE_MICROSOFT",
          targets: 2,
          sent: 2,
          failed: 0,
          demo: false,
          targetingMode: "groups",
          targetingDetail: "groups:compta",
        }),
      },
    ]);
  });

  it("compte un envoi refusé sans arrêter les autres", async () => {
    boite.echouerPour(adresse("u2"));

    const issue = await lancer(["u1", "u2", "u3"]);

    expect(issue).toMatchObject({ ok: true, sent: 2, failed: 1 });
    expect(boite.recus()).toEqual({ [adresse("u1")]: 1, [adresse("u3")]: 1 });
    expect(campagne().sentAt).toEqual(DEBUT);
    expect(base.resultatDe(campagne().id, "u2").mailDispatchedAt).toBeNull();
  });

  it("laisse la campagne sans date quand aucun envoi n'aboutit", async () => {
    // C'est l'état que le cron phishing-launch reprend à l'heure suivante.
    for (const id of ["u1", "u2"]) boite.echouerPour(adresse(id));

    const issue = await lancer(["u1", "u2"]);

    expect(issue).toMatchObject({ ok: true, sent: 0, failed: 2 });
    expect(campagne().sentAt).toBeNull();
    expect(campagne().isActive).toBe(true);
  });

  it("s'arrête au premier envoi quand le SMTP du tenant est hors service", async () => {
    boite.echouerPour(adresse("u1"), "smtp_decrypt_failed");

    const issue = await lancer(["u1", "u2", "u3"]);

    expect(issue).toEqual({
      ok: false,
      error: "smtp_decrypt_failed",
      message: "simulé",
    });
    expect(boite.envois).toHaveLength(0);
    expect(campagne().isActive).toBe(false);
    expect(campagne().sentAt).toBeNull();
    // Les suivants n'ont même pas été tentés.
    expect(base.resultatDe(campagne().id, "u2").mailAttemptedAt).toBeNull();
  });
});

describe("création de la campagne", () => {
  it("crée la campagne et tous ses destinataires en une seule écriture", async () => {
    // Coupure juste après la première écriture : il ne doit jamais rester
    // une campagne sans destinataires, que le cron prendrait pour une
    // campagne programmée et enverrait à tout le tenant.
    base.couperApresEcriture(1);

    await expect(lancer(["u1", "u2", "u3"])).rejects.toThrow("processus coupé");

    expect(
      base
        .resultats(campagne().id)
        .map((r) => r.userId)
        .sort(),
    ).toEqual(["u1", "u2", "u3"]);
    expect(boite.envois).toHaveLength(0);
  });

  it("ne crée rien si un destinataire figure deux fois", async () => {
    await expect(lancer(["u1", "u2", "u1"])).rejects.toThrow("P2002");

    expect(base.campagnes()).toHaveLength(0);
    expect(base.resultats()).toHaveLength(0);
    expect(boite.envois).toHaveLength(0);
  });

  it("ne crée rien sans SMTP configuré", async () => {
    base.reinitialiser();
    base.ajouterTenant({ id: "t1", slug: "acme", name: "Acme" }, false);

    const issue = await lancer(["u1"]);

    expect(issue).toMatchObject({ ok: false, error: "smtp_not_configured" });
    expect(base.campagnes()).toHaveLength(0);
  });

  it("refuse un modèle inconnu ou une liste vide, sans rien créer", async () => {
    expect(await lancer(["u1"], { templateId: "INCONNU" })).toEqual({
      ok: false,
      error: "invalid_template",
    });
    expect(await lancer(["u1"], { templateBId: "inconnu-b" })).toEqual({
      ok: false,
      error: "invalid_template_b",
    });
    expect(await lancer([])).toEqual({ ok: false, error: "no_targets" });
    expect(base.campagnes()).toHaveLength(0);
  });
});

describe("test A/B", () => {
  it("envoie à chaque personne sa variante, et une seule", async () => {
    base.ajouterModele({
      tenantId: null,
      slug: "variante-b",
      name: "Variante B",
      emailSubject: "Sujet de la variante B",
      emailHtml: "<p>{firstName} : {trackingUrl}</p>",
      isActive: true,
    });

    const issue = await lancer(["u1", "u2", "u3", "u4"], {
      templateBId: "variante-b",
    });

    // La répartition est déterministe : elle dépend de l'identifiant.
    expect(issue).toMatchObject({ sent: 4, variantSplit: { a: 2, b: 2 } });
    const sujets = Object.fromEntries(
      boite.envois.map((e) => [e.to, e.subject]),
    );
    for (const r of base.resultats()) {
      expect(sujets[adresse(r.userId)]).toBe(
        r.variant === "B" ? "Sujet de la variante B" : SUJET_MICROSOFT,
      );
    }
    expect(boite.envois).toHaveLength(4);
    expect(campagne().variantBSlug).toBe("variante-b");
  });
});

describe("envoi étalé", () => {
  it("envoie le premier lot tout de suite et laisse les autres au cron drip", async () => {
    const issue = await lancer(["u1", "u2", "u3", "u4"], {
      dripStrategy: { dripDays: 2 },
    });

    // Deux lots, à un jour d'écart, remplis à tour de rôle.
    expect(issue).toMatchObject({ ok: true, sent: 2, dripPending: 2 });
    expect(boite.recus()).toEqual({ [adresse("u1")]: 1, [adresse("u3")]: 1 });
    const demain = new Date(DEBUT.getTime() + JOUR);
    for (const id of ["u2", "u4"]) {
      const r = base.resultatDe(campagne().id, id);
      expect(r.dripScheduledAt).toEqual(demain);
      expect(r.mailDispatchedAt).toBeNull();
      expect(r.mailAttemptedAt).toBeNull();
    }
    expect(campagne().sentAt).toEqual(DEBUT);
  });
});

describe("mode démo", () => {
  it("crée la campagne sans rien envoyer", async () => {
    process.env.DEMO_MODE = "true";

    const issue = await lancer(["u1", "u2"]);

    expect(issue).toMatchObject({ ok: true, sent: 2, simulated: true });
    expect(boite.envois).toHaveLength(0);
    expect(base.resultats(campagne().id)).toHaveLength(2);
  });
});
